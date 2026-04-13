import { MongoRepository } from "./mongoRepository";
import { AuditLogModel } from "../models/AuditLog";
import type { AuditEntry, PaginationParams, PaginatedResponse } from "../types/admin";
import type { IRepository } from "./IRepository";

class AuditRepository extends MongoRepository<AuditEntry> {
  constructor() {
    super(AuditLogModel);
  }

  /**
   * Server-side paginated, filtered, sorted audit log query.
   * All filtering/sorting/pagination is pushed to MongoDB.
   */
  async findPaginated(
    params: PaginationParams & {
      userId?: string;
      action?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<PaginatedResponse<AuditEntry>> {
    const filter: Record<string, unknown> = {};

    if (params.userId) filter.userId = params.userId;
    if (params.action) filter.action = params.action;

    // Date range filtering on timestamp field
    if (params.startDate || params.endDate) {
      const ts: Record<string, string> = {};
      if (params.startDate) ts.$gte = params.startDate;
      if (params.endDate) ts.$lte = params.endDate;
      filter.timestamp = ts;
    }

    // Text search on action and resource
    if (params.search) {
      const regex = { $regex: params.search, $options: "i" };
      filter.$or = [{ action: regex }, { resource: regex }];
    }

    const sortBy = params.sortBy || "timestamp";
    const sortDir = params.sortDir === "asc" ? 1 : -1;
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      AuditLogModel.find(filter)
        .sort({ [sortBy]: sortDir })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLogModel.countDocuments(filter),
    ]);

    const items = docs.map((d) => this.toEntity(d as unknown as Record<string, unknown>));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export const auditRepo: IRepository<AuditEntry> & {
  findPaginated: AuditRepository["findPaginated"];
} = new AuditRepository();
