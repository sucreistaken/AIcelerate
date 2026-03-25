import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { env } from "../config/env";

let _model: GenerativeModel | null = null;

export function getModel(): GenerativeModel {
  if (!_model) {
    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    _model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  }
  return _model;
}

export const stripCodeFences = (s: string) =>
  s.replace(/```json/gi, "").replace(/```/g, "").trim();

export const tryParseJSON = (s: string) => {
  try { return JSON.parse(s); } catch { return null; }
};
