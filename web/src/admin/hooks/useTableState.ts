// admin/hooks/useTableState.ts — Table state management hook
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type { TableParams } from "../types";

interface UseTableStateOptions {
  defaultLimit?: number;
  defaultSortBy?: string;
  defaultSortDir?: "asc" | "desc";
}

export function useTableState(options: UseTableStateOptions = {}) {
  const {
    defaultLimit = 20,
    defaultSortBy,
    defaultSortDir = "asc",
  } = options;

  const [page, setPageState] = useState(1);
  const [limit] = useState(defaultLimit);
  const [sortBy, setSortBy] = useState<string | undefined>(defaultSortBy);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultSortDir);
  const [search, setSearchState] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounce search — 300ms delay before updating params
  useEffect(() => {
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPageState(1);
    }, 300);
    return () => clearTimeout(debounceTimer.current);
  }, [search]);

  const setPage = useCallback((p: number) => {
    setPageState(p);
  }, []);

  const setSort = useCallback(
    (field: string) => {
      if (sortBy === field) {
        setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(field);
        setSortDir("asc");
      }
      // Reset to first page on sort change
      setPageState(1);
    },
    [sortBy]
  );

  const setSearch = useCallback((value: string) => {
    setSearchState(value);
  }, []);

  const resetFilters = useCallback(() => {
    setPageState(1);
    setSortBy(defaultSortBy);
    setSortDir(defaultSortDir);
    setSearchState("");
  }, [defaultSortBy, defaultSortDir]);

  const params: TableParams = useMemo(
    () => ({
      page,
      limit,
      sortBy,
      sortDir,
      search: debouncedSearch || undefined,
    }),
    [page, limit, sortBy, sortDir, debouncedSearch]
  );

  return {
    params,
    page,
    limit,
    sortBy,
    sortDir,
    search,
    setPage,
    setSort,
    setSearch,
    resetFilters,
  };
}
