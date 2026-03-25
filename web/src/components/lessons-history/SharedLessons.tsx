import toast from "react-hot-toast";
import type { SharedBundle } from "../../types";
import { sharesApi } from "../../services/api";

interface Props {
  shares: SharedBundle[];
  setShares: (fn: (s: SharedBundle[]) => SharedBundle[]) => void;
  formatDate: (d?: string, locale?: string) => string;
}

export default function SharedLessons({ shares, setShares, formatDate }: Props) {
  if (shares.length === 0) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <div className="shared-section-title">
        Shared Lessons ({shares.length})
      </div>
      <div className="grid-gap-10">
        {shares.map((share) => (
          <div key={share.shareId} className="shared-lesson-card">
            <div className="shared-lesson-header">
              <span className="shared-lesson-title">{share.bundle.title}</span>
              <span className="status-badge status-badge--info">
                {share.accessCount} views
              </span>
            </div>
            <div className="shared-lesson-meta">
              <span>{formatDate(share.createdAt)}</span>
              <span>Expires: {formatDate(share.expiresAt)}</span>
            </div>
            <div className="shared-lesson-actions">
              <button
                className="btn-small"
                onClick={() => {
                  const url = `${window.location.origin}?share=${share.shareId}`;
                  navigator.clipboard.writeText(url).then(() => toast.success("Link copied!"));
                }}
              >
                Copy Link
              </button>
              <button
                className="fc-delete-btn"
                onClick={async () => {
                  await sharesApi.delete(share.shareId);
                  setShares((s) => s.filter((sh) => sh.shareId !== share.shareId));
                  toast.success("Share deleted");
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
