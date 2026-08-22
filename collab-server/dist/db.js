import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client.js";
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL is required");
}
const adapter = new PrismaPg({ connectionString });
export const db = new PrismaClient({ adapter });
//# sourceMappingURL=db.js.map