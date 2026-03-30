import path from "path";
import { BaseRepository } from "./baseRepository";
import { generateId } from "../utils/idGenerator";
import type { Role } from "../types/admin";
import { DEFAULT_ROLES } from "../types/admin";

const DATA_PATH = path.join(process.cwd(), "backend", "data", "roles.json");

// Build seed data with generated IDs
const seedRoles: Role[] = DEFAULT_ROLES.map((r) => ({
  ...r,
  id: generateId("role"),
}));

class RoleRepository extends BaseRepository<Role> {
  constructor() {
    super(DATA_PATH, seedRoles);
  }

  async findByName(name: string): Promise<Role | null> {
    return this.findOneBy((r) => r.name === name);
  }
}

export const roleRepo = new RoleRepository();
