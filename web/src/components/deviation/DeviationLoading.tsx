import React from "react";
import { motion } from "framer-motion";

export default function DeviationLoading() {
    return (
        <div className="lc-section" style={{ padding: 40, textAlign: "center" }}>
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                style={{ fontSize: 40, marginBottom: 16, display: "inline-block" }}
            >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </motion.div>
            <h3 className="fw-700 fs-18">Analiz Ediliyor...</h3>
            <p className="text-muted">Hocanın konuşması slaytlarla karşılaştırılıyor.</p>
        </div>
    );
}
