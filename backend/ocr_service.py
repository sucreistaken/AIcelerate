import sys
import os
import cv2
import pytesseract
import numpy as np
from PIL import Image
import tempfile
import hashlib
from collections import Counter
from pdf2image import convert_from_path

# --- CONFIGURATION ---
DEBUG_LOG = []
def log(msg):
    DEBUG_LOG.append(msg)
    print(msg)

TESSERACT_PATHS = [
    r'D:\Softwares\Python\Tesseract-OCR\tesseract.exe',
    r'C:\Program Files\Tesseract-OCR\tesseract.exe',
    r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
    r'C:\Users\kadir\AppData\Local\Tesseract-OCR\tesseract.exe', 
    r'D:\Tesseract-OCR\tesseract.exe'
]

tesseract_cmd = None
log(f"[*] Checking Tesseract paths...")
for path in TESSERACT_PATHS:
    exists = os.path.exists(path)
    log(f"    - '{path}': {'FOUND' if exists else 'not found'}")
    if exists:
        tesseract_cmd = path
        break

if tesseract_cmd:
    pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
    log(f"[*] Selected Tesseract: {tesseract_cmd}")
else:
    log("[!] Error: Tesseract not found in list. Relying on PATH or default.")

class LectureOCR:
    def __init__(self):
        pass

    def preprocess_image(self, image_path):
        # 1. Read the image
        img = cv2.imread(image_path)
        if img is None:
            raise FileNotFoundError(f"Could not open image: {image_path}")

        # 2. Convert to Grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # 3. Apply Denoising
        gray = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)

        # 4. Apply Thresholding (Otsu)
        gray = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)[1]

        return gray

    def extract_text_from_image(self, image_path, config=r'--oem 3 --psm 6'):
        try:
            processed_img = self.preprocess_image(image_path)
            text = pytesseract.image_to_string(processed_img, config=config)
            return text.strip()
        except Exception as e:
            return f"[Error page]: {str(e)}"

    def clean_text(self, text):
        import re
        
        # 1. NOISE REMOVAL (Headers/Footers)
        # Filters specific to "Operating System Concepts" book and common slide noise
        noise_patterns = [
            r"Silberschatz, Galvin and Gagne.*2018",
            r"Operating System Concepts.*Edition",
            r"^\s*\d+\.\d+\s*$",        # e.g., "6.2"
            r"^\s*\d+\s*$",             # e.g., "15" (just page number)
            r"^\s*Slide \d+\s*$"        # e.g., "Slide 11"
        ]
        
        cleaned_lines = []
        for line in text.splitlines():
            is_noise = False
            for pattern in noise_patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    is_noise = True
                    break
            if not is_noise:
                cleaned_lines.append(line)
        
        text = "\n".join(cleaned_lines)

        # 2. BULLET POINT FIX (Merge orphan bullets)
        # Matches: Line containing only a bullet char (•, , -, *) followed by newline
        # Replaces with: Bullet + space + next line
        # Note: We do this iteratively or via regex multiline substitution
        # Pattern: (Start of line)(Bullet char)(Optional space)(End of line)\n(Next line content)
        bullet_pattern = r"(?m)^\s*([•\-\*])\s*\n\s*(.+)"
        text = re.sub(bullet_pattern, r"\1 \2", text)

        # 3. WHITESPACE NORMALIZATION
        # Collapse 3 or more newlines into 2
        text = re.sub(r'\n{3,}', '\n\n', text)

        return text

    def extract_text_with_structure(self, page):
        """
        Extracts text while preserving structure (H1, H2) based on font sizes.
        """
        blocks = page.get_text("dict")["blocks"]
        text_blocks = []
        font_sizes = []

        # 1. Collect all text spans and their font sizes
        for b in blocks:
            if "lines" in b:
                for line in b["lines"]:
                    for span in line["spans"]:
                        text = span["text"].strip()
                        if text:
                            size = span["size"]
                            font_sizes.append(size)
                            text_blocks.append({"text": text, "size": size})

        if not text_blocks:
            return ""

        # 2. Determine "Body Text" size (Mode)
        # Round sizes to nearest integer to group similar sizes
        rounded_sizes = [round(s) for s in font_sizes]
        if rounded_sizes:
            mode_size = max(set(rounded_sizes), key=rounded_sizes.count)
        else:
            mode_size = 12 # Fallback

        # 3. Reconstruct text with Markdown headers
        formatted_text = []
        for block in text_blocks:
            size = block["size"]
            text = block["text"]
            
            # Simple Heuristic:
            # > 4pt larger than mode = H1 (#)
            # > 2pt larger than mode = H2 (##)
            # significantly smaller = Small text (quoted?) -> keeping simple for now
            
            if size > mode_size + 4:
                formatted_text.append(f"# {text}")
            elif size > mode_size + 2:
                formatted_text.append(f"## {text}")
            else:
                formatted_text.append(text)

        return "\n".join(formatted_text)

    def process_file(self, file_path):
        ext = os.path.splitext(file_path)[1].lower()
        full_text = []

        # Add Debug Info to top of file
        debug_header = "\n".join(DEBUG_LOG)
        full_text.append(f"--- DEBUG INFO ---\n{debug_header}\n------------------\n")

        raw_result_text = ""

        if ext == ".pdf":
            # Ensure temp_images directory exists
            temp_img_dir = os.path.join(os.getcwd(), "temp_images")
            os.makedirs(temp_img_dir, exist_ok=True)

            # STRATEGY 1: Direct Text Extraction (PyMuPDF)
            try:
                import fitz  # PyMuPDF
                doc = fitz.open(file_path)
                total_pages = len(doc)
                print(f"[*] Analyzing PDF page by page ({total_pages} pages)...")

                # --- PASS 1: Count xref frequency across pages (template detection) ---
                xref_page_count = Counter()
                for page in doc:
                    for img in page.get_images(full=True):
                        xref_page_count[img[0]] += 1

                template_threshold = max(int(total_pages * 0.5), 3)
                template_xrefs = {x for x, c in xref_page_count.items() if c > template_threshold}
                if template_xrefs:
                    print(f"[*] Detected {len(template_xrefs)} template images (appear on >{template_threshold} pages), skipping.")

                # --- PASS 2: Extract text + unique content images ---
                seen_xrefs = set()
                seen_hashes = set()

                with tempfile.TemporaryDirectory() as temp_dir:
                    for i, page in enumerate(doc):
                        # A. STRUCTURAL TEXT EXTRACTION
                        structured_text = self.extract_text_with_structure(page)

                        plain_text = page.get_text("text").strip()

                        if len(plain_text) > 50:
                            print(f"    Page {i+1}: Digital text found ({len(plain_text)} chars).")
                            full_text.append(f"--- Slide {i+1} (Extracted) ---\n{structured_text}\n")
                        else:
                            print(f"    Page {i+1}: Low text ({len(plain_text)} chars). Marking for AI OCR...")
                            pix = page.get_pixmap(dpi=200)
                            ocr_img_path = os.path.join(temp_img_dir, f"ocr_page_{i+1}_{os.getpid()}.png")
                            pix.save(ocr_img_path)
                            full_text.append(f"\n[[[OCR_REQUIRED:slide_{i+1}:{ocr_img_path}]]]\n")

                        # B. IMAGE EXTRACTION (For AI Analysis)
                        image_list = page.get_images(full=True)
                        for img_index, img in enumerate(image_list):
                            xref = img[0]
                            width = img[2]
                            height = img[3]

                            # FILTER 1: Skip template/repeated images (logos, backgrounds)
                            if xref in template_xrefs:
                                continue

                            # FILTER 2: Skip already-processed xrefs (deduplication)
                            if xref in seen_xrefs:
                                continue

                            # FILTER 3: Dimensions — diagrams are usually at least 200x200
                            if width < 200 or height < 200:
                                continue

                            base_image = doc.extract_image(xref)
                            image_bytes = base_image["image"]

                            # FILTER 4: File Size — ignore tiny files (15KB threshold)
                            if len(image_bytes) < 15360:
                                seen_xrefs.add(xref)
                                continue

                            # FILTER 5: Content hash dedup (different xref, same bytes)
                            img_hash = hashlib.md5(image_bytes).hexdigest()
                            if img_hash in seen_hashes:
                                seen_xrefs.add(xref)
                                continue

                            seen_xrefs.add(xref)
                            seen_hashes.add(img_hash)

                            image_ext = base_image["ext"]
                            img_filename = f"slide_{i+1}_img_{img_index}_{os.getpid()}.{image_ext}"
                            img_path = os.path.join(temp_img_dir, img_filename)

                            with open(img_path, "wb") as f_out:
                                f_out.write(image_bytes)

                            full_text.append(f"\n[[[IMAGE_ANALYSIS_REQUIRED:{img_path}]]]\n")

                unique_count = len(seen_hashes)
                skipped = sum(xref_page_count.values()) - unique_count
                print(f"[*] Image summary: {unique_count} unique content images extracted, {skipped} duplicates/templates skipped.")

            except ImportError:
                print("[!] PyMuPDF failed. Falling back to full OCR.")
                raw_result_text = self.fallback_full_ocr(file_path)
            except Exception as e:
                return f"Error processing PDF: {str(e)}"
            
            if not raw_result_text:
                raw_result_text = "\n".join(full_text)

        elif ext in [".jpg", ".jpeg", ".png", ".bmp"]:
            print(f"[*] Processing single image...")
            text = self.extract_text_from_image(file_path, config=r'-l eng --psm 3')
            full_text.append(text)
            raw_result_text = "\n".join(full_text)
        
        else:
            return "Unsupported file format."

        # Apply Post-Processing Cleaning
        print("[*] Cleaning text (removing headers, fixing bullets)...")
        final_text = self.clean_text(raw_result_text)
        return final_text


    def fallback_full_ocr(self, file_path):
        # Original full OCR logic for when PyMuPDF fails completely
        full_text = []
        try:
            images = convert_from_path(file_path, dpi=300)
            with tempfile.TemporaryDirectory() as temp_dir:
                for i, image in enumerate(images):
                    page_path = os.path.join(temp_dir, f"page_{i}.jpg")
                    image.save(page_path, "JPEG")
                    text = self.extract_text_from_image(page_path, config=r'-l eng --psm 3')
                    full_text.append(f"--- Slide {i+1} (OCR) ---\n{text}\n")
            return "\n".join(full_text)
        except Exception as e:
            return f"Error: {e}"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python ocr_service.py <file_path>")
        sys.exit(1)

    input_file = sys.argv[1]
    
    if not os.path.exists(input_file):
        print(f"Error: File not found {input_file}")
        sys.exit(1)

    ocr = LectureOCR()
    result = ocr.process_file(input_file)
    
    # Force UTF-8 for stdout (Windows fix)
    sys.stdout.reconfigure(encoding='utf-8')
    
    # Print result to stdout for Node.js to capture
    print("===OCR_START===")
    print(result)
    print("===OCR_END===")
