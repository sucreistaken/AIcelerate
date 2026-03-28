import React from "react";
import { t } from "../../utils/i18n";

interface DeviationEmptyProps {
    onGenerate?: () => void;
}

export default function DeviationEmpty({ onGenerate }: DeviationEmptyProps) {
    return (
        <div className="lc-section" style={{ padding: 40, textAlign: "center" }}>
            <div style={{ marginBottom: 16 }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            </div>
            <h3 className="fw-700 fs-18">{t("deviation.emptyTitle")}</h3>
            <p className="text-muted mb-4" style={{ maxWidth: 400, margin: "0 auto 24px" }}>
                {t("deviation.emptyDesc")}
            </p>
            {onGenerate && (
                <button className="btn btn-primary" onClick={onGenerate}>
                    {t("deviation.startAnalysis")}
                </button>
            )}
        </div>
    );
}
