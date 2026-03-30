// admin/hooks/useTableData.ts — Fetch paginated data from admin API
import { useState, useEffect, useCallback } from "react";
import { adminApi } from "../services/adminApi";
import type { PaginatedResponse, TableParams } from "../types";

interface UseTableDataResult<T> {
  data: T[];
  total: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTableData<T>(
  endpoint: string,
  params: TableParams
): UseTableDataResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await adminApi.get<PaginatedResponse<T>>(endpoint, {
          page: params.page,
          limit: params.limit,
          sortBy: params.sortBy,
          sortDir: params.sortDir,
          search: params.search,
        });

        if (!cancelled) {
          setData(result.data ?? []);
          setTotal(result.total ?? 0);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Bir hata olustu");
          setData([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [
    endpoint,
    params.page,
    params.limit,
    params.sortBy,
    params.sortDir,
    params.search,
    refreshKey,
  ]);

  return { data, total, isLoading, error, refetch };
}
