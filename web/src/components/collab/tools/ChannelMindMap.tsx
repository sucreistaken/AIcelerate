import { logger } from "../../../utils/logger";
import { useState, useRef, useEffect, useCallback } from "react";
import { useChannelToolStore } from "../../../stores/channelToolStore";
import { channelToolApi } from "../../../services/channelToolApi";
import { getCollabSocket } from "../../../services/socket";
import { TypingIndicator } from "../../ui";

import type { LessonContextInfo } from "../../../types";

interface Props {
  channelId: string;
  topic: string;
  serverName: string;
  nickname: string;
  lessonContext?: LessonContextInfo | null;
}

export default function ChannelMindMap({ channelId, topic, serverName, nickname, lessonContext }: Props) {
  // Zustand selectors - derive state inline, never call methods in selectors
  const mermaidCode = useChannelToolStore(
    (s) => s.dataByChannel[channelId]?.mindMap?.mermaidCode ?? ""
  );
  const mindMapTopic = useChannelToolStore(
    (s) => s.dataByChannel[channelId]?.mindMap?.topic ?? ""
  );
  const updateMindMap = useChannelToolStore((s) => s.updateMindMap);

  // True when any member in this channel is generating a mind-map. Derived
  // from the broadcast-driven aiStatusByChannel slice, refreshed by Socket.IO.
  const aiThinking = useChannelToolStore((s) => {
    const status = s.aiStatusByChannel[channelId];
    return status?.tool === "mind-map" && status.state === "thinking";
  });

  // Local state
  const [generating, setGenerating] = useState(false);
  const [scale, setScale] = useState(1);
  const [customTopic, setCustomTopic] = useState("");
  const [sourcesSummary, setSourcesSummary] = useState<string | null>(null);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);

  // Render mermaid diagram when code changes
  useEffect(() => {
    if (!mermaidCode || !containerRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: document.documentElement.classList.contains("dark") ? "dark" : "default",
          securityLevel: "loose",
        });

        if (cancelled) return;

        const { svg } = await mermaid.render(`mindmap-${channelId}`, mermaidCode);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        logger.error("Mermaid render error:", err);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = `<pre style="padding: 16px; color: var(--text); white-space: pre-wrap;">${mermaidCode}</pre>`;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mermaidCode, channelId]);

  // Generate mind map
  const handleGenerate = useCallback(async (overrideTopic?: string) => {
    if (generating) return;
    setGenerating(true);

    try {
      const targetTopic = overrideTopic || customTopic.trim() || topic;
      const res = await channelToolApi.generateMindMap(channelId, targetTopic, serverName);
      updateMindMap(channelId, res.mindMap);
      setSourcesSummary(res.sourcesSummary || null);
      getCollabSocket().emit("tool:mindmap:update", { channelId, mindMap: res.mindMap });
      setCustomTopic("");
    } catch (err) {
      logger.error("Mind map generation failed:", err);
    } finally {
      setGenerating(false);
    }
  }, [channelId, topic, serverName, generating, updateMindMap, customTopic]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.2, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - 0.2, 0.2));
  }, []);

  const handleZoomReset = useCallback(() => {
    setScale(1);
  }, []);

  // Empty state - no mind map generated yet and nobody is generating one.
  // If `aiThinking` is true we fall through to the "generating" skeleton so
  // remote generations still show a progress indicator.
  if (!mermaidCode && !generating && !aiThinking) {
    return (
      <div className="sh-tool">
        {/* Header */}
        <div className="sh-tool__header">
          <div className="sh-tool__header-left">
            <span className="sh-mindmap__header-icon">{"M"}</span>
            <div>
              <h3 className="sh-main-content__channel-name">Mind Map - {topic}</h3>
              <span className="sh-mindmap__subtitle">AI Zihin Haritas\ı</span>
            </div>
          </div>
        </div>

        {/* Empty state hero card */}
        <div className="sh-tool__body">
          <div className="sh-mindmap__empty-hero">
            <div className="sh-mindmap__empty-card">
              <div className="sh-mindmap__empty-icon-wrap">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <circle cx="4" cy="6" r="2" />
                  <circle cx="20" cy="6" r="2" />
                  <circle cx="4" cy="18" r="2" />
                  <circle cx="20" cy="18" r="2" />
                  <line x1="9.5" y1="10.5" x2="5.5" y2="7.5" />
                  <line x1="14.5" y1="10.5" x2="18.5" y2="7.5" />
                  <line x1="9.5" y1="13.5" x2="5.5" y2="16.5" />
                  <line x1="14.5" y1="13.5" x2="18.5" y2="16.5" />
                </svg>
              </div>
              <h3 className="sh-mindmap__empty-title">Zihin Haritas\ı Olu\şturun</h3>
              <p className="sh-mindmap__empty-desc">
                AI ile konunun g\örsel haritas\ın\ı \ç\ıkar\ın. Kavramlar aras\ı ba\ğlant\ılar\ı ke\şfedin.
              </p>
              {aiThinking && (
                <div style={{ marginBottom: 12 }}>
                  <TypingIndicator label="AI zihin haritas\u0131 olu\u015Fturuyor" />
                </div>
              )}
              <button
                className="sh-mindmap__generate-hero-btn"
                onClick={() => handleGenerate()}
                disabled={generating || aiThinking}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                Olu\ştur
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Generating state - skeleton animation.
  // Triggered by local click (generating=true) OR a remote broadcast (aiThinking=true).
  if ((generating || aiThinking) && !mermaidCode) {
    return (
      <div className="sh-tool">
        <div className="sh-tool__header">
          <div className="sh-tool__header-left">
            <span className="sh-mindmap__header-icon">{"M"}</span>
            <div>
              <h3 className="sh-main-content__channel-name">Mind Map - {topic}</h3>
              <span className="sh-mindmap__subtitle">AI Zihin Haritas\ı</span>
            </div>
          </div>
        </div>
        <div className="sh-tool__body">
          <div className="sh-mindmap__skeleton">
            <div className="sh-mindmap__skeleton-pulse">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="sh-mindmap__skeleton-icon">
                <circle cx="12" cy="12" r="3" />
                <circle cx="4" cy="6" r="2" />
                <circle cx="20" cy="6" r="2" />
                <circle cx="4" cy="18" r="2" />
                <circle cx="20" cy="18" r="2" />
                <line x1="9.5" y1="10.5" x2="5.5" y2="7.5" />
                <line x1="14.5" y1="10.5" x2="18.5" y2="7.5" />
                <line x1="9.5" y1="13.5" x2="5.5" y2="16.5" />
                <line x1="14.5" y1="13.5" x2="18.5" y2="16.5" />
              </svg>
            </div>
            <p className="sh-mindmap__skeleton-text">Zihin haritas\ı olu\şturuluyor\...</p>
            <div className="sh-mindmap__skeleton-bars">
              <div className="sh-mindmap__skeleton-bar sh-mindmap__skeleton-bar--1" />
              <div className="sh-mindmap__skeleton-bar sh-mindmap__skeleton-bar--2" />
              <div className="sh-mindmap__skeleton-bar sh-mindmap__skeleton-bar--3" />
            </div>
            <div style={{ marginTop: 8 }}>
              <TypingIndicator label="AI konuyu analiz ediyor" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sh-tool">
      {/* Header with gradient icon + subtopic input */}
      <div className="sh-tool__header">
        <div className="sh-tool__header-left">
          <span className="sh-mindmap__header-icon">{"M"}</span>
          <div>
            <h3 className="sh-main-content__channel-name">
              Mind Map - {mindMapTopic || topic}
            </h3>
            <span className="sh-mindmap__subtitle">AI Zihin Haritas\ı</span>
          </div>
        </div>
        <div className="sh-tool__header-right">
          <div className="sh-mindmap__topic-input-wrap">
            <svg className="sh-mindmap__topic-input-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="sh-mindmap__topic-input"
              type="text"
              placeholder="Alt konu girin\..."
              value={customTopic}
              onChange={e => setCustomTopic(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleGenerate(); }}
            />
          </div>
          <button
            className="sh-mindmap__regen-btn"
            onClick={() => handleGenerate()}
            disabled={generating}
          >
            {generating ? (
              <span className="sh-btn-spinner" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            )}
            {customTopic.trim() ? "Olu\ştur" : "Yenile"}
          </button>
        </div>
      </div>

      <div className="sh-tool__body" style={{ padding: 0, position: "relative" }}>
        {/* Sources summary card */}
        {sourcesSummary && (
          <div className="sh-mindmap__sources-card">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span>Kaynak: {sourcesSummary} temelinde olu\şturuldu</span>
          </div>
        )}

        {/* Floating glassmorphism toolbar */}
        <div className="sh-mindmap__toolbar">
          <button
            className="sh-mindmap__toolbar-btn"
            onClick={handleZoomOut}
            title="Uzakla\şt\ır"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          <div className="sh-mindmap__zoom-track">
            <div
              className="sh-mindmap__zoom-fill"
              style={{ width: `${Math.min(((scale - 0.2) / 2.8) * 100, 100)}%` }}
            />
            <span className="sh-mindmap__zoom-label">{Math.round(scale * 100)}%</span>
          </div>

          <button
            className="sh-mindmap__toolbar-btn"
            onClick={handleZoomIn}
            title="Yak\ınla\şt\ır"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          <div className="sh-mindmap__toolbar-divider" />

          <button
            className="sh-mindmap__toolbar-btn"
            onClick={handleZoomReset}
            title="S\ıf\ırla"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6" />
              <path d="M9 21H3v-6" />
              <path d="M21 3l-7 7" />
              <path d="M3 21l7-7" />
            </svg>
          </button>
        </div>

        {/* Mind map container */}
        <div className="sh-mindmap__container">
          <div
            ref={containerRef}
            className="sh-mindmap__svg"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "center top",
            }}
          />
        </div>
      </div>
    </div>
  );
}
