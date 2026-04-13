import { MongoRepository } from "./mongoRepository";
import { AdminRoleModel } from "../models/AdminRole";
import { generateId } from "../utils/idGenerator";
import type { Role } from "../types/admin";
import { DEFAULT_ROLES } from "../types/admin";
import type { IRepository } from "./IRepository";
import { logger } from "../utils/logger";

class RoleRepository extends MongoRepository<Role> {
  constructor() {
    super(AdminRoleModel);
  }

  async findByName(name: string): Promise<Role | null> {
    return this.findOneBy({ name });
  }

  /**
   * Seed default roles (admin, moderator, viewer) if collection is empty.
   * Idempotent and safe for concurrent startup (ignores duplicate key errors).
   */
  async seedDefaults(): Promise<void> {
    const count = await this.count();
    if (count > 0) return;

    const roles: Role[] = DEFAULT_ROLES.map((r) => ({
      ...r,
      id: generateId("role"),
    }));

    let seeded = 0;
    for (const role of roles) {
      try {
        await this.create(role);
        seeded++;
      } catch (err) {
        // E11000 duplicate key — another instance already seeded this role
        if ((err as { code?: number }).code === 11000) continue;
        throw err;
      }
    }
    if (seeded > 0) logger.info(`Seeded ${seeded} default roles`);
  }
}

export const roleRepo: IRepository<Role> & { findByName(name: string): Promise<Role | null>; seedDefaults(): Promise<void> } = new RoleRepository();
