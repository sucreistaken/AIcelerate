import { logger } from "../utils/logger";
import { useEffect, useState, useRef, useCallback } from "react";
import mermaid from "mermaid";
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

    useEffect(() => {
        // --- Premium mind map color palette ---
        // Harmonious, muted-vibrant colors that work on dark (#0c0c0e) backgrounds
        // Each branch gets a distinct but cohesive color
        const palette = {
            root:     '#6366f1', // Indigo — central anchor
            branch0:  '#6366f1', // Indigo
            branch1:  '#0ea5e9', // Sky blue
            branch2:  '#14b8a6', // Teal
            branch3:  '#f59e0b', // Amber
            branch4:  '#f43f5e', // Rose
            branch5:  '#a855f7', // Purple
            branch6:  '#22c55e', // Emerald
            branch7:  '#ec4899', // Pink
            connector: '#334155', // Slate-700 — subtle
        };

        mermaid.initialize({
            startOnLoad: false,
            theme: 'base',
            themeVariables: {
                fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
                fontSize: '13px',

                // Root node
                primaryColor: palette.root,
                primaryTextColor: '#ffffff',
                primaryBorderColor: 'transparent',

                // Connector lines
                lineColor: palette.connector,

                // Section colors (cScale0-7 = branch fill colors)
                cScale0: palette.branch0,
                cScale1: palette.branch1,
                cScale2: palette.branch2,
                cScale3: palette.branch3,
                cScale4: palette.branch4,
                cScale5: palette.branch5,
                cScale6: palette.branch6,
                cScale7: palette.branch7,

                // All text white on colored backgrounds
                cScaleLabel0: '#ffffff',
                cScaleLabel1: '#ffffff',
                cScaleLabel2: '#ffffff',
                cScaleLabel3: '#ffffff',
                cScaleLabel4: '#ffffff',
                cScaleLabel5: '#ffffff',
                cScaleLabel6: '#ffffff',
                cScaleLabel7: '#ffffff',

                // Peer colors (borders) — slightly darker than fill
                cScalePeer0: '#4f46e5',
                cScalePeer1: '#0284c7',
                cScalePeer2: '#0d9488',
                cScalePeer3: '#d97706',
                cScalePeer4: '#e11d48',
                cScalePeer5: '#9333ea',
                cScalePeer6: '#16a34a',
                cScalePeer7: '#db2777',
            },
            mindmap: {
                padding: 18,
                useMaxWidth: false,
            },
        });
    }, []);

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
        setIsFromCache(false);

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
            return;
        }
        if (code && svgContainerRef.current) {
            svgContainerRef.current.innerHTML = "";
            const id = `mermaid-${Date.now()}`;
            try {
                mermaid.render(id, code)
                    .then(({ svg }) => {
                        if (svgContainerRef.current) {
                            svgContainerRef.current.innerHTML = svg;
                            const svgEl = svgContainerRef.current.querySelector('svg');
                            if (svgEl) {
                                svgEl.style.maxWidth = '100%';
                                svgEl.style.height = 'auto';
                                svgEl.style.minWidth = '800px';
                                svgEl.style.overflow = 'visible';

                                // --- Inject SVG defs for drop-shadow filters ---
                                const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
                                defs.innerHTML = `
                                    <filter id="mm-node-shadow" x="-8%" y="-8%" width="116%" height="130%">
                                        <feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="rgba(0,0,0,0.35)" flood-opacity="0.5"/>
                                    </filter>
                                    <filter id="mm-root-glow" x="-20%" y="-20%" width="140%" height="140%">
                                        <feDropShadow dx="0" dy="2" stdDeviation="8" flood-color="#6366f1" flood-opacity="0.4"/>
                                    </filter>
                                `;
                                svgEl.prepend(defs);

                                // --- Node shape polish ---
                                svgEl.querySelectorAll('rect').forEach(r => {
                                    r.setAttribute('rx', '14');
                                    r.setAttribute('ry', '14');
                                    r.style.filter = 'url(#mm-node-shadow)';
                                    // Remove harsh stroke — use subtle same-hue border
                                    const stroke = r.getAttribute('stroke');
                                    if (stroke) {
                                        r.setAttribute('stroke-width', '1.5');
                                        r.setAttribute('stroke-opacity', '0.3');
                                    }
                                });

                                // Root circle — indigo glow
                                svgEl.querySelectorAll('.section-root circle, .section-root ellipse').forEach(c => {
                                    c.style.filter = 'url(#mm-root-glow)';
                                    c.setAttribute('stroke', 'rgba(99,102,241,0.4)');
                                    c.setAttribute('stroke-width', '2');
                                });

                                // --- Connector lines: organic, soft ---
                                svgEl.querySelectorAll('path, line').forEach(el => {
                                    const cls = el.getAttribute('class') || '';
                                    // Target edge/connector paths (not node shapes)
                                    if (cls.includes('edge') || el.parentElement?.getAttribute('class')?.includes('edge')) {
                                        el.setAttribute('stroke-width', '2');
                                        el.setAttribute('stroke-linecap', 'round');
                                        el.setAttribute('stroke-linejoin', 'round');
                                        el.setAttribute('stroke-opacity', '0.5');
                                    }
                                });

                                // --- Text polish ---
                                svgEl.querySelectorAll('text').forEach(t => {
                                    t.setAttribute('font-weight', '500');
                                    t.style.textShadow = '0 1px 2px rgba(0,0,0,0.3)';
                                });
                                // Root text bolder
                                svgEl.querySelectorAll('.section-root text').forEach(t => {
                                    t.setAttribute('font-weight', '700');
                                    t.setAttribute('font-size', '15px');
                                });

                                const nodeElements = svgEl.querySelectorAll('.mindmap-node, .node, g[class*="node"]');
                                const extractedNodes: string[] = [];

                                nodeElements.forEach((node) => {
                                    const textEl = node.querySelector('text, foreignObject');
                                    let nodeName = textEl?.textContent?.trim() || '';

                                    nodeName = nodeName.replace(/^[📚❓🎯⚡💡📝🔗✅]\s*/, '').trim();

                                    if (nodeName && nodeName.length > 1) {
                                        extractedNodes.push(nodeName);

                                        (node as HTMLElement).setAttribute('data-node-name', nodeName);

                                        (node as HTMLElement).style.cursor = 'pointer';

                                        const shape = node.querySelector('rect, circle, ellipse, polygon, path');
                                        const originalStroke = shape ? (shape as SVGElement).getAttribute('stroke') : null;
                                        const originalStrokeWidth = shape ? (shape as SVGElement).getAttribute('stroke-width') : null;

                                        node.addEventListener('mouseenter', () => {
                                            if (shape) {
                                                (shape as SVGElement).setAttribute('stroke', '#6366f1');
                                                (shape as SVGElement).setAttribute('stroke-width', '3');
                                            }
                                        });
                                        node.addEventListener('mouseleave', () => {
                                            if (shape) {
                                                if (originalStroke) {
                                                    (shape as SVGElement).setAttribute('stroke', originalStroke);
                                                } else {
                                                    (shape as SVGElement).removeAttribute('stroke');
                                                }
                                                if (originalStrokeWidth) {
                                                    (shape as SVGElement).setAttribute('stroke-width', originalStrokeWidth);
                                                } else {
                                                    (shape as SVGElement).removeAttribute('stroke-width');
                                                }
                                            }
                                        });
                                        node.addEventListener('click', (e) => {
                                            e.stopPropagation();
                                            const clickedNodeName = (e.currentTarget as HTMLElement).getAttribute('data-node-name') || '';
                                            logger.info('[MindMap] Node clicked:', clickedNodeName);
                                            if (clickedNodeName) {
                                                setSelectedNode(clickedNodeName);
                                                setNodeDetail(null);
                                                setActiveAction(null);
                                                setSelectedQuizAnswer(null);
                                                setShowQuizResult(false);
                                            }
                                        });
                                    }
                                });

                                setAllNodes(extractedNodes);

                                nodeElements.forEach((node) => {
                                    const nodeName = (node as HTMLElement).getAttribute('data-node-name') || '';
                                    if (nodeName && learnedNodes[nodeName]) {
                                        const shape = node.querySelector('rect, circle, ellipse, polygon, path');
                                        if (shape) {
                                            (shape as SVGElement).setAttribute('fill', '#00B894');
                                            (shape as SVGElement).setAttribute('opacity', '0.85');
                                        }
                                    }
                                });
                            }
                        }
                    })
                    .catch((e) => {
                        logger.error("Mermaid Render Error:", e);
                        setError(t("error.diagramFailed"));
                    });
            } catch (e: any) {
                logger.error(e);
                setError(t("error.diagramFailed"));
            }
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
    const handleZoomReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

    // --- Canvas interactions: wheel zoom/pan + click-drag pan ---
    const isPanning = useRef(false);
    const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
    const panRef = useRef({ x: 0, y: 0 }); // mirror of state for event handlers

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        // Wheel: Ctrl/Cmd = zoom, plain scroll = pan
        const onWheel = (e: WheelEvent) => {
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
            const shape = el.querySelector('rect, circle, ellipse, polygon, path');
            if (shape) {
                (shape as SVGElement).setAttribute('stroke', '#6366f1');
                (shape as SVGElement).setAttribute('stroke-width', '4');
                setTimeout(() => {
                    (shape as SVGElement).removeAttribute('stroke');
                    (shape as SVGElement).removeAttribute('stroke-width');
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
