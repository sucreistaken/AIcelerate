import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { StreamPhase, StreamingModule } from "../../hooks/useStreamingAnalysis";
import { t } from "../../utils/i18n";

interface StreamingOverlayProps {
  isStreaming: boolean;
  phases: StreamPhase[];
  progress: number;
  tokenCount: number;
  modules: StreamingModule[];
  emphases: StreamingModule[];
  currentPhase: string;
  error: string | null;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

function PhaseIndicator({ phase }: { phase: StreamPhase }) {
  return (
    <motion.div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 0",
        fontSize: 13,
        color: phase.status === "done" ? "var(--success)" : phase.status === "active" ? "var(--text)" : "var(--muted)",
        fontWeight: phase.status === "active" ? 600 : 400,
      }}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <span style={{
        width: 20, height: 20, borderRadius: "50%", display: "grid", placeItems: "center",
        background: phase.status === "done" ? "var(--success)" : phase.status === "active" ? "var(--accent-2)" : "var(--border)",
        color: phase.status === "pending" ? "var(--muted)" : "white",
        fontSize: 10, fontWeight: 700, flexShrink: 0,
        transition: "all 0.3s ease",
      }}>
        {phase.status === "done" ? "✓" : phase.status === "active" ? (
          <motion.svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}>
            <path d="M12 2a10 10 0 0 1 10 10" />
          </motion.svg>
        ) : "○"}
      </span>
      <span>{phase.message}</span>
    </motion.div>
  );
}

function ModuleCard({ mod, index }: { mod: StreamingModule; index: number }) {
  return (
    <motion.div
      variants={itemVariants}
      style={{
        padding: "10px 14px",
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        fontSize: 13,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 2 }}>
        <span style={{ color: "var(--accent-2)", marginRight: 6 }}>M{index + 1}</span>
        {mod.data?.title || `Module ${index + 1}`}
      </div>
      {mod.data?.goal && (
        <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.4 }}>
          {mod.data.goal.length > 100 ? mod.data.goal.slice(0, 100) + "..." : mod.data.goal}
        </div>
      )}
    </motion.div>
  );
}

function StreamingOverlayInner({
  isStreaming, phases, progress, tokenCount, modules, emphases, currentPhase, error,
}: StreamingOverlayProps) {
  if (!isStreaming && !error && progress < 100) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{ maxWidth: 520, margin: "0 auto" }}
    >
      {/* Progress Bar */}
      <div style={{
        height: 4, borderRadius: 2, background: "var(--border)",
        marginBottom: 20, overflow: "hidden",
      }}>
        <motion.div
          style={{ height: "100%", borderRadius: 2, background: error ? "var(--danger)" : "var(--accent-2)" }}
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* Phase Indicators */}
      <div style={{ marginBottom: 16 }}>
        {phases.map((phase) => (
          <PhaseIndicator key={phase.id} phase={phase} />
        ))}
      </div>

      {/* Token Counter */}
      {currentPhase === "generating" && tokenCount > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            fontSize: 11, color: "var(--muted)", textAlign: "center", marginBottom: 12,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {tokenCount} {t("streaming.tokensGenerated")}
        </motion.div>
      )}

      {/* Modules appearing progressively */}
      <AnimatePresence>
        {modules.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: 4 }}>
              {t("streaming.modules")} ({modules.length}/{modules[0]?.total || "?"})
            </div>
            {modules.map((mod, i) => (
              <ModuleCard key={i} mod={mod} index={i} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emphases count */}
      {emphases.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ fontSize: 12, color: "var(--muted)", textAlign: "center" }}
        >
          ✨ {emphases.length} {t("streaming.insightsExtracted")}
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            padding: "10px 14px", borderRadius: 8, marginTop: 12,
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            color: "var(--danger)", fontSize: 13,
          }}
        >
          {error}
        </motion.div>
      )}

      {/* Completion */}
      {progress >= 100 && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          style={{ textAlign: "center", padding: "16px 0", fontSize: 14, fontWeight: 600, color: "var(--success)" }}
        >
          ✅ {t("streaming.complete")}
        </motion.div>
      )}
    </motion.div>
  );
}

export default React.memo(StreamingOverlayInner);
