import { t } from "../../utils/i18n";

interface Props {
    notesCount: number;
    showCreator: boolean;
    setShowCreator: (v: boolean) => void;
    pdfLoading: boolean;
    handleExportPdf: () => void;
    setShowClearConfirm: (v: boolean) => void;
}

export default function NotesHeader({
    notesCount, showCreator, setShowCreator,
    pdfLoading, handleExportPdf, setShowClearConfirm,
}: Props) {
    return (
        <div className="nt-header">
            <div className="nt-header-left">
                <h2 className="nt-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                    </svg>
                    {t("notes.myNotes")}
                    {notesCount > 0 && <span className="nt-count">{notesCount}</span>}
                </h2>
                <p className="nt-subtitle">{t("notes.subtitle")}</p>
            </div>
            <div className="nt-header-actions">
                <button className="nt-btn nt-btn--primary" onClick={() => setShowCreator(!showCreator)}>
                    {showCreator ? (
                        <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            {t("notes.cancelNote")}
                        </>
                    ) : (
                        <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                            {t("notes.newNote")}
                        </>
                    )}
                </button>
                {notesCount > 0 && (
                    <>
                        <button className="nt-btn nt-btn--secondary" onClick={handleExportPdf} disabled={pdfLoading}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            {pdfLoading ? t("notes.exporting") : "PDF"}
                        </button>
                        <button
                            className="nt-btn nt-btn--danger"
                            onClick={() => setShowClearConfirm(true)}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
