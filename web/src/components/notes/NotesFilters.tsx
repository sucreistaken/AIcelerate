interface Props {
    notesCount: number;
    searchInput: string;
    setSearchInput: (v: string) => void;
    allTags: string[];
    selectedTags: string[];
    setSelectedTags: (v: string[]) => void;
    toggleTagFilter: (tag: string) => void;
    filteredCount: number;
}

export default function NotesFilters({
    notesCount, searchInput, setSearchInput,
    allTags, selectedTags, setSelectedTags, toggleTagFilter,
    filteredCount,
}: Props) {
    return (
        <>
            {notesCount > 0 && (
                <div className="nt-search">
                    <svg className="nt-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input
                        className="nt-search-input"
                        placeholder="Search notes..."
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                    />
                </div>
            )}

            {allTags.length > 0 && (
                <div className="nt-tag-filters">
                    {allTags.map(tag => (
                        <button
                            key={tag}
                            className={`nt-tag-filter${selectedTags.includes(tag) ? ' nt-tag-filter--active' : ''}`}
                            onClick={() => toggleTagFilter(tag)}
                        >
                            #{tag}
                        </button>
                    ))}
                    {selectedTags.length > 0 && (
                        <button className="nt-tag-filter nt-tag-filter--clear" onClick={() => setSelectedTags([])}>
                            Clear
                        </button>
                    )}
                    {(selectedTags.length > 0 || searchInput.trim()) && (
                        <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 4 }}>
                            {filteredCount} sonuç
                        </span>
                    )}
                </div>
            )}
        </>
    );
}
