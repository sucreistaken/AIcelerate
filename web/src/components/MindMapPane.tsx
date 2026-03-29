import React from "react";
import PaneInfoBanner from "./ui/PaneInfoBanner";
import { NoMindMapEmpty } from "./ui/EmptyState";
import MindMapSkeleton from "./ui/MindMapSkeleton";
import { t } from "../utils/i18n";
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
        pan,
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

    return (
        <div
            className={`mm-page${isFullscreen ? " mm-page--fullscreen" : ""}`}
            ref={wrapperRef}
        >
            <PaneInfoBanner
              id="mindmap"
              title={t("mindmap.title")}
              description={t("mindmap.desc")}
              tips={[t("mindmap.tips1"), t("mindmap.tips2"), t("mindmap.tips3"), t("mindmap.tips4")]}
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

            {/* Canvas: the ONLY scroll zone — drag-to-pan + Ctrl+scroll zoom via native listeners */}
            <div
                ref={containerRef}
                className={`mm-canvas${!code && !loading && !error ? " mm-canvas--empty" : ""}`}
                style={code ? { cursor: 'grab' } : undefined}
            >
                {code && !loading && !error && (
                    <button
                        className="mm-center-btn"
                        onClick={handleZoomReset}
                        title={t("mindmap.centerMap")}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3" /><path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
                        </svg>
                    </button>
                )}

                {loading && <MindMapSkeleton />}

                {!loading && !code && !error && (
                    <NoMindMapEmpty onAction={generate} />
                )}

                {error && (
                    <div className="mm-error">
                        <span className="mm-error__icon">&#9888;</span>
                        <p className="mm-error__message">{error}</p>
                        <button className="btn btn-primary" onClick={generate}>
                            {t("mindmap.regenerate")}
                        </button>
                        {code && (
                            <div className="mm-error__fallback">
                                <div className="mm-error__fallback-title">Outline View (fallback):</div>
                                <pre className="mm-error__fallback-code">
                                    {code.split('\n').filter(l => l.trim() && !l.trim().startsWith('mindmap')).map(l => l.replace(/root\(\((.+?)\)\)/, '$1')).join('\n')}
                                </pre>
                            </div>
                        )}
                    </div>
                )}

                <div
                    ref={svgContainerRef}
                    style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        transformOrigin: '0 0',
                        padding: 40,
                        minWidth: 'fit-content',
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
