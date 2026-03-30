// admin/components/DataTable.tsx — Generic data table with sorting and pagination
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { Spinner } from "../../components/ui/Spinner";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "./EmptyState";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
}

interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

interface SortingConfig {
  sortBy: string | undefined;
  sortDir: "asc" | "desc";
  onSort: (field: string) => void;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  pagination: PaginationConfig;
  sorting?: SortingConfig;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  keyExtractor?: (item: T) => string;
}

/** Access nested object properties via dot notation (e.g. "profile.nickname") */
function getNestedValue(obj: unknown, path: string): unknown {
  return path.split(".").reduce((acc: unknown, key: string) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function SortIcon({
  field,
  sorting,
}: {
  field: string;
  sorting?: SortingConfig;
}) {
  if (!sorting) return null;

  if (sorting.sortBy !== field) {
    return (
      <span className="admin-table__sort-icon">
        <ChevronsUpDown size={14} />
      </span>
    );
  }

  return (
    <span className="admin-table__sort-icon">
      {sorting.sortDir === "asc" ? (
        <ChevronUp size={14} />
      ) : (
        <ChevronDown size={14} />
      )}
    </span>
  );
}

export function DataTable<T>({
  data,
  columns,
  pagination,
  sorting,
  loading = false,
  emptyMessage = "Veri bulunamadi",
  onRowClick,
  keyExtractor,
}: DataTableProps<T>) {
  const { page, pageSize, total, onPageChange } = pagination;
  const totalPages = Math.ceil(total / pageSize);

  if (loading) {
    return (
      <div className="admin-table-wrapper">
        <div className="admin-table__loading">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="admin-table-wrapper">
        <EmptyState message={emptyMessage} />
      </div>
    );
  }

  return (
    <div className="admin-table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((col) => {
              const isSortable = col.sortable && sorting;
              return (
                <th
                  key={col.key}
                  className={isSortable ? "admin-table__th--sortable" : ""}
                  onClick={
                    isSortable ? () => sorting.onSort(col.key) : undefined
                  }
                >
                  {col.label}
                  {isSortable && (
                    <SortIcon field={col.key} sorting={sorting} />
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => {
            const key = keyExtractor
              ? keyExtractor(item)
              : String(
                  (item as Record<string, unknown>)?.id ?? index
                );

            return (
              <tr
                key={key}
                className={onRowClick ? "admin-table__row--clickable" : ""}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render
                      ? col.render(item)
                      : String(getNestedValue(item, col.key) ?? "")}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="admin-table__pagination">
          <span className="admin-table__pagination-info">
            Sayfa {page} / {totalPages} (Toplam: {total})
          </span>
          <div className="admin-table__pagination-controls">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Onceki
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Sonraki
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
