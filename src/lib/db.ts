import { sql } from "@vercel/postgres";

export { sql };

/**
 * Run this once to initialise the database schema.
 * Call via: import { createTables } from "@/lib/db"; await createTables();
 */
export async function createTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      name          TEXT,
      email         TEXT UNIQUE NOT NULL,
      image         TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS enrolled_courses (
      id                SERIAL PRIMARY KEY,
      user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id         TEXT NOT NULL,
      subject_id        TEXT NOT NULL,
      progress          INTEGER NOT NULL DEFAULT 0,
      completed_lessons INTEGER NOT NULL DEFAULT 0,
      enrolled_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_accessed     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, course_id)
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS user_stats (
      user_id         TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      level           INTEGER NOT NULL DEFAULT 1,
      xp              INTEGER NOT NULL DEFAULT 0,
      xp_to_next_level INTEGER NOT NULL DEFAULT 500,
      streak          INTEGER NOT NULL DEFAULT 0,
      rank            TEXT NOT NULL DEFAULT 'Beginner'
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS achievements (
      id          SERIAL PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      achievement_id TEXT NOT NULL,
      unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, achievement_id)
    );
  `;
}
