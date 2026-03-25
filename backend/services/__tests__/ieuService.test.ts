import { describe, it, expect, vi } from "vitest";

// Mock fetch globally before importing the service
const mockFetch = vi.fn();
(globalThis as any).fetch = mockFetch;

import { fetchIeuLearningOutcomes } from "../ieuService";

describe("fetchIeuLearningOutcomes", () => {
  it("throws on empty code", async () => {
    await expect(fetchIeuLearningOutcomes("")).rejects.toThrow("code param is required");
  });

  it("throws on whitespace-only code", async () => {
    await expect(fetchIeuLearningOutcomes("   ")).rejects.toThrow("code param is required");
  });

  it("normalizes course code to uppercase with + separators", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => `<html><body>Learning Outcomes<ul><li>LO1: Understand basics</li></ul></body></html>`,
    });

    const result = await fetchIeuLearningOutcomes("cs 101");

    // URL-encoded: + becomes %2B in encodeURIComponent
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("CS%2B101")
    );
    expect(result.code).toBe("CS+101");
  });

  it("throws 404 when syllabus not found", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    await expect(fetchIeuLearningOutcomes("FAKE999")).rejects.toThrow("Syllabus not found");
  });

  it("extracts learning outcomes from UL list", async () => {
    const html = `
      <html><body>
        <h2>Learning Outcomes</h2>
        <ul>
          <li>Understand OOP principles</li>
          <li>Apply design patterns</li>
          <li>Write unit tests</li>
        </ul>
      </body></html>
    `;
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => html });

    const result = await fetchIeuLearningOutcomes("SE 301");
    expect(result.learningOutcomes).toHaveLength(3);
    expect(result.learningOutcomes[0]).toBe("Understand OOP principles");
    expect(result.learningOutcomes[2]).toBe("Write unit tests");
  });

  it("extracts learning outcomes from table format", async () => {
    const html = `
      <html><body>
        <h2>Learning Outcomes</h2>
        <table>
          <tr><td>LO1</td><td>Analyze algorithms</td></tr>
          <tr><td>LO2</td><td>Design data structures</td></tr>
        </table>
      </body></html>
    `;
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => html });

    const result = await fetchIeuLearningOutcomes("CS 201");
    expect(result.learningOutcomes).toHaveLength(2);
    expect(result.learningOutcomes[0]).toBe("Analyze algorithms");
  });

  it("returns empty array when no LOs found", async () => {
    const html = `<html><body><h2>Course Description</h2><p>Some text</p></body></html>`;
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => html });

    const result = await fetchIeuLearningOutcomes("XX 100");
    expect(result.learningOutcomes).toHaveLength(0);
  });
});
