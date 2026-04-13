import { logger } from "./logger";
import axios from "axios";
import * as cheerio from "cheerio";

/**
 * Verilen ders kodu için okul sitesinden "Öğrenme Çıktılarını" çeker.
 * Örn: "EEE 242" -> https://ce.ieu.edu.tr/en/syllabus_v2/type/read/id/EEE+242
 */
export async function fetchLearningOutcomes(courseCode: string): Promise<string[]> {
  try {
    // 1. URL Formatlama (Boşlukları + yap)
    // Örn: " FENG  101 " -> "FENG+101"
    const formattedCode = courseCode.trim().replace(/\s+/g, "+").toUpperCase();
    
    // Ders kodu çok kısaysa (örn: "DENEME") boş dön, siteye gitme
    if (formattedCode.length < 3) return [];

    const url = `https://ce.ieu.edu.tr/en/syllabus/type/read/id/${formattedCode}`;
    logger.info(`📡 Syllabus aranıyor: ${url}`);

    // 2. İsteği At
    const { data } = await axios.get(url, {
      timeout: 5000, // 5 saniye içinde cevap gelmezse pes et (sistemi kilitlemesin)
    });

    // 3. HTML'i Yükle
    const $ = cheerio.load(data);
    const outcomes: string[] = [];

    // 4. Doğru Tabloyu Bul
    // Sitede "Öğrenme Çıktıları" veya "Learning Outcomes" yazan tabloyu arıyoruz.
    $("table").each((_, table) => {
      const textContent = $(table).text();
      
      // Başlığında LO, Öğrenme Çıktıları vb. geçen tablo mu?
      if (textContent.includes("Öğrenme Çıktıları") || textContent.includes("Learning Outcomes")) {
        
        // Satırları (tr) gez
        $(table).find("tbody tr").each((_, row) => {
          const cells = $(row).find("td");
          
          // Genellikle yapı şöyledir: [LO Kodu] [Açıklama] [Diğerleri...]
          // Biz 2. sütundaki (index 1) açıklamayı istiyoruz.
          if (cells.length >= 2) {
            const outcomeText = $(cells[1]).text().trim();
            
            // Boş değilse ve çok kısa değilse listeye ekle
            if (outcomeText.length > 5) {
              outcomes.push(outcomeText);
            }
          }
        });
      }
    });

    if (outcomes.length > 0) {
      logger.info(`✅ ${courseCode} için ${outcomes.length} kazanım bulundu.`);
    } else {
      logger.info(`⚠️ ${courseCode} için kazanım bulunamadı (veya format farklı).`);
    }

    return outcomes;

  } catch (error: unknown) {
    // 404 hatası veya network hatası olursa sessizce boş dizi dön
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`❌ Syllabus çekilemedi (${courseCode}):`, message);
    return [];
  }
}