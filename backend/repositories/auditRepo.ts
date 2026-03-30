import path from "path";
import { BaseRepository } from "./baseRepository";
import type { AuditEntry, PaginationParams, PaginatedResponse } from "../types/admin";

const DATA_PATH = path.join(process.cwd(), "backend", "data", "audit-log.json");

class AuditRepository extends BaseRepository<AuditEntry> {
  constructor() {
    super(DATA_PATH);
  }

  async findPaginated(
    params: PaginationParams & {
      userId?: string;
      action?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<PaginatedResponse<AuditEntry>> {
    let items = await this.findAll();

    // Filter by userId
    if (params.userId) {
      items = items.filter((e) => e.userId === params.userId);
    }

    // Filter by action
    if (params.action) {
      items = items.filter((e) => e.action === params.action);
    }

    // Filter by date range
    if (params.startDate) {
      const start = new Date(params.startDate).getTime();
      items = items.filter((e) => new Date(e.timestamp).getTime() >= start);
    }
    if (params.endDate) {
      const end = new Date(params.endDate).getTime();
      items = items.filter((e) => new Date(e.timestamp).getTime() <= end);
    }

    // Search in action/resource fields
    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (e) =>
          e.action.toLowerCase().includes(q) ||
          e.resource.toLowerCase().includes(q)
      );
    }

    // Sort newest first by default
    const sortDir = params.sortDir || "desc";
    const sortBy = params.sortBy || "timestamp";
    items.sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sortBy];
      const bVal = (b as unknown as Record<string, unknown>)[sortBy];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return 0;
    });

    const total = items.length;
    const page = params.page || 1;
    const limit = params.limit || 20;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paged = items.slice(start, start + limit);

    return { items: paged, total, page, limit, totalPages };
  }
}

export const auditRepo = new AuditRepository();
