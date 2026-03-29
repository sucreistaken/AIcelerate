import React from "react";
import type { ModuleInfo } from "../hooks/useMindMap";
import { t } from "../utils/i18n";

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

/* ---- Inline SVG icons (14x14, strokeWidth 1.8) ---- */
const Icon = ({ d, ...props }: { d: string } & React.SVGProps<SVGSVGElement>) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d={d} />
    </svg>
);

const ZoomOutIcon = () => <Icon d="M5 12h14" />;
const ZoomInIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);
const ResetIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
);
const FullscreenIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
    </svg>
);
const ExitFullscreenIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 14 4 20 10 20" /><polyline points="20 10 20 4 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" />
    </svg>
);
const TrashIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);
const MapIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M12 2a7 7 0 0 1 7 7c0 3-2 5.5-4 7.5L12 20l-3-3.5c-2-2-4-4.5-4-7.5a7 7 0 0 1 7-7z" />
    </svg>
);
const RefreshIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
);

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
        <div className="mm-topbar">
            {/* Left: Title + badges */}
            <div className="mm-topbar__left">
                <h3 className="mm-topbar__title">
                    <span className="mm-topbar__title-icon"><MapIcon /></span>
                    {mapTitle || t("mindmap.mindMapTitle")}
                    {isFromCache && (
                        <span className="mm-topbar__badge mm-topbar__badge--cached">Saved</span>
                    )}
                    {isFullscreen && (
                        <span className="mm-topbar__badge mm-topbar__badge--fullscreen">Fullscreen</span>
                    )}
                </h3>
                {code && (
                    <button className="mm-btn-clear" onClick={clearSavedMap} title="Clear map">
                        <TrashIcon /> Clear
                    </button>
                )}
            </div>

            {/* Right: Toolbar */}
            <div className="mm-toolbar">
                {/* Module selector */}
                {modules.length > 0 && (
                    <select
                        className="mm-module-select"
                        value={selectedModule}
                        onChange={(e) => setSelectedModule(Number(e.target.value))}
                    >
                        {modules.map((m) => (
                            <option key={m.id} value={m.id}>{m.title}</option>
                        ))}
                    </select>
                )}

                {/* Zoom controls */}
                {code && (
                    <div className="mm-ctrl-group">
                        <button className="mm-btn mm-btn--icon" onClick={handleZoomOut} title="Zoom Out">
                            <ZoomOutIcon />
                        </button>
                        <span className="mm-btn mm-btn--zoom-label">{Math.round(zoom * 100)}%</span>
                        <button className="mm-btn mm-btn--icon" onClick={handleZoomIn} title="Zoom In">
                            <ZoomInIcon />
                        </button>
                        <div className="mm-ctrl-group__sep" />
                        <button className="mm-btn mm-btn--icon" onClick={handleZoomReset} title="Reset Zoom">
                            <ResetIcon />
                        </button>
                    </div>
                )}

                {/* Export controls */}
                {code && (
                    <div className="mm-ctrl-group">
                        <button className="mm-btn" onClick={downloadAsPng} title="Export PNG">PNG</button>
                        <button className="mm-btn" onClick={downloadAsSvg} title="Export SVG">SVG</button>
                        <button className="mm-btn" onClick={handleExportPdf} disabled={pdfLoading} title="Export PDF">
                            {pdfLoading ? "..." : "PDF"}
                        </button>
                    </div>
                )}

                {/* Fullscreen */}
                {code && (
                    <button
                        className="mm-btn mm-btn--icon"
                        onClick={toggleFullscreen}
                        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                        style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', height: 32, width: 32 }}
                    >
                        {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
                    </button>
                )}

                {/* Generate / Regenerate */}
                <button
                    className="mm-btn-primary"
                    onClick={generate}
                    disabled={loading}
                >
                    <RefreshIcon />
                    {loading ? t("mindmap.generating") : code ? t("mindmap.regenerate") : t("mindmap.generateMap")}
                </button>
            </div>
        </div>
    );
}
