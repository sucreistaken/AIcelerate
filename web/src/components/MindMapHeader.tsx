import React from "react";
import type { ModuleInfo } from "../hooks/useMindMap";

interface MindMapHeaderProps {
    mapTitle: string;
    isFullscreen: boolean;
    isFromCache: boolean;
    code: string;
    modules: ModuleInfo[];
    selectedModule: number;
    setSelectedModule: (id: number) => void;
    zoom: number;
    loading: boolean;
    pdfLoading: boolean;
    clearSavedMap: () => void;
    handleZoomIn: () => void;
    handleZoomOut: () => void;
    handleZoomReset: () => void;
    downloadAsPng: () => void;
    downloadAsSvg: () => void;
    handleExportPdf: () => void;
    toggleFullscreen: () => void;
    generate: () => void;
}

export default function MindMapHeader({
    mapTitle,
    isFullscreen,
    isFromCache,
    code,
    modules,
    selectedModule,
    setSelectedModule,
    zoom,
    loading,
    pdfLoading,
    clearSavedMap,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    downloadAsPng,
    downloadAsSvg,
    handleExportPdf,
    toggleFullscreen,
    generate,
}: MindMapHeaderProps) {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 12
        }}>
            <div>
                <h3 className="fw-800 m-0" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>{' '}{mapTitle || "Zihin Haritası"}
                    {isFullscreen && (
                        <span style={{
                            fontSize: 12,
                            background: '#6366f1',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: 4
                        }}>
                            Fullscreen
                        </span>
                    )}
                    {isFromCache && (
                        <span style={{
                            fontSize: 11,
                            background: 'var(--success, #22c55e)',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: 4
                        }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 3 }}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>Saved
                        </span>
                    )}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <p className="text-muted fs-12 m-0">Concept map for this lesson</p>
                    {code && (
                        <button
                            onClick={clearSavedMap}
                            title="Clear map"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '2px 6px',
                                borderRadius: 4,
                                fontSize: 11,
                                opacity: 0.6,
                                color: 'var(--text)',
                                transition: 'all 0.15s'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'var(--border)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.background = 'transparent'; }}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 3 }}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>Clear
                        </button>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {modules.length > 0 && (
                    <select
                        value={selectedModule}
                        onChange={(e) => setSelectedModule(Number(e.target.value))}
                        style={{
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: '1px solid var(--border)',
                            background: 'var(--input-bg)',
                            color: 'var(--text)',
                            fontSize: 13,
                            cursor: 'pointer',
                            minWidth: 180
                        }}
                    >
                        {modules.map((m) => (
                            <option key={m.id} value={m.id}>
                                {m.title}
                            </option>
                        ))}
                    </select>
                )}
                {code && (
                    <>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            background: 'var(--card-hover)',
                            borderRadius: 8,
                            padding: '4px 8px',
                            border: '1px solid var(--border)'
                        }}>
                            <button
                                onClick={handleZoomOut}
                                className="btn-icon"
                                style={{ padding: 4, fontSize: 16 }}
                                title="Zoom Out"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            </button>
                            <span style={{
                                minWidth: 50,
                                textAlign: 'center',
                                fontSize: 12,
                                fontWeight: 600
                            }}>
                                {Math.round(zoom * 100)}%
                            </span>
                            <button
                                onClick={handleZoomIn}
                                className="btn-icon"
                                style={{ padding: 4, fontSize: 16 }}
                                title="Zoom In"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            </button>
                            <button
                                onClick={handleZoomReset}
                                className="btn-icon"
                                style={{ padding: 4, fontSize: 12 }}
                                title="Reset Zoom"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                            </button>
                        </div>

                        <div style={{
                            display: 'flex',
                            gap: 4,
                            background: 'var(--card-hover)',
                            borderRadius: 8,
                            padding: '4px 8px',
                            border: '1px solid var(--border)'
                        }}>
                            <button
                                onClick={downloadAsPng}
                                className="btn-icon"
                                style={{ padding: '4px 8px', fontSize: 12 }}
                                title="Download as PNG"
                            >
                                PNG
                            </button>
                            <button
                                onClick={downloadAsSvg}
                                className="btn-icon"
                                style={{ padding: '4px 8px', fontSize: 12 }}
                                title="Download as SVG"
                            >
                                SVG
                            </button>
                            <button
                                onClick={handleExportPdf}
                                className="btn-icon"
                                style={{ padding: '4px 8px', fontSize: 12 }}
                                disabled={pdfLoading}
                                title="Download as PDF"
                            >
                                {pdfLoading ? "..." : "PDF"}
                            </button>
                        </div>

                        <button
                            onClick={toggleFullscreen}
                            className="btn btn-ghost btn-sm"
                            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                        >
                            {isFullscreen ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 4 }}><polyline points="4 14 4 20 10 20"/><polyline points="20 10 20 4 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>Exit</> : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 4 }}><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>Fullscreen</>}
                        </button>
                    </>
                )}

                <button
                    className="btn btn-primary btn-sm"
                    onClick={generate}
                    disabled={loading}
                    style={{ minWidth: 140 }}
                >
                    {loading ? 'Generating...' : code ? 'Regenerate' : 'Generate Map'}
                </button>
            </div>
        </div>
    );
}
