import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Load environment variables from .env.local and set them in process.env
const envVars = readFileSync(join(ROOT, ".env.local"), "utf8")
  .split("\n")
  .filter((l) => l.includes("=") && !l.trim().startsWith("#"));

envVars.forEach((l) => {
  const key = l.slice(0, l.indexOf("=")).trim();
  const value = l.slice(l.indexOf("=") + 1).trim();
  process.env[key] = value;
});

// Import sql after setting environment variables
const { sql } = await import("@vercel/postgres");

if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
  console.error("✗ Database connection string not found in .env.local");
  process.exit(1);
}

async function main() {
  try {
    console.log("Checking if faqs table exists...");
    
    // Check if table already exists
    const { rows: existing } = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'faqs'
      );
    `;
    
    if (existing[0].exists) {
      console.log("✓ faqs table already exists");
      
      // Add updated_at column if it doesn't exist
      const { rows: columns } = await sql`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'faqs' AND column_name = 'updated_at'
      `;
      
      if (columns.length === 0) {
        console.log("Adding updated_at column...");
        await sql`ALTER TABLE faqs ADD COLUMN updated_at TIMESTAMP DEFAULT NOW()`;
        console.log("✓ updated_at column added");
      }
      
      // Add sample FAQs if table is empty
      const { rows: countResult } = await sql`SELECT COUNT(*) FROM faqs`;
      const count = parseInt(countResult[0].count, 10);
      
      if (count === 0) {
        console.log("Adding sample FAQs...");
        await sql`
          INSERT INTO faqs (question, answer) VALUES 
          ('What services does Yazkap Properties offer?', 'We offer comprehensive property management services including tenant screening, rent collection, maintenance coordination, and financial reporting for property owners and tenants alike.'),
          ('How do I pay my rent online?', 'Tenants can log in to their dashboard to view and pay rent securely using credit card, bank transfer, or other supported payment methods. All transactions are recorded and available in your transaction history.'),
          ('What areas do you serve?', 'We currently manage properties across the UAE, with a primary focus on Dubai, Abu Dhabi, and Sharjah. We are expanding to other regions soon.'),
          ('How do I report a maintenance issue?', 'Tenants can submit maintenance requests directly through their dashboard, upload photos, and track the progress of their request until completion. Our maintenance team responds within 24 hours for urgent issues.');
        `;
        console.log("✓ Sample FAQs added");
      } else {
        console.log(`✓ faqs table already has ${count} entries`);
      }
      
      process.exit(0);
    }

    // Create faqs table with all required columns
    console.log("Creating faqs table...");
    await sql`
      CREATE TABLE faqs (
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    // Add sample FAQs
    console.log("Adding sample FAQs...");
    await sql`
      INSERT INTO faqs (question, answer) VALUES 
      ('What services does Yazkap Properties offer?', 'We offer comprehensive property management services including tenant screening, rent collection, maintenance coordination, and financial reporting for property owners and tenants alike.'),
      ('How do I pay my rent online?', 'Tenants can log in to their dashboard to view and pay rent securely using credit card, bank transfer, or other supported payment methods. All transactions are recorded and available in your transaction history.'),
      ('What areas do you serve?', 'We currently manage properties across the UAE, with a primary focus on Dubai, Abu Dhabi, and Sharjah. We are expanding to other regions soon.'),
      ('How do I report a maintenance issue?', 'Tenants can submit maintenance requests directly through their dashboard, upload photos, and track the progress of their request until completion. Our maintenance team responds within 24 hours for urgent issues.');
    `;
    
    console.log("✓ faqs table created successfully with sample data");
    process.exit(0);
    
  } catch (error) {
    console.error("✗ Error:", error);
    process.exit(1);
  }
}

main();