const { Client } = require('pg');

const connectionString = "postgresql://postgres.ijoaqbqbcsxkzxzrvjdh:haydarerbas@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres";

async function cleanDB() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log("Ultra Deep Cleaning DB...");

    const queryFKs = `
        SELECT
            conname AS constraint_name,
            conrelid::regclass AS table_name,
            confrelid::regclass AS foreign_table_name
        FROM
            pg_constraint
        WHERE
            contype = 'f'
            AND confrelid::regclass::text LIKE 'auth.%';
    `;

    const res = await client.query(queryFKs);
    console.log(`Found ${res.rows.length} constraints pointing to auth.`);

    for (let row of res.rows) {
      const dropQ = `ALTER TABLE ${row.table_name} DROP CONSTRAINT IF EXISTS "${row.constraint_name}" CASCADE;`;
      try {
        await client.query(dropQ);
        console.log(`Dropped: ${row.constraint_name} from ${row.table_name}`);
      } catch (e) {
        console.warn(`Failed drop ${row.constraint_name}:`, e.message);
      }
    }

    console.log("Cleanup finish. Trying Prisma...");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

cleanDB();
