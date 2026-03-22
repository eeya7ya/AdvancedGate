import { neon } from "@neondatabase/serverless";
import type { UserStats, EnrolledCourse, UserProfile } from "@/types";

const sql = neon(process.env.DATABASE_URL!, { fullResults: true });

export { sql };

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
      user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      plan_json  JSONB NOT NULL,
      email_reminders_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      reminder_email TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

export async function getUserRoadmap(userId: string): Promise<{ planJson: unknown; emailRemindersEnabled: boolean; reminderEmail: string | null } | null> {
  try {
    const { rows } = await sql`
      SELECT plan_json AS "planJson",
             email_reminders_enabled AS "emailRemindersEnabled",
             reminder_email AS "reminderEmail"
      FROM user_roadmap
      WHERE user_id = ${userId}
    `;
    if (!rows[0]) return null;
    return rows[0] as { planJson: unknown; emailRemindersEnabled: boolean; reminderEmail: string | null };
  } catch {
    return null;
  }
}

export async function upsertUserRoadmap(
  userId: string,
  planJson: unknown,
): Promise<boolean> {
  try {
    await sql`
      INSERT INTO user_roadmap (user_id, plan_json, updated_at)
      VALUES (${userId}, ${JSON.stringify(planJson)}, NOW())
      ON CONFLICT (user_id) DO UPDATE
        SET plan_json  = EXCLUDED.plan_json,
            updated_at = NOW()
    `;
    return true;
  } catch {
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
