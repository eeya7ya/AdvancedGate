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

  // User notes / memory for AI chat context
  await sql`
    CREATE TABLE IF NOT EXISTS user_notes (
      id         SERIAL PRIMARY KEY,
      user_id    TEXT NOT NULL,
      note       TEXT NOT NULL,
      category   TEXT NOT NULL DEFAULT 'general',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // Schedule task tracking — stores daily completion status
  await sql`
    CREATE TABLE IF NOT EXISTS schedule_tracking (
      id           SERIAL PRIMARY KEY,
      user_id      TEXT NOT NULL,
      task_date    DATE NOT NULL,
      task_key     TEXT NOT NULL,
      completed    BOOLEAN NOT NULL DEFAULT FALSE,
      completed_at TIMESTAMPTZ,
      UNIQUE (user_id, task_date, task_key)
    );
  `;

  // Email reminder logs
  await sql`
    CREATE TABLE IF NOT EXISTS email_reminder_logs (
      id         SERIAL PRIMARY KEY,
      user_id    TEXT NOT NULL,
      email_type TEXT NOT NULL,
      sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
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

  await sql`
    CREATE TABLE IF NOT EXISTS course_link_cache (
      cache_key  TEXT PRIMARY KEY,
      url        TEXT NOT NULL,
      cached_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
    await ensureTables();
    const { rows } = await sql`
      SELECT plan_json AS "planJson",
             email_reminders_enabled AS "emailRemindersEnabled",
             reminder_email AS "reminderEmail"
      FROM user_roadmap
      WHERE user_id = ${userId}
    `;
    if (!rows[0]) return null;
    return rows[0] as { planJson: unknown; emailRemindersEnabled: boolean; reminderEmail: string | null };
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

// ─── User Notes (AI Memory) ─────────────────────────────────────────────────

export async function getUserNotes(userId: string): Promise<Array<{ id: number; note: string; category: string; createdAt: string; updatedAt: string }>> {
  try {
    await ensureTables();
    const { rows } = await sql`
      SELECT id, note, category, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM user_notes
      WHERE user_id = ${userId}
      ORDER BY updated_at DESC
    `;
    return rows as Array<{ id: number; note: string; category: string; createdAt: string; updatedAt: string }>;
  } catch {
    return [];
  }
}

export async function addUserNote(userId: string, note: string, category: string = "general"): Promise<number | null> {
  try {
    await ensureTables();
    const { rows } = await sql`
      INSERT INTO user_notes (user_id, note, category)
      VALUES (${userId}, ${note}, ${category})
      RETURNING id
    `;
    return (rows[0] as { id: number })?.id ?? null;
  } catch {
    return null;
  }
}

export async function updateUserNote(userId: string, noteId: number, note: string): Promise<boolean> {
  try {
    await sql`
      UPDATE user_notes SET note = ${note}, updated_at = NOW()
      WHERE id = ${noteId} AND user_id = ${userId}
    `;
    return true;
  } catch {
    return false;
  }
}

export async function deleteUserNote(userId: string, noteId: number): Promise<boolean> {
  try {
    await sql`DELETE FROM user_notes WHERE id = ${noteId} AND user_id = ${userId}`;
    return true;
  } catch {
    return false;
  }
}

// ─── Schedule Tracking ──────────────────────────────────────────────────────

export async function getScheduleTracking(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<Array<{ taskDate: string; taskKey: string; completed: boolean; completedAt: string | null }>> {
  try {
    await ensureTables();
    const { rows } = await sql`
      SELECT
        task_date::text AS "taskDate",
        task_key AS "taskKey",
        completed,
        completed_at AS "completedAt"
      FROM schedule_tracking
      WHERE user_id = ${userId}
        AND task_date >= ${startDate}::date
        AND task_date <= ${endDate}::date
      ORDER BY task_date ASC
    `;
    return rows as Array<{ taskDate: string; taskKey: string; completed: boolean; completedAt: string | null }>;
  } catch {
    return [];
  }
}

export async function upsertScheduleTask(
  userId: string,
  taskDate: string,
  taskKey: string,
  completed: boolean,
): Promise<boolean> {
  try {
    await ensureTables();
    await sql`
      INSERT INTO schedule_tracking (user_id, task_date, task_key, completed, completed_at)
      VALUES (${userId}, ${taskDate}::date, ${taskKey}, ${completed}, ${completed ? "NOW()" : null})
      ON CONFLICT (user_id, task_date, task_key) DO UPDATE
        SET completed = EXCLUDED.completed,
            completed_at = CASE WHEN EXCLUDED.completed THEN NOW() ELSE NULL END
    `;
    return true;
  } catch {
    return false;
  }
}

// ─── Email Reminder Logs ────────────────────────────────────────────────────

export async function logEmailReminder(userId: string, emailType: string): Promise<boolean> {
  try {
    await ensureTables();
    await sql`
      INSERT INTO email_reminder_logs (user_id, email_type)
      VALUES (${userId}, ${emailType})
    `;
    return true;
  } catch {
    return false;
  }
}

export async function getLastReminderSent(userId: string, emailType: string): Promise<string | null> {
  try {
    const { rows } = await sql`
      SELECT sent_at AS "sentAt"
      FROM email_reminder_logs
      WHERE user_id = ${userId} AND email_type = ${emailType}
      ORDER BY sent_at DESC LIMIT 1
    `;
    return (rows[0] as { sentAt: string })?.sentAt ?? null;
  } catch {
    return null;
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

// ─── Course Link Cache ──────────────────────────────────────────────────────

export async function getCachedCourseLink(cacheKey: string): Promise<string | null> {
  try {
    await ensureTables();
    const { rows } = await sql`
      SELECT url FROM course_link_cache WHERE cache_key = ${cacheKey}
    `;
    return (rows[0] as { url: string })?.url ?? null;
  } catch {
    return null;
  }
}

export async function setCachedCourseLink(cacheKey: string, url: string): Promise<void> {
  try {
    await sql`
      INSERT INTO course_link_cache (cache_key, url)
      VALUES (${cacheKey}, ${url})
      ON CONFLICT (cache_key) DO UPDATE SET url = EXCLUDED.url, cached_at = NOW()
    `;
  } catch {
    // non-fatal
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
