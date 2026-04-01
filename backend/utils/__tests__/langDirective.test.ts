import { describe, it, expect } from "vitest";
import { getLangDirective } from "../langDirective";

describe("getLangDirective", () => {
  it("returns Turkish directive by default", () => {
    const result = getLangDirective();
    expect(result).toContain("TÜRKÇE");
  });

  it("returns Turkish directive for 'tr'", () => {
    const result = getLangDirective("tr");
    expect(result).toContain("TÜRKÇE");
  });

  it("returns English directive for 'en'", () => {
    const result = getLangDirective("en");
    expect(result).toContain("ENGLISH");
  });
});
