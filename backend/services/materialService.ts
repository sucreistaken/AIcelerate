import { Material } from "../models/Material";
import { notFound } from "../middleware/errorHandler";
import { leanToId } from "../config/mongoose-plugins";

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

/** Lean representation of a Material document (from .lean() or .toObject()). */
interface MaterialLeanDoc {
  _id?: unknown;
  id?: string;
  roomId: string;
  uploadedBy: string;
  pdfPath?: string;
  audioPath?: string;
  transcript?: string;
  slideText?: string;
  createdAt?: Date | string;
}

/** Convert a lean Mongo document to the MaterialData shape consumers expect. */
function toMaterialData(doc: MaterialLeanDoc): MaterialData {
  const normalized = leanToId(doc);
  return {
    id: normalized.id,
    roomId: normalized.roomId,
    uploadedBy: normalized.uploadedBy,
    pdfPath: normalized.pdfPath,
    audioPath: normalized.audioPath,
    transcript: normalized.transcript,
    slideText: normalized.slideText,
    createdAt: normalized.createdAt instanceof Date
      ? normalized.createdAt.toISOString()
      : String(normalized.createdAt ?? ""),
  };
}

export const materialService = {
  async create(roomId: string, uploadedBy: string): Promise<MaterialData> {
    const doc = await Material.create({ roomId, uploadedBy });
    return toMaterialData(doc.toObject());
  },

  async getByRoom(roomId: string): Promise<MaterialData | null> {
    const doc = await Material.findOne({ roomId }).sort({ createdAt: -1 }).lean();
    return doc ? toMaterialData(doc) : null;
  },

  async getById(id: string): Promise<MaterialData | null> {
    const doc = await Material.findById(id).lean();
    return doc ? toMaterialData(doc) : null;
  },

  async update(id: string, data: Partial<MaterialData>): Promise<MaterialData> {
    // Strip the id field so we don't try to overwrite _id
    const { id: _ignored, ...updateData } = data;
    const doc = await Material.findByIdAndUpdate(id, { $set: updateData }, { returnDocument: 'after' }).lean();
    if (!doc) throw notFound("Material not found");
    return toMaterialData(doc);
  },

  async setPdf(id: string, pdfPath: string, slideText?: string): Promise<MaterialData> {
    return this.update(id, { pdfPath, slideText });
  },

  async setAudio(id: string, audioPath: string, transcript?: string): Promise<MaterialData> {
    return this.update(id, { audioPath, transcript });
  },

  async deleteByRoom(roomId: string): Promise<void> {
    await Material.deleteMany({ roomId });
  },
};
