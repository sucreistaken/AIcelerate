import React from "react";

interface DeviationErrorProps {
    error: string;
    onRetry?: () => void;
}

export default function DeviationError({ error, onRetry }: DeviationErrorProps) {
    return (
        <div className="lc-section" style={{ padding: 24, textAlign: "center" }}>
            <div style={{ marginBottom: 16 }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <h3 className="fw-700 fs-18" style={{ color: "#ef4444" }}>
                Analiz Hatası
            </h3>
            <p className="text-muted mb-4">{error}</p>
            {onRetry && (
                <button className="btn btn-primary" onClick={onRetry}>
                    Tekrar Dene
                </button>
            )}
        </div>
    );
}
