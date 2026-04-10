import path from "path";
import fs from "fs";
import { badRequest, notFound } from "../middleware/errorHandler";
import { readJSON, writeJSON, ensureDataFiles } from "../utils/file-Handler";

const UPLOAD_DIR = path.join(process.cwd(), "backend", "data", "materials");

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

import { generateId as _genId } from "../utils/idGenerator";
const generateId = () => _genId("mat");

interface MaterialData {
  id: string;
  roomId: string;
  uploadedBy: string;
  pdfPath?: string;
  audioPath?: string;
  transcript?: string;
  slideText?: string;
  createdAt: string;
}

const MATERIALS_FILE = path.join(process.cwd(), "backend", "data", "materials.json");

ensureDataFiles([{ path: MATERIALS_FILE, initial: [] }]);

function readMaterials(): MaterialData[] {
  return readJSON<MaterialData[]>(MATERIALS_FILE) || [];
}

function writeMaterials(materials: MaterialData[]): void {
  writeJSON(MATERIALS_FILE, materials);
}

export const materialService = {
  async create(roomId: string, uploadedBy: string): Promise<MaterialData> {
    const material: MaterialData = {
      id: generateId(),
      roomId,
      uploadedBy,
      createdAt: new Date().toISOString(),
    };
    const materials = readMaterials();
    materials.push(material);
    writeMaterials(materials);
    return material;
  },

  async getByRoom(roomId: string): Promise<MaterialData | null> {
    const materials = readMaterials();
    return materials.find((m) => m.roomId === roomId) || null;
  },

  async getById(id: string): Promise<MaterialData | null> {
    const materials = readMaterials();
    return materials.find((m) => m.id === id) || null;
  },

  async update(id: string, data: Partial<MaterialData>): Promise<MaterialData> {
    const materials = readMaterials();
    const idx = materials.findIndex((m) => m.id === id);
    if (idx === -1) throw notFound("Material not found");
    materials[idx] = { ...materials[idx], ...data };
    writeMaterials(materials);
    return materials[idx];
  },

  async setPdf(id: string, pdfPath: string, slideText?: string): Promise<MaterialData> {
    return this.update(id, { pdfPath, slideText });
  },

  async setAudio(id: string, audioPath: string, transcript?: string): Promise<MaterialData> {
    return this.update(id, { audioPath, transcript });
  },

  async deleteByRoom(roomId: string): Promise<void> {
    const materials = readMaterials();
    const filtered = materials.filter((m) => m.roomId !== roomId);
    writeMaterials(filtered);
  },
};
