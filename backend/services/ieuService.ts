import { logger } from "../utils/logger";
import { badRequest, notFound } from "../middleware/errorHandler";

declare const fetch: any;

function normalizeCourseCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "+");
}

function cleanHtmlText(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractLearningOutcomes(html: string): string[] {
  const out: string[] = [];
  const idx = html.indexOf("Learning Outcomes");
  if (idx === -1) return out;
  const slice = html.slice(idx, idx + 8000);

  const ulMatch = slice.match(/<ul[^>]*>([\s\S]*?)<\/ul>/i);
  if (ulMatch) {
    const liMatches = Array.from(ulMatch[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi));
    for (const m of liMatches) {
      const text = cleanHtmlText(m[1]);
      if (text) out.push(text);
    }
  }

  if (!out.length) {
    const rowMatches = Array.from(
      slice.matchAll(/<tr[^>]*>[\s\S]*?<td[^>]*>\s*LO\d+\s*<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/gi)
    );
    for (const rm of rowMatches) {
      const text = cleanHtmlText(rm[1]);
      if (text) out.push(text);
    }
  }

  return out;
}

export async function fetchIeuLearningOutcomes(rawCode: string): Promise<{
  code: string; url: string; learningOutcomes: string[];
}> {
  if (!rawCode?.trim()) throw badRequest("code param is required");

  const code = normalizeCourseCode(rawCode);
  const url = `https://se.ieu.edu.tr/en/syllabus_v2/type/read/id/${encodeURIComponent(code)}`;

  const r = await fetch(url);
  if (!r.ok) throw notFound(`Syllabus not found for ${code}`);

  const html = await r.text();
  const learningOutcomes = extractLearningOutcomes(html);

  logger.info(`[IEU] Fetched LOs for ${code}: ${learningOutcomes.length} found`);
  return { code, url, learningOutcomes };
}
