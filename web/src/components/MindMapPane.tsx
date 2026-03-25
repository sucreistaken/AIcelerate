import React from "react";
import { motion } from "framer-motion";
import PaneInfoBanner from "./ui/PaneInfoBanner";
import MindMapHeader from "./MindMapHeader";
import MindMapNodeDetail from "./MindMapNodeDetail";
import MindMapProgress, { MindMapSearch } from "./MindMapProgress";
import { useMindMap } from "../hooks/useMindMap";

export default function MindMapPane() {
    const {
        currentLessonId,
        code,
        loading,
        error,
        zoom,
        isFullscreen,
        containerRef,
        svgContainerRef,
        wrapperRef,
        modules,
        selectedModule,
        setSelectedModule,
        mapTitle,
        isFromCache,
        selectedNode,
        nodeDetail,
        nodeLoading,
        activeAction,
        selectedQuizAnswer,
        setSelectedQuizAnswer,
        pdfLoading,
        showQuizResult,
        setShowQuizResult,
        learnedNodes,
        allNodes,
        nodeSearch,
        setNodeSearch,
        clearSavedMap,
        generate,
        fetchNodeDetail,
        fetchAllNodeDetails,
        toggleLearned,
        progressPercent,
        handleZoomIn,
        handleZoomOut,
        handleZoomReset,
        toggleFullscreen,
        closeDetailPanel,
        handleExportPdf,
        downloadAsPng,
        downloadAsSvg,
        handleNodeSearchClick,
    } = useMindMap();

    if (!currentLessonId) return <div className="p-4 op-50">Ders seçilmedi.</div>;

    const containerStyles: React.CSSProperties = isFullscreen ? {
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'var(--bg, white)',
        display: 'flex',
        flexDirection: 'column',
        padding: 20,
    } : {
        height: 'calc(100vh - 180px)',
        display: 'flex',
        flexDirection: 'column',
    };

    return (
        <div className="lc-section" style={containerStyles} ref={wrapperRef}>
            <PaneInfoBanner
              id="mindmap"
              title="Mind Map Nasil Kullanilir?"
              description="Dersin kavram haritasi AI tarafindan olusturulur. Herhangi bir node'a tiklayarak detayli aciklama, ornek ve mini quiz alin. Yesil node'lar ogrenilmis kavramlari gosterir. Arama kutusuyla belirli bir kavrama hizla ulasin."
              tips={["Node'a tikla = detay", "Yesil = ogrenildi", "Zoom ve tam ekran", "PNG/SVG/PDF export"]}
            />

            <MindMapHeader
                mapTitle={mapTitle}
                isFullscreen={isFullscreen}
                isFromCache={isFromCache}
                code={code}
                modules={modules}
                selectedModule={selectedModule}
                setSelectedModule={setSelectedModule}
                zoom={zoom}
                loading={loading}
                pdfLoading={pdfLoading}
                clearSavedMap={clearSavedMap}
                handleZoomIn={handleZoomIn}
                handleZoomOut={handleZoomOut}
                handleZoomReset={handleZoomReset}
                downloadAsPng={downloadAsPng}
                downloadAsSvg={downloadAsSvg}
                handleExportPdf={handleExportPdf}
                toggleFullscreen={toggleFullscreen}
                generate={generate}
            />

            <MindMapSearch
                code={code}
                allNodes={allNodes}
                nodeSearch={nodeSearch}
                setNodeSearch={setNodeSearch}
                learnedNodes={learnedNodes}
                handleNodeSearchClick={handleNodeSearchClick}
            />

            <div
                ref={containerRef}
                className="mindmap-container"
                style={{
                    flex: 1,
                    overflow: 'auto',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: code ? 'flex-start' : 'center',
                    background: code ? 'var(--bg-elevated)' : 'var(--card-hover)',
                    borderRadius: 16,
                    border: '1px solid var(--border)',
                    position: 'relative',
                    minHeight: 400,
                }}
            >
                {loading && (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                            style={{ marginBottom: 16, display: 'inline-block' }}
                        >
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A5.5 5.5 0 0 0 4 7.5c0 1.33.47 2.55 1.26 3.5H5a4 4 0 0 0-1 7.89V19a2 2 0 0 0 2 2h2"/><path d="M14.5 2A5.5 5.5 0 0 1 20 7.5c0 1.33-.47 2.55-1.26 3.5H19a4 4 0 0 1 1 7.89V19a2 2 0 0 1-2 2h-2"/><path d="M12 2v20"/></svg>
                        </motion.div>
                        <p className="text-muted fw-600" style={{ fontSize: 16 }}>
                            AI is connecting concepts...
                        </p>
                        <p className="text-muted fs-12">This may take 10-20 seconds</p>
                    </div>
                )}

                {!loading && !code && !error && (
                    <div className="text-center op-50" style={{ padding: 40 }}>
                        <div style={{ marginBottom: 16 }}><svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg></div>
                        <p style={{ fontSize: 16, fontWeight: 600 }}>Click generate to see the map.</p>
                        <p className="text-muted fs-12">Visualize your lesson's key concepts</p>
                    </div>
                )}

                {error && (
                    <div style={{ padding: 40, textAlign: 'center' }}>
                        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.6 }}>&#9888;</div>
                        <p style={{ fontWeight: 600, color: 'var(--danger)' }}>{error}</p>
                        <button className="btn btn-primary mt-4" onClick={generate}>Tekrar Üret</button>
                        {code && (
                            <div style={{ marginTop: 20, textAlign: 'left', padding: 16, background: 'var(--input-bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
                                <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14, color: 'var(--text)' }}>Outline View (fallback):</div>
                                <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap', color: 'var(--muted)', margin: 0, fontFamily: 'monospace' }}>
                                    {code.split('\n').filter(l => l.trim() && !l.trim().startsWith('mindmap')).map(l => l.replace(/root\(\((.+?)\)\)/, '$1')).join('\n')}
                                </pre>
                            </div>
                        )}
                    </div>
                )}

                <div
                    ref={svgContainerRef}
                    style={{
                        transform: `scale(${zoom})`,
                        transformOrigin: 'top center',
                        transition: 'transform 0.2s ease',
                        padding: 40,
                        minWidth: 'fit-content'
                    }}
                />
            </div>

            <MindMapProgress
                code={code}
                allNodes={allNodes}
                learnedNodes={learnedNodes}
                progressPercent={progressPercent}
                isFullscreen={isFullscreen}
                selectedNode={selectedNode}
            />

            <MindMapNodeDetail
                selectedNode={selectedNode}
                nodeDetail={nodeDetail}
                nodeLoading={nodeLoading}
                activeAction={activeAction}
                selectedQuizAnswer={selectedQuizAnswer}
                setSelectedQuizAnswer={setSelectedQuizAnswer}
                showQuizResult={showQuizResult}
                setShowQuizResult={setShowQuizResult}
                learnedNodes={learnedNodes}
                fetchNodeDetail={fetchNodeDetail}
                fetchAllNodeDetails={fetchAllNodeDetails}
                toggleLearned={toggleLearned}
                closeDetailPanel={closeDetailPanel}
            />
        </div>
    );
}
