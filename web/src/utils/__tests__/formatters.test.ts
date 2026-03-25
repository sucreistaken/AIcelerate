import { describe, it, expect } from "vitest";
import { formatSeconds, formatDuration, timeAgo } from "../formatters";

describe("formatSeconds", () => {
  it("formats 0 seconds", () => {
    expect(formatSeconds(0)).toBe("0:00");
  });

  it("formats seconds under a minute", () => {
    expect(formatSeconds(45)).toBe("0:45");
  });

  it("formats minutes and seconds", () => {
    expect(formatSeconds(165)).toBe("2:45");
  });

  it("pads seconds with zero", () => {
    expect(formatSeconds(62)).toBe("1:02");
  });

  it("handles negative values", () => {
    expect(formatSeconds(-5)).toBe("0:00");
  });

  it("handles NaN", () => {
    expect(formatSeconds(NaN)).toBe("0:00");
  });
});

describe("formatDuration", () => {
  it("formats seconds as MM:SS", () => {
    expect(formatDuration(125)).toBe("02:05");
  });

  it("formats hours as HH:MM:SS", () => {
    expect(formatDuration(3661)).toBe("01:01:01");
  });

  it("formats zero", () => {
    expect(formatDuration(0)).toBe("00:00");
  });

  it("pads all components", () => {
    expect(formatDuration(3605)).toBe("01:00:05");
  });
});

describe("timeAgo", () => {
  it("returns 'just now' for recent timestamps", () => {
    const now = new Date().toISOString();
    expect(timeAgo(now)).toBe("just now");
  });

  it("returns minutes ago", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(timeAgo(fiveMinAgo)).toBe("5m ago");
  });

  it("returns hours ago", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(twoHoursAgo)).toBe("2h ago");
  });

  it("returns days ago", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(threeDaysAgo)).toBe("3d ago");
  });
});
