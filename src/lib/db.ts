import { neon } from "@neondatabase/serverless";
import type {
  UserStats,
  EnrolledCourse,
  UserProfile,
  Quotation,
  QuotationLineItem,
  QuotationStatus,
  Client,
} from "@/types";

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

  await sql`
    CREATE TABLE IF NOT EXISTS user_api_budget (
      user_id  TEXT PRIMARY KEY,
      spent    NUMERIC(10,6) NOT NULL DEFAULT 0
    );
  `;

  // ─── Quotations ───────────────────────────────────────────────────────────
  // `clients` is a simple directory of customers a quotation can be assigned
  // to. Kept lightweight on purpose — additional fields can be layered in
  // later without migration pain.
  await sql`
    CREATE TABLE IF NOT EXISTS clients (
      id         SERIAL PRIMARY KEY,
      name       TEXT NOT NULL,
      company    TEXT,
      email      TEXT,
      phone      TEXT,
      address    TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS quotations (
      id                         SERIAL PRIMARY KEY,
      status                     TEXT NOT NULL DEFAULT 'waiting_to_assign',
      source                     TEXT NOT NULL DEFAULT 'manual',
      source_project_id          INTEGER,
      source_project_name        TEXT,
      source_manufacturer_name   TEXT,
      client_id                  INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      client_name_snapshot       TEXT,
      currency                   TEXT NOT NULL DEFAULT 'JOD',
      notes                      TEXT,
      responsible_user_id        TEXT,
      created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      assigned_at                TIMESTAMPTZ
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS quotation_line_items (
      id               SERIAL PRIMARY KEY,
      quotation_id     INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
      position         INTEGER NOT NULL,
      item_model       TEXT NOT NULL DEFAULT '',
      quantity         INTEGER NOT NULL DEFAULT 1,
      price_after_tax  NUMERIC(14,4) NOT NULL DEFAULT 0,
      currency         TEXT NOT NULL DEFAULT 'JOD',
      UNIQUE (quotation_id, position)
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

// ─── Per-user API Budget ─────────────────────────────────────────────────────
// New users start with $0 spent automatically (no row = fresh start).
// Budget only resets when the user explicitly calls resetUserBudget().

export async function getUserApiSpent(userId: string): Promise<number> {
  try {
    await ensureTables();
    const { rows } = await sql`
      SELECT spent FROM user_api_budget WHERE user_id = ${userId}
    `;
    const row = rows[0] as { spent: string } | undefined;
    return row ? parseFloat(row.spent) : 0;
  } catch {
    return 0;
  }
}

export async function addUserApiCost(userId: string, amount: number): Promise<void> {
  try {
    await sql`
      INSERT INTO user_api_budget (user_id, spent)
      VALUES (${userId}, ${amount})
      ON CONFLICT (user_id) DO UPDATE
        SET spent = user_api_budget.spent + EXCLUDED.spent
    `;
  } catch {
    // non-fatal
  }
}

export async function resetUserBudget(userId: string): Promise<void> {
  try {
    await sql`
      INSERT INTO user_api_budget (user_id, spent)
      VALUES (${userId}, 0)
      ON CONFLICT (user_id) DO UPDATE SET spent = 0
    `;
  } catch {
    // non-fatal
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

export async function deleteUserCourseLinkCache(userId: string): Promise<void> {
  try {
    await sql`DELETE FROM course_link_cache WHERE cache_key LIKE ${userId + "|%"}`;
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

// ─── Quotations & Clients ───────────────────────────────────────────────────

export interface QuotationIntakeInput {
  source: string;
  sourceProjectId?: number | null;
  sourceProjectName?: string | null;
  sourceManufacturerName?: string | null;
  currency?: string;
  notes?: string | null;
  lineItems: Array<{
    itemModel: string;
    quantity: number;
    priceAfterTax: number;
  }>;
}

/**
 * Inserts a new quotation (plus its line items) in the "waiting_to_assign"
 * state. Intended to be called from the Pricing-Sheet integration endpoint
 * — no client, no responsible user, just the priced models and quantities.
 */
export async function createQuotationFromIntake(
  input: QuotationIntakeInput,
): Promise<number | null> {
  try {
    await ensureTables();
    const currency = input.currency ?? "JOD";
    const { rows: inserted } = await sql`
      INSERT INTO quotations (
        status, source, source_project_id, source_project_name,
        source_manufacturer_name, currency, notes
      )
      VALUES (
        'waiting_to_assign',
        ${input.source},
        ${input.sourceProjectId ?? null},
        ${input.sourceProjectName ?? null},
        ${input.sourceManufacturerName ?? null},
        ${currency},
        ${input.notes ?? null}
      )
      RETURNING id
    `;
    const quotationId = (inserted[0] as { id: number })?.id;
    if (!quotationId) return null;

    // Insert line items one at a time — simpler than building a VALUES
    // clause dynamically with the tagged-template client, and the payloads
    // here are small (a handful of product lines per quotation).
    let position = 0;
    for (const li of input.lineItems) {
      position += 1;
      await sql`
        INSERT INTO quotation_line_items (
          quotation_id, position, item_model, quantity,
          price_after_tax, currency
        )
        VALUES (
          ${quotationId},
          ${position},
          ${li.itemModel ?? ""},
          ${li.quantity ?? 1},
          ${li.priceAfterTax ?? 0},
          ${currency}
        )
      `;
    }
    return quotationId;
  } catch (err) {
    console.error("[db] createQuotationFromIntake error:", err);
    return null;
  }
}

export async function listQuotations(
  status?: QuotationStatus,
): Promise<Quotation[]> {
  try {
    await ensureTables();
    const { rows } = status
      ? await sql`
          SELECT q.*, COALESCE(c.name, q.client_name_snapshot) AS client_display
          FROM quotations q
          LEFT JOIN clients c ON c.id = q.client_id
          WHERE q.status = ${status}
          ORDER BY q.created_at DESC
        `
      : await sql`
          SELECT q.*, COALESCE(c.name, q.client_name_snapshot) AS client_display
          FROM quotations q
          LEFT JOIN clients c ON c.id = q.client_id
          ORDER BY q.created_at DESC
        `;

    const quotations = rows.map(mapQuotationRow);
    if (quotations.length === 0) return [];

    const ids = quotations.map((q) => q.id);
    const { rows: lineRows } = await sql`
      SELECT id, quotation_id AS "quotationId", position, item_model AS "itemModel",
             quantity, price_after_tax AS "priceAfterTax", currency
      FROM quotation_line_items
      WHERE quotation_id = ANY(${ids})
      ORDER BY quotation_id, position
    `;
    const grouped = new Map<number, QuotationLineItem[]>();
    for (const raw of lineRows) {
      const r = raw as {
        id: number; quotationId: number; position: number;
        itemModel: string; quantity: number;
        priceAfterTax: string | number; currency: string;
      };
      const item: QuotationLineItem = {
        id: r.id,
        quotationId: r.quotationId,
        position: r.position,
        itemModel: r.itemModel,
        quantity: r.quantity,
        priceAfterTax: typeof r.priceAfterTax === "string"
          ? parseFloat(r.priceAfterTax)
          : r.priceAfterTax,
        currency: r.currency,
      };
      const arr = grouped.get(r.quotationId) ?? [];
      arr.push(item);
      grouped.set(r.quotationId, arr);
    }
    return quotations.map((q) => ({
      ...q,
      lineItems: grouped.get(q.id) ?? [],
    }));
  } catch (err) {
    console.error("[db] listQuotations error:", err);
    return [];
  }
}

export async function getQuotation(id: number): Promise<Quotation | null> {
  try {
    await ensureTables();
    const { rows } = await sql`
      SELECT * FROM quotations WHERE id = ${id}
    `;
    const row = rows[0];
    if (!row) return null;
    const { rows: lineRows } = await sql`
      SELECT id, quotation_id AS "quotationId", position, item_model AS "itemModel",
             quantity, price_after_tax AS "priceAfterTax", currency
      FROM quotation_line_items
      WHERE quotation_id = ${id}
      ORDER BY position ASC
    `;
    const quotation = mapQuotationRow(row);
    quotation.lineItems = lineRows.map((raw) => {
      const r = raw as {
        id: number; quotationId: number; position: number;
        itemModel: string; quantity: number;
        priceAfterTax: string | number; currency: string;
      };
      return {
        id: r.id,
        quotationId: r.quotationId,
        position: r.position,
        itemModel: r.itemModel,
        quantity: r.quantity,
        priceAfterTax: typeof r.priceAfterTax === "string"
          ? parseFloat(r.priceAfterTax)
          : r.priceAfterTax,
        currency: r.currency,
      };
    });
    return quotation;
  } catch (err) {
    console.error("[db] getQuotation error:", err);
    return null;
  }
}

function mapQuotationRow(raw: unknown): Quotation {
  const r = raw as Record<string, unknown>;
  return {
    id: r.id as number,
    status: r.status as QuotationStatus,
    source: (r.source as string) ?? "manual",
    sourceProjectId: (r.source_project_id as number | null) ?? null,
    sourceProjectName: (r.source_project_name as string | null) ?? null,
    sourceManufacturerName: (r.source_manufacturer_name as string | null) ?? null,
    clientId: (r.client_id as number | null) ?? null,
    clientNameSnapshot: (r.client_name_snapshot as string | null) ?? null,
    currency: (r.currency as string) ?? "JOD",
    notes: (r.notes as string | null) ?? null,
    responsibleUserId: (r.responsible_user_id as string | null) ?? null,
    createdAt: String(r.created_at),
    assignedAt: r.assigned_at ? String(r.assigned_at) : null,
    lineItems: [],
  };
}

export interface AssignQuotationInput {
  clientId?: number | null;
  clientNameSnapshot?: string | null;
  responsibleUserId?: string | null;
  notes?: string | null;
  status?: QuotationStatus;
}

/**
 * Updates a quotation. When a client (or client snapshot name) is supplied
 * and the quotation is still in "waiting_to_assign", automatically transitions
 * it to "assigned" and stamps assigned_at.
 */
export async function updateQuotation(
  id: number,
  data: AssignQuotationInput,
): Promise<boolean> {
  try {
    await ensureTables();
    const current = await sql`SELECT status FROM quotations WHERE id = ${id}`;
    const currentStatus = (current.rows[0] as { status: string } | undefined)?.status;
    if (!currentStatus) return false;

    const hasClient =
      (data.clientId != null) ||
      (data.clientNameSnapshot != null && data.clientNameSnapshot.trim().length > 0);
    const autoPromote = currentStatus === "waiting_to_assign" && hasClient;
    const nextStatus = data.status ?? (autoPromote ? "assigned" : currentStatus);
    const assignedAtSql = autoPromote;

    await sql`
      UPDATE quotations SET
        client_id             = ${data.clientId ?? null},
        client_name_snapshot  = ${data.clientNameSnapshot ?? null},
        responsible_user_id   = ${data.responsibleUserId ?? null},
        notes                 = ${data.notes ?? null},
        status                = ${nextStatus},
        assigned_at           = CASE WHEN ${assignedAtSql} THEN NOW() ELSE assigned_at END
      WHERE id = ${id}
    `;
    return true;
  } catch (err) {
    console.error("[db] updateQuotation error:", err);
    return false;
  }
}

export async function deleteQuotation(id: number): Promise<boolean> {
  try {
    await sql`DELETE FROM quotations WHERE id = ${id}`;
    return true;
  } catch (err) {
    console.error("[db] deleteQuotation error:", err);
    return false;
  }
}

export async function listClients(): Promise<Client[]> {
  try {
    await ensureTables();
    const { rows } = await sql`
      SELECT id, name, company, email, phone, address,
             created_at AS "createdAt"
      FROM clients
      ORDER BY name ASC
    `;
    return rows.map((raw) => {
      const r = raw as Record<string, unknown>;
      return {
        id: r.id as number,
        name: r.name as string,
        company: (r.company as string | null) ?? null,
        email: (r.email as string | null) ?? null,
        phone: (r.phone as string | null) ?? null,
        address: (r.address as string | null) ?? null,
        createdAt: String(r.createdAt),
      };
    });
  } catch (err) {
    console.error("[db] listClients error:", err);
    return [];
  }
}

export async function createClient(data: {
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}): Promise<number | null> {
  try {
    await ensureTables();
    const { rows } = await sql`
      INSERT INTO clients (name, company, email, phone, address)
      VALUES (
        ${data.name},
        ${data.company ?? null},
        ${data.email ?? null},
        ${data.phone ?? null},
        ${data.address ?? null}
      )
      RETURNING id
    `;
    return (rows[0] as { id: number })?.id ?? null;
  } catch (err) {
    console.error("[db] createClient error:", err);
    return null;
  }
}
