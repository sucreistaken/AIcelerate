// src/components/layout/PaneLoading.tsx
import React from "react";
import { Skeleton } from "../ui/Skeleton";

function PaneLoading() {
  return (
    <div className="lc-section" style={{ padding: "24px" }}>
      <Skeleton height={24} width="40%" />
      <div style={{ marginTop: "16px" }}>
        <Skeleton lines={4} />
      </div>
    </div>
  );
}

export default PaneLoading;
