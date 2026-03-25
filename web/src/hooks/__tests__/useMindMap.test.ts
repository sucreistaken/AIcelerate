import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMindMap } from "../useMindMap";

// Mock mermaid
vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: "<svg></svg>" }),
  },
}));

// Mock lessonStore
let mockCurrentLessonId: string | null = "lesson-1";
vi.mock("../../stores/lessonStore", () => ({
  useLessonStore: () => ({
    currentLessonId: mockCurrentLessonId,
  }),
}));

// Mock gamificationStore
vi.mock("../../stores/gamificationStore", () => ({
  useGamificationStore: Object.assign(
    () => ({ addXp: vi.fn() }),
    { getState: () => ({ addXp: vi.fn() }) },
  ),
}));

// Mock deepDiveApi
const mockGenerateMindMap = vi.fn();
const mockGenerateModuleMindMap = vi.fn();
const mockGetModules = vi.fn();
const mockGetNodeDetail = vi.fn();
const mockGetNodeDetailFull = vi.fn();

vi.mock("../../services/api", () => ({
  deepDiveApi: {
    getModules: (...args: any[]) => mockGetModules(...args),
    generateMindMap: (...args: any[]) => mockGenerateMindMap(...args),
    generateModuleMindMap: (...args: any[]) => mockGenerateModuleMindMap(...args),
    getNodeDetail: (...args: any[]) => mockGetNodeDetail(...args),
    getNodeDetailFull: (...args: any[]) => mockGetNodeDetailFull(...args),
  },
}));

// Mock pdfExport
vi.mock("../../utils/pdfExport", () => ({
  exportToPdf: vi.fn().mockResolvedValue(undefined),
}));

// Mock logger
vi.mock("../../utils/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe("useMindMap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentLessonId = "lesson-1";
    mockGetModules.mockResolvedValue({ ok: true, modules: [], lessonTitle: "Test" });
    localStorage.clear();
  });

  it("initializes with default state", () => {
    const { result } = renderHook(() => useMindMap());
    expect(result.current.code).toBe("");
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.zoom).toBe(1);
    expect(result.current.isFullscreen).toBe(false);
    expect(result.current.selectedModule).toBe(-1);
    expect(result.current.selectedNode).toBeNull();
    expect(result.current.nodeDetail).toBeNull();
    expect(result.current.nodeLoading).toBe(false);
  });

  it("sets selectedModule via setSelectedModule", () => {
    const { result } = renderHook(() => useMindMap());
    act(() => { result.current.setSelectedModule(2); });
    expect(result.current.selectedModule).toBe(2);
  });

  it("generate calls API and sets code on success", async () => {
    mockGenerateMindMap.mockResolvedValue({ ok: true, code: "graph TD\n  A-->B" });
    const { result } = renderHook(() => useMindMap());
    await act(async () => { await result.current.generate(); });
    expect(mockGenerateMindMap).toHaveBeenCalledWith("lesson-1");
    expect(result.current.code).toBe("graph TD\n  A-->B");
    expect(result.current.loading).toBe(false);
  });

  it("generate calls module API when selectedModule is set", async () => {
    mockGenerateModuleMindMap.mockResolvedValue({ ok: true, code: "graph LR\n  X-->Y", moduleTitle: "Module 1" });
    const { result } = renderHook(() => useMindMap());
    act(() => { result.current.setSelectedModule(1); });
    await act(async () => { await result.current.generate(); });
    expect(mockGenerateModuleMindMap).toHaveBeenCalledWith("lesson-1", 1);
    expect(result.current.code).toBe("graph LR\n  X-->Y");
  });

  it("generate sets error on API failure", async () => {
    mockGenerateMindMap.mockResolvedValue({ ok: false, error: "Server error" });
    const { result } = renderHook(() => useMindMap());
    await act(async () => { await result.current.generate(); });
    expect(result.current.error).toBe("Server error");
    expect(result.current.code).toBe("");
  });

  it("zoom controls work correctly", () => {
    const { result } = renderHook(() => useMindMap());
    expect(result.current.zoom).toBe(1);
    act(() => { result.current.handleZoomIn(); });
    expect(result.current.zoom).toBe(1.25);
    act(() => { result.current.handleZoomOut(); });
    expect(result.current.zoom).toBe(1);
    act(() => { result.current.handleZoomReset(); });
    expect(result.current.zoom).toBe(1);
  });

  it("toggleFullscreen toggles the state", () => {
    const { result } = renderHook(() => useMindMap());
    expect(result.current.isFullscreen).toBe(false);
    act(() => { result.current.toggleFullscreen(); });
    expect(result.current.isFullscreen).toBe(true);
    act(() => { result.current.toggleFullscreen(); });
    expect(result.current.isFullscreen).toBe(false);
  });

  it("closeDetailPanel resets selectedNode and nodeDetail", () => {
    const { result } = renderHook(() => useMindMap());
    act(() => { result.current.closeDetailPanel(); });
    expect(result.current.selectedNode).toBeNull();
    expect(result.current.nodeDetail).toBeNull();
    expect(result.current.activeAction).toBeNull();
  });

  it("progressPercent is 0 when no nodes", () => {
    const { result } = renderHook(() => useMindMap());
    expect(result.current.progressPercent).toBe(0);
  });

  it("does not generate when no lessonId", async () => {
    mockCurrentLessonId = null;
    const { result } = renderHook(() => useMindMap());
    await act(async () => { await result.current.generate(); });
    expect(mockGenerateMindMap).not.toHaveBeenCalled();
  });
});
