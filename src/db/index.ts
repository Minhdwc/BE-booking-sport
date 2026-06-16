import 'dotenv/config';
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});
const db = drizzle({ client: pool });

const connectDB = async () => {
  try {
    await pool.connect();
    console.log("Connected to database");
    return db;
  } catch (error) {
    console.error("Error connecting to database:", error);
    process.exit(1);
  }
}

export { db, connectDB };
