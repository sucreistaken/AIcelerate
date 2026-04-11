interface Props {
  sessionName: string;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  showStarredOnly: boolean;
  setShowStarredOnly: (v: boolean) => void;
  exportToMarkdown: () => void;
  clearCurrentChat: () => void;
}

export default function DeepDiveHeader({
  sessionName,
  sidebarOpen,
  toggleSidebar,
  showStarredOnly,
  setShowStarredOnly,
  exportToMarkdown,
  clearCurrentChat,
}: Props) {
  return (
    <header className="dd__header">
      <div className="dd__header-left">
        <div className="dd__header-logo">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        </div>
        <span className="dd__header-title">{sessionName}</span>
      </div>

      <div className="dd__header-actions">
        <button
          className={`dd__hdr-btn${showStarredOnly ? " dd__hdr-btn--active" : ""}`}
          onClick={() => setShowStarredOnly(!showStarredOnly)}
          title={showStarredOnly ? "Tum mesajlari goster" : "Yalnizca kaydedilenler"}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill={showStarredOnly ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </button>
        <button className="dd__hdr-btn" onClick={exportToMarkdown} title="Export">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        <button className="dd__hdr-btn" onClick={clearCurrentChat} title="Clear chat">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
        <button
          className={`dd__hdr-btn dd__hdr-btn--sidebar${sidebarOpen ? " dd__hdr-btn--active" : ""}`}
          onClick={toggleSidebar}
          title={sidebarOpen ? "Hide sessions" : "Show sessions"}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
        </button>
      </div>
    </header>
  );
}
