import { FILTER_OPTIONS, type FilterCategory } from "./constants";

interface Props {
  search: string;
  filter: FilterCategory;
  onSearchChange: (val: string) => void;
  onFilterChange: (val: FilterCategory) => void;
}

export default function NotesToolbar({ search, filter, onSearchChange, onFilterChange }: Props) {
  return (
    <div className="sh-notes__toolbar">
      <div className="sh-notes__search">
        <svg className="sh-notes__search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          className="sh-notes__search-input"
          type="text"
          placeholder="Notlarda ara..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {search && (
          <button
            className="sh-notes__search-clear"
            onClick={() => onSearchChange("")}
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      <div className="sh-notes__filters">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`sh-notes__filter sh-notes__filter--${opt.value}${filter === opt.value ? " sh-notes__filter--active" : ""}`}
            onClick={() => onFilterChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
