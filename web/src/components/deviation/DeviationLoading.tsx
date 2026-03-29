import React from "react";
import { Skeleton } from "../ui/Skeleton";
import { t } from "../../utils/i18n";

export default function DeviationLoading() {
    return (
        <div className="lc-section" style={{ padding: 24 }}>
            <Skeleton width="50%" height={22} />
            <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
                <Skeleton height={60} />
                <Skeleton height={60} />
                <Skeleton height={60} />
            </div>
            <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Skeleton height={100} />
                <Skeleton height={100} />
            </div>
            <p className="text-muted" style={{ textAlign: 'center', marginTop: 16, fontSize: 13 }}>
                {t("deviation.analyzing")}
            </p>
        </div>
    );
}
