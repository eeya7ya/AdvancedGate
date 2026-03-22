import { neon } from "@neondatabase/serverless";
import type { UserStats, EnrolledCourse, UserProfile } from "@/types";

const sql = neon(process.env.DATABASE_URL!, { fullResults: true });

export { sql };

// Ensure tables exist once per cold start — awaitable, deduplicated
let tablesPromise: Promise<void> | null = null;
export function ensureTables(): Promise<void> {
  if (!tablesPromise) {
    tablesPromise = createTables().catch((err) => {
      console.error("[db] ensureTables failed:", err);
      tablesPromise = null; // allow retry on next request
    });
  }
  return tablesPromise;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

export async function createTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      name          TEXT,
      email         TEXT UNIQUE NOT NULL,
      image         TEXT,
      job_title     TEXT,
      organization  TEXT,
      location      TEXT,
      bio           TEXT,
      phone         TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS user_stats (
      user_id          TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      level            INTEGER NOT NULL DEFAULT 1,
      xp               INTEGER NOT NULL DEFAULT 0,
      xp_to_next_level INTEGER NOT NULL DEFAULT 500,
      streak           INTEGER NOT NULL DEFAULT 0,
      rank             TEXT NOT NULL DEFAULT 'Apprentice'
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
    CREATE TABLE IF NOT EXISTS user_achievements (
      id             SERIAL PRIMARY KEY,
      user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      achievement_id TEXT NOT NULL,
      unlocked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, achievement_id)
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS user_roadmap (
      user_id    TEXT PRIMARY KEY,
      plan_json  JSONB NOT NULL,
      email_reminders_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      reminder_email TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // Drop the FK constraint if it exists from a previous schema version.
  // The constraint caused silent save failures when the session user ID
  // didn't match the users table (e.g. ID mismatch or fresh DB scenario).
  await sql`
    ALTER TABLE user_roadmap
    DROP CONSTRAINT IF EXISTS user_roadmap_user_id_fkey;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS visitor_logs (
      id          SERIAL PRIMARY KEY,
      user_id     TEXT,
      page        TEXT NOT NULL,
      ip          TEXT,
      user_agent  TEXT,
      referrer    TEXT,
      visited_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getUserStats(userId: string): Promise<UserStats | null> {
  try {
    const { rows } = await sql`
      SELECT
        s.level,
        s.xp,
        s.xp_to_next_level AS "xpToNextLevel",
        s.streak,
        s.rank,
        COUNT(ec.id)::int                                             AS "totalCourses",
        COUNT(ec.id) FILTER (WHERE ec.progress = 100)::int           AS "completedCourses"
      FROM user_stats s
      LEFT JOIN enrolled_courses ec ON ec.user_id = s.user_id
      WHERE s.user_id = ${userId}
      GROUP BY s.level, s.xp, s.xp_to_next_level, s.streak, s.rank
    `;
    if (!rows[0]) return null;
    return rows[0] as UserStats;
  } catch {
    return null;
  }
}

export async function getEnrolledCourses(userId: string): Promise<EnrolledCourse[]> {
  try {
    const { rows } = await sql`
      SELECT
        course_id   AS "courseId",
        subject_id  AS "subjectId",
        progress,
        completed_lessons AS "completedLessons",
        enrolled_at  AS "enrolledAt",
        last_accessed AS "lastAccessed"
      FROM enrolled_courses
      WHERE user_id = ${userId}
      ORDER BY last_accessed DESC
    `;
    return rows as EnrolledCourse[];
  } catch {
    return [];
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { rows } = await sql`
      SELECT
        id, name, email, image,
        job_title     AS "jobTitle",
        organization,
        location,
        bio,
        phone
      FROM users
      WHERE id = ${userId}
    `;
    if (!rows[0]) return null;
    return rows[0] as UserProfile;
  } catch {
    return null;
  }
}

export async function getUserRoadmap(userId: string): Promise<{ planJson: unknown; emailRemindersEnabled: boolean; reminderEmail: string | null; createdAt: string | null } | null> {
  try {
    await ensureTables();
    const { rows } = await sql`
      SELECT plan_json AS "planJson",
             email_reminders_enabled AS "emailRemindersEnabled",
             reminder_email AS "reminderEmail",
             created_at AS "createdAt"
      FROM user_roadmap
      WHERE user_id = ${userId}
    `;
    if (!rows[0]) return null;
    return rows[0] as { planJson: unknown; emailRemindersEnabled: boolean; reminderEmail: string | null; createdAt: string | null };
  } catch (err) {
    console.error("[db] getUserRoadmap error:", err);
    return null;
  }
}

export async function upsertUserRoadmap(
  userId: string,
  planJson: unknown,
): Promise<boolean> {
  try {
    await ensureTables();
    await sql`
      INSERT INTO user_roadmap (user_id, plan_json, updated_at)
      VALUES (${userId}, ${JSON.stringify(planJson)}, NOW())
      ON CONFLICT (user_id) DO UPDATE
        SET plan_json  = EXCLUDED.plan_json,
            updated_at = NOW()
    `;
    return true;
  } catch (err) {
    console.error("[db] upsertUserRoadmap error:", err);
    return false;
  }
}

export async function updateRoadmapEmailSettings(
  userId: string,
  enabled: boolean,
  email: string | null,
): Promise<boolean> {
  try {
    await sql`
      UPDATE user_roadmap
      SET email_reminders_enabled = ${enabled},
          reminder_email = ${email},
          updated_at = NOW()
      WHERE user_id = ${userId}
    `;
    return true;
  } catch {
    return false;
  }
}

export async function logVisit(data: {
  userId?: string;
  page: string;
  ip?: string;
  userAgent?: string;
  referrer?: string;
}): Promise<void> {
  try {
    await ensureTables();
    await sql`
      INSERT INTO visitor_logs (user_id, page, ip, user_agent, referrer)
      VALUES (
        ${data.userId ?? null},
        ${data.page},
        ${data.ip ?? null},
        ${data.userAgent ?? null},
        ${data.referrer ?? null}
      )
    `;
  } catch {
    // non-fatal — never block the request for a log write
  }
}

export async function getConsoleStats(): Promise<{
  totalVisits: number;
  uniqueVisitors: number;
  totalUsers: number;
  totalPlans: number;
  recentVisits: Array<{ id: number; userId: string | null; page: string; ip: string | null; userAgent: string | null; visitedAt: string }>;
  topPages: Array<{ page: string; count: number }>;
}> {
  try {
    await ensureTables();
    const [{ rows: visits }, { rows: users }, { rows: plans }, { rows: recent }, { rows: topPages }] =
      await Promise.all([
        sql`SELECT COUNT(*)::int AS total, COUNT(DISTINCT COALESCE(user_id, ip, user_agent))::int AS unique_visitors FROM visitor_logs`,
        sql`SELECT COUNT(*)::int AS total FROM users`,
        sql`SELECT COUNT(*)::int AS total FROM user_roadmap`,
        sql`SELECT id, user_id AS "userId", page, ip, user_agent AS "userAgent", visited_at AS "visitedAt" FROM visitor_logs ORDER BY visited_at DESC LIMIT 50`,
        sql`SELECT page, COUNT(*)::int AS count FROM visitor_logs GROUP BY page ORDER BY count DESC LIMIT 10`,
      ]);

    return {
      totalVisits: (visits[0] as { total: number })?.total ?? 0,
      uniqueVisitors: (visits[0] as { unique_visitors: number })?.unique_visitors ?? 0,
      totalUsers: (users[0] as { total: number })?.total ?? 0,
      totalPlans: (plans[0] as { total: number })?.total ?? 0,
      recentVisits: recent as Array<{ id: number; userId: string | null; page: string; ip: string | null; userAgent: string | null; visitedAt: string }>,
      topPages: topPages as Array<{ page: string; count: number }>,
    };
  } catch {
    return { totalVisits: 0, uniqueVisitors: 0, totalUsers: 0, totalPlans: 0, recentVisits: [], topPages: [] };
  }
}

export async function deleteUserRoadmap(userId: string): Promise<boolean> {
  try {
    await sql`DELETE FROM user_roadmap WHERE user_id = ${userId}`;
    return true;
  } catch {
    return false;
  }
}

export async function updateUserProfile(
  userId: string,
  data: Partial<Pick<UserProfile, "name" | "jobTitle" | "organization" | "location" | "bio" | "phone">>
): Promise<boolean> {
  try {
    await sql`
      UPDATE users SET
        name         = COALESCE(${data.name ?? null}, name),
        job_title    = ${data.jobTitle ?? null},
        organization = ${data.organization ?? null},
        location     = ${data.location ?? null},
        bio          = ${data.bio ?? null},
        phone        = ${data.phone ?? null}
      WHERE id = ${userId}
    `;
    return true;
  } catch {
    return false;
  }
}
