// Run once to create the admin account in Vercel Postgres
// Usage: POSTGRES_URL="your_connection_string" node scripts/create-admin.mjs
import { createPool } from "@vercel/postgres";
import bcrypt from "bcryptjs";

const email = process.env.ADMIN_EMAIL || "mbowaali@gmail.com";
const password = process.env.ADMIN_PASSWORD || "0702082370";

const pool = createPool({ connectionString: process.env.POSTGRES_URL });

const hash = await bcrypt.hash(password, 10);

await pool.query(
  `INSERT INTO users (email, password_hash, role, full_name, approved)
   VALUES ($1, $2, 'admin', 'Admin', true)
   ON CONFLICT (email) DO UPDATE SET password_hash = $2, role = 'admin', approved = true`,
  [email, hash]
);

console.log(`✅ Admin account created/updated for ${email}`);
await pool.end();
