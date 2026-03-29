import { logger } from "../utils/logger";
import { useEffect, useState, useRef, useCallback } from "react";
import { renderMindMapSVG } from "../utils/mindmapRenderer";
import { deepDiveApi } from "../services/api";
import { useLessonStore } from "../stores/lessonStore";
import { exportToPdf } from "../utils/pdfExport";
import { useGamificationStore } from "../stores/gamificationStore";
import { t } from "../utils/i18n";

export interface ModuleInfo {
    id: number;
    title: string;
    topics: string[];
}

export interface SavedMindMap {
    code: string;
    title: string;
    savedAt: number;
}

export interface NodeDetail {
    title: string;
    explanation?: string;
    keyPoints?: string[];
    relatedConcepts?: string[];
    example?: { scenario: string; explanation: string; takeaway: string };
    quiz?: { question: string; options: string[]; correctAnswer: string; explanation: string };
}

export interface LearnedNodes {
    [nodeId: string]: boolean;
}

const STORAGE_KEY_PREFIX = 'lc.mindmap.';
const PROGRESS_KEY_PREFIX = 'lc.mindmap.progress.';

const getStorageKey = (lessonId: string, moduleId: number) =>
    `${STORAGE_KEY_PREFIX}${lessonId}.module.${moduleId}`;

const getProgressKey = (lessonId: string) =>
    `${PROGRESS_KEY_PREFIX}${lessonId}`;

