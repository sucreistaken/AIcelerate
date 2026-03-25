export interface DeviationSegment {
    index: number;
    start: string;
    end: string;
    text: string;
    slideCoverage: number;
    banterScore: number;
    status: "on_slide" | "expanded" | "off_slide" | "banter" | "side_topic" | string;
    confidence: number;
    reason: string;
}

export interface DeviationSummary {
    totalSegments: number;
    overallScore: number;
    interpretation: string;
    percent: {
        on_slide: number;
        expanded: number;
        off_slide: number;
        banter: number;
        side_topic?: number;
    };
    counts: {
        on_slide: number;
        expanded: number;
        off_slide: number;
        banter: number;
        side_topic?: number;
    };
    missedTopics: string[];
    extraTopics: string[];
    isDeckMismatch?: boolean;
    deckSimilarity?: number;
}

export interface DeviationResult {
    summary: DeviationSummary;
    segments: DeviationSegment[];
}

export interface DeviationPaneProps {
    deviation?: DeviationResult & { updatedAt?: number | string };
    loading?: boolean;
    error?: string | null;
    onGenerate?: () => void;
    onReanalyze?: () => void;
}
