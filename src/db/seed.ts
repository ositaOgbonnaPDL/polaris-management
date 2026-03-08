import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import bcrypt from "bcryptjs";
import path from "path";

const sqlite = new Database(
  path.join(process.cwd(), "data", "polaris_management.db"),
);
const db = drizzle(sqlite, { schema });

async function seed() {
  console.log("Seeding database...");

  // Create a default department
  const [dept] = await db
    .insert(schema.departments)
    .values({ name: "Administration" })
    .returning();

  console.log("Created department:", dept.name);

  // Create super admin
  const passwordHash = await bcrypt.hash("Welcom@123", 12);

  const [superAdmin] = await db
    .insert(schema.users)
    .values({
      name: "Super Admin",
      email: "support@polarisdigitech.net",
      passwordHash,
      role: "super_admin",
      departmentId: dept.id,
      mustChangePassword: true, // force password change on first login
    })
    .returning();

  console.log("Created super admin:", superAdmin.email);
  console.log("Temporary password: Welcom@123");
  console.log("They will be forced to change this on first login.");
  console.log("\nSeeding complete.");
}

seed().catch(console.error);