export function useMindMap() {
    const { currentLessonId } = useLessonStore();
    const [code, setCode] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const svgContainerRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const codeRef = useRef(code);
    codeRef.current = code;
    const prevAnimCodeRef = useRef('');

    const [modules, setModules] = useState<ModuleInfo[]>([]);
    const [selectedModule, setSelectedModule] = useState<number>(-1);
    const [mapTitle, setMapTitle] = useState<string>("Mind Map");
    const [isFromCache, setIsFromCache] = useState(false);

    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [nodeDetail, setNodeDetail] = useState<NodeDetail | null>(null);
    const [nodeLoading, setNodeLoading] = useState(false);
    const [activeAction, setActiveAction] = useState<'explain' | 'example' | 'quiz' | null>(null);

    const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<string | null>(null);

    const [pdfLoading, setPdfLoading] = useState(false);

    const [showQuizResult, setShowQuizResult] = useState(false);

    const [learnedNodes, setLearnedNodes] = useState<LearnedNodes>({});
    const [allNodes, setAllNodes] = useState<string[]>([]);
    const [nodeSearch, setNodeSearch] = useState('');

    // Palette & rendering handled by mindmapRenderer.ts

    useEffect(() => {
        const loadModules = async () => {
            if (!currentLessonId) return;
            const res = await deepDiveApi.getModules(currentLessonId);
            if (res.ok && res.modules) {
                setModules(res.modules);
                setMapTitle(res.lessonTitle || "Zihin Haritası");
            }
        };
        loadModules();
        setSelectedModule(-1);
        setCode("");
        setIsFromCache(false);
    }, [currentLessonId]);

    useEffect(() => {
        if (!currentLessonId) return;

        const storageKey = getStorageKey(currentLessonId, selectedModule);
        const saved = localStorage.getItem(storageKey);

        if (saved) {
            try {
                const parsed: SavedMindMap = JSON.parse(saved);
                if (parsed.code) {
                    setCode(parsed.code);
                    setMapTitle(parsed.title || "Zihin Haritası");
                    setIsFromCache(true);
                    setError(null);
                    return;
                }
            } catch (e) {
                logger.error('Failed to parse saved mindmap:', e);
            }
        }

        setCode("");
        setIsFromCache(false);
    }, [currentLessonId, selectedModule]);

    const saveMindMap = useCallback((mapCode: string, title: string) => {
        if (!currentLessonId || !mapCode) return;

        const storageKey = getStorageKey(currentLessonId, selectedModule);
        const data: SavedMindMap = {
            code: mapCode,
            title: title,
            savedAt: Date.now()
        };
        localStorage.setItem(storageKey, JSON.stringify(data));
    }, [currentLessonId, selectedModule]);

    const clearSavedMap = useCallback(() => {
        if (!currentLessonId) return;

        const storageKey = getStorageKey(currentLessonId, selectedModule);
        localStorage.removeItem(storageKey);
        setCode("");
        setMapTitle("Zihin Haritası");
        setIsFromCache(false);
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setAllNodes([]);
        setSelectedNode(null);
        setNodeDetail(null);
        // Clear the rendered SVG from DOM
        if (svgContainerRef.current) {
            svgContainerRef.current.innerHTML = "";
        }
    }, [currentLessonId, selectedModule]);

    const generate = async () => {
        if (!currentLessonId) return;
        setLoading(true);
        setError(null);
        setCode("");
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setIsFromCache(false);
        setAllNodes([]);
        // Clear old SVG so skeleton is visible
        if (svgContainerRef.current) {
            svgContainerRef.current.innerHTML = "";
        }

        const res = selectedModule === -1
            ? await deepDiveApi.generateMindMap(currentLessonId)
            : await deepDiveApi.generateModuleMindMap(currentLessonId, selectedModule);

        setLoading(false);

        if (res.ok && res.code) {
            const newTitle = ('moduleTitle' in res && typeof res.moduleTitle === 'string')
                ? res.moduleTitle
                : mapTitle;

            setCode(res.code);
            setMapTitle(newTitle);

            saveMindMap(res.code, newTitle);
        } else {
            setError(res.error || t("error.mapFailed"));
        }
    };

    useEffect(() => {
        if (!currentLessonId) return;
        const progressKey = getProgressKey(currentLessonId);
        const saved = localStorage.getItem(progressKey);
        if (saved) {
            try {
                setLearnedNodes(JSON.parse(saved));
            } catch (e) {
                logger.error('Failed to parse saved progress:', e);
            }
        }
    }, [currentLessonId]);

    useEffect(() => {
        if (!currentLessonId || Object.keys(learnedNodes).length === 0) return;
        const progressKey = getProgressKey(currentLessonId);
        localStorage.setItem(progressKey, JSON.stringify(learnedNodes));
    }, [learnedNodes, currentLessonId]);

    useEffect(() => {
        if (!code && svgContainerRef.current) {
            svgContainerRef.current.innerHTML = "";
            prevAnimCodeRef.current = ''; // reset so next code always triggers render
            return;
        }
        if (!code || !svgContainerRef.current) return;

        const svgGone = !svgContainerRef.current.querySelector('svg');
        const isNewMap = code !== prevAnimCodeRef.current || svgGone;

        // Re-render SVG when code changes OR DOM was externally cleared (e.g. generate())
        if (isNewMap) {
            prevAnimCodeRef.current = code;
            try {
                const { svg, nodeNames } = renderMindMapSVG(code, { animate: true });
                svgContainerRef.current.innerHTML = svg;
                setAllNodes(nodeNames);
            } catch (e) {
                logger.error("MindMap render error:", e);
                setError(t("error.diagramFailed"));
                return;
            }

            // Attach interaction listeners
            const svgEl = svgContainerRef.current.querySelector('svg');
            if (svgEl) {
                svgEl.querySelectorAll('[data-node-name]').forEach(node => {
                    const shape = node.querySelector('rect, circle, ellipse') as SVGElement | null;

                    node.addEventListener('mouseenter', () => {
                        if (shape) {
                            shape.style.stroke = '#6366f1';
                            shape.style.strokeWidth = '2.5';
                            shape.style.strokeOpacity = '1';
                        }
                    });
                    node.addEventListener('mouseleave', () => {
                        if (shape) {
                            shape.style.stroke = '';
                            shape.style.strokeWidth = '';
                            shape.style.strokeOpacity = '';
                        }
                    });
                    node.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const name = (node as Element).getAttribute('data-node-name') || '';
                        logger.info('[MindMap] Node clicked:', name);
                        if (name) {
                            setSelectedNode(name);
                            setNodeDetail(null);
                            setActiveAction(null);
                            setSelectedQuizAnswer(null);
                            setShowQuizResult(false);
                        }
                    });
                });

                // Clean up connection dasharray after draw-in animation (for export)
                svgEl.querySelectorAll('.mm-anim-conn').forEach(el => {
                    el.addEventListener('animationend', () => {
                        el.removeAttribute('stroke-dasharray');
                        el.removeAttribute('stroke-dashoffset');
                    }, { once: true });
                });
            }
        }

        // Always apply learned-node coloring (whether new code or just toggle)
        const svgEl = svgContainerRef.current.querySelector('svg');
        if (svgEl) {
            svgEl.querySelectorAll('[data-node-name]').forEach(node => {
                const name = node.getAttribute('data-node-name');
                const shape = node.querySelector('rect, circle, ellipse') as SVGElement | null;
                if (!shape) return;
                if (name && learnedNodes[name]) {
                    shape.style.fill = '#00B894';
                    shape.style.opacity = '0.85';
                } else {
                    shape.style.fill = '';
                    shape.style.opacity = '';
                }
            });
        }
    }, [code, learnedNodes]);

    const fetchNodeDetail = useCallback(async (action: 'explain' | 'example' | 'quiz', nodeName?: string) => {
        const targetNode = nodeName || selectedNode;
        if (!currentLessonId || !targetNode) return;

        setNodeLoading(true);
        setActiveAction(action);
        setSelectedQuizAnswer(null);
        setShowQuizResult(false);

        const res = await deepDiveApi.getNodeDetail(currentLessonId, targetNode, action);

        setNodeLoading(false);

        if (res.ok) {
            setNodeDetail({
                title: res.title || targetNode,
                explanation: res.explanation,
                keyPoints: res.keyPoints,
                relatedConcepts: res.relatedConcepts,
                example: res.example,
                quiz: res.quiz
            });
        } else {
            setNodeDetail({ title: targetNode, explanation: res.error || 'Failed to get details' });
        }
    }, [currentLessonId, selectedNode]);

    const fetchAllNodeDetails = useCallback(async (nodeName?: string) => {
        const targetNode = nodeName || selectedNode;
        if (!currentLessonId || !targetNode) return;

        setNodeLoading(true);
        setActiveAction('explain');
        setSelectedQuizAnswer(null);
        setShowQuizResult(false);

        const res = await deepDiveApi.getNodeDetailFull(currentLessonId, targetNode);

        setNodeLoading(false);

        if (res.ok) {
            setNodeDetail({
                title: res.title || targetNode,
                explanation: res.explanation,
                keyPoints: res.keyPoints,
                relatedConcepts: res.relatedConcepts,
                example: res.example,
                quiz: res.quiz
            });
        } else {
            setNodeDetail({ title: targetNode, explanation: res.error || 'Failed to get details' });
        }
    }, [currentLessonId, selectedNode]);

    const toggleLearned = useCallback((nodeName: string) => {
        setLearnedNodes(prev => {
            const wasLearned = prev[nodeName];
            if (!wasLearned) {
                useGamificationStore.getState().addXp('mindmap-learn');
            }
            return { ...prev, [nodeName]: !wasLearned };
        });
    }, []);

    const progressPercent = allNodes.length > 0
        ? Math.round((Object.values(learnedNodes).filter(Boolean).length / allNodes.length) * 100)
        : 0;

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.25));
    const handleZoomReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); panRef.current = { x: 0, y: 0 }; };

    // --- Canvas interactions: wheel zoom/pan + click-drag pan ---
    const isPanning = useRef(false);
    const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
    const panRef = useRef({ x: 0, y: 0 }); // mirror of state for event handlers

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        // Wheel: Ctrl/Cmd = zoom, plain scroll = pan
        const onWheel = (e: WheelEvent) => {
            if (!codeRef.current) return; // empty state — allow normal page scroll
            e.preventDefault();
            if (e.ctrlKey || e.metaKey) {
                // Zoom — smooth, small increments
                const delta = -e.deltaY * 0.003;
                setZoom(prev => Math.min(Math.max(prev + delta, 0.2), 4));
            } else {
                // Pan — scroll to move around the canvas
                setPan(prev => {
                    const next = { x: prev.x - e.deltaX, y: prev.y - e.deltaY };
                    panRef.current = next;
                    return next;
                });
            }
        };

        // Pointer down: start drag pan
        const onDown = (e: PointerEvent) => {
            if (e.button !== 0) return;
            // Don't start pan on interactive elements
            if ((e.target as HTMLElement).closest('button, a, input, select')) return;

            isPanning.current = true;
            panStartRef.current = {
                x: e.clientX,
                y: e.clientY,
                panX: panRef.current.x,
                panY: panRef.current.y,
            };
            el.style.cursor = 'grabbing';
            el.style.userSelect = 'none';
        };

        // Pointer move: drag to pan
        const onMove = (e: PointerEvent) => {
            if (!isPanning.current) return;
            const dx = e.clientX - panStartRef.current.x;
            const dy = e.clientY - panStartRef.current.y;
            const next = {
                x: panStartRef.current.panX + dx,
                y: panStartRef.current.panY + dy,
            };
            panRef.current = next;
            setPan(next);
        };

        // Pointer up: stop panning
        const onUp = () => {
            if (!isPanning.current) return;
            isPanning.current = false;
            el.style.cursor = '';
            el.style.userSelect = '';
        };

        el.addEventListener('wheel', onWheel, { passive: false });
        el.addEventListener('pointerdown', onDown);
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        return () => {
            el.removeEventListener('wheel', onWheel);
            el.removeEventListener('pointerdown', onDown);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
    }, []);

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    const closeDetailPanel = () => {
        setSelectedNode(null);
        setNodeDetail(null);
        setActiveAction(null);
    };

    const handleExportPdf = async () => {
        if (!svgContainerRef.current) return;
        setPdfLoading(true);
        try {
            await exportToPdf(svgContainerRef.current, "MindMap", { orientation: "landscape" });
        } catch (err) {
            logger.error("PDF export error:", err);
        } finally {
            setPdfLoading(false);
        }
    };

    const downloadAsPng = useCallback(async () => {
        const svgEl = svgContainerRef.current?.querySelector('svg');
        if (!svgEl) {
            alert('Önce haritayı oluşturun');
            return;
        }

        try {
            const bbox = svgEl.getBBox();
            const width = Math.max(bbox.width + bbox.x + 40, 800);
            const height = Math.max(bbox.height + bbox.y + 40, 600);

            const clonedSvg = svgEl.cloneNode(true) as SVGSVGElement;
            clonedSvg.setAttribute('width', String(width));
            clonedSvg.setAttribute('height', String(height));
            clonedSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);

            const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            bgRect.setAttribute('width', '100%');
            bgRect.setAttribute('height', '100%');
            bgRect.setAttribute('fill', '#ffffff');
            clonedSvg.insertBefore(bgRect, clonedSvg.firstChild);

            const svgData = new XMLSerializer().serializeToString(clonedSvg);
            const svgBase64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                const scale = 2;
                canvas.width = width * scale;
                canvas.height = height * scale;
                if (ctx) {
                    ctx.scale(scale, scale);
                    ctx.drawImage(img, 0, 0, width, height);
                }

                canvas.toBlob((blob) => {
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `zihin-haritasi-${Date.now()}.png`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    }
                }, 'image/png');
            };

            img.onerror = () => {
                alert('PNG oluşturulurken hata oluştu');
            };

            img.src = svgBase64;
        } catch (e) {
            logger.error('PNG download error:', e);
            alert('PNG indirme hatası');
        }
    }, []);

    const downloadAsSvg = useCallback(() => {
        const svgEl = svgContainerRef.current?.querySelector('svg');
        if (!svgEl) return;

        const svgData = new XMLSerializer().serializeToString(svgEl);
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `zihin-haritasi-${Date.now()}.svg`;
        a.click();
        URL.revokeObjectURL(url);
    }, []);

    const handleNodeSearchClick = useCallback((nodeName: string) => {
        setNodeSearch('');
        setSelectedNode(nodeName);
        const el = svgContainerRef.current?.querySelector(`[data-node-name="${nodeName}"]`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const shape = el.querySelector('rect, circle, ellipse, polygon, path') as SVGElement | null;
            if (shape) {
                shape.style.stroke = '#6366f1';
                shape.style.strokeWidth = '3';
                shape.style.strokeOpacity = '1';
                setTimeout(() => {
                    shape.style.stroke = '';
                    shape.style.strokeWidth = '';
                    shape.style.strokeOpacity = '';
                }, 2000);
            }
        }
    }, []);

    return {
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
    };
}
