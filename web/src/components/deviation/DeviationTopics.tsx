import React from "react";

interface DeviationTopicsProps {
    missedTopics: string[];
    extraTopics: string[];
}

export default function DeviationTopics({ missedTopics, extraTopics }: DeviationTopicsProps) {
    if (missedTopics.length === 0 && extraTopics.length === 0) return null;

    return (
        <section className="lc-section">
            <div className="grid-gap-16">
                {missedTopics.length > 0 && (
                    <div>
                        <div className="fw-700 fs-13 text-muted mb-2 uppercase tracking-wide">Slaytta Olup Deginilenmeyen</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {missedTopics.map((t, i) => (
                                <span key={i} className="pill dv-pill-missed">
                                    {t}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {extraTopics.length > 0 && (
                    <div>
                        <div className="fw-700 fs-13 text-muted mb-2 uppercase tracking-wide">Slayt Disi Eklenen Konular</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {extraTopics.map((t, i) => (
                                <span key={i} className="pill dv-pill-extra">
                                    {t}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
