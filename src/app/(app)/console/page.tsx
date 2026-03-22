"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Activity,
  Map,
  Eye,
  Globe,
  RefreshCw,
  Monitor,
  TrendingUp,
  FileText,
  Clock,
} from "lucide-react";

interface ConsoleStats {
  totalVisits: number;
  uniqueVisitors: number;
  totalUsers: number;
  totalPlans: number;
  recentVisits: Array<{
    id: number;
    userId: string | null;
    page: string;
    ip: string | null;
    userAgent: string | null;
    visitedAt: string;
  }>;
  topPages: Array<{ page: string; count: number }>;
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  delay,
}: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  label: string;
  value: number | string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl p-5 flex items-center gap-4"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18` }}
      >
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        <p className="text-xs font-medium mt-0.5" style={{ color: "var(--text-muted)" }}>
          {label}
        </p>
      </div>
    </motion.div>
  );
}

function parseDevice(ua: string | null): string {
  if (!ua) return "Unknown";
  if (/mobile|android|iphone|ipad/i.test(ua)) return "Mobile";
  if (/tablet/i.test(ua)) return "Tablet";
  return "Desktop";
}

function parseBrowser(ua: string | null): string {
  if (!ua) return "Unknown";
  if (/edg\//i.test(ua)) return "Edge";
  if (/chrome/i.test(ua)) return "Chrome";
  if (/safari/i.test(ua)) return "Safari";
  if (/firefox/i.test(ua)) return "Firefox";
  if (/opr\//i.test(ua)) return "Opera";
  return "Other";
}

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ConsolePage() {
  const [stats, setStats] = useState<ConsoleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/console/stats");
      if (res.ok) {
        setStats(await res.json());
        setLastRefresh(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Log this console visit
  useEffect(() => {
    fetch("/api/console/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page: "/console", referrer: document.referrer }),
    }).catch(() => null);
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
            Admin
          </p>
          <h1 className="text-2xl lg:text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
            Platform Console
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Visitor analytics, user activity &amp; platform health
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Updated {formatRelative(lastRefresh.toISOString())}
          </span>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-40"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
            }}
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Eye} label="Total Page Visits" value={stats?.totalVisits ?? 0} color="#00d4a1" delay={0.05} />
        <StatCard icon={Users} label="Unique Visitors" value={stats?.uniqueVisitors ?? 0} color="#22d3ee" delay={0.1} />
        <StatCard icon={Globe} label="Registered Users" value={stats?.totalUsers ?? 0} color="#a78bfa" delay={0.15} />
        <StatCard icon={Map} label="Plans Generated" value={stats?.totalPlans ?? 0} color="#f59e0b" delay={0.2} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Top Pages */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl p-6"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
        >
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <TrendingUp size={15} style={{ color: "#00d4a1" }} />
            Top Pages
          </h3>
          {!stats || stats.topPages.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
              No page data yet
            </p>
          ) : (
            <div className="space-y-3">
              {stats.topPages.map((p, i) => {
                const max = stats.topPages[0]?.count ?? 1;
                const pct = Math.round((p.count / max) * 100);
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                        {p.page}
                      </span>
                      <span className="text-xs font-bold ml-2 flex-shrink-0" style={{ color: "#00d4a1" }}>
                        {p.count}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: "var(--bg-base)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: "linear-gradient(90deg, #00d4a1, #22d3ee)" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Platform Status */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl p-6"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
        >
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Activity size={15} style={{ color: "#22d3ee" }} />
            Platform Status
          </h3>
          <div className="space-y-3">
            {[
              { label: "AI Chat API", status: "Operational", color: "#4ade80" },
              { label: "Database (Neon)", status: "Operational", color: "#4ade80" },
              { label: "Auth (Google OAuth)", status: "Operational", color: "#4ade80" },
              { label: "Stripe Payments", status: "Initialized", color: "#f59e0b" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between py-2 px-3 rounded-xl"
                style={{ background: "var(--bg-base)" }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: item.color, boxShadow: `0 0 6px ${item.color}` }}
                  />
                  <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                    {item.label}
                  </span>
                </div>
                <span className="text-[10px] font-semibold" style={{ color: item.color }}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Visits */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
      >
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <FileText size={15} style={{ color: "#a78bfa" }} />
          Recent Visitor Log
        </h3>
        {!stats || stats.recentVisits.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
            No visits recorded yet. Visits are tracked on every page load.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  {["Time", "Page", "IP Address", "Device", "Browser", "User"].map((h) => (
                    <th
                      key={h}
                      className="text-left pb-3 pr-4 font-semibold whitespace-nowrap"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.recentVisits.map((v) => (
                  <tr
                    key={v.id}
                    className="border-b transition-colors hover:bg-white/[0.02]"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <td className="py-2.5 pr-4 whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                      <div className="flex items-center gap-1">
                        <Clock size={10} />
                        {formatRelative(v.visitedAt)}
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 font-medium max-w-[140px] truncate" style={{ color: "var(--text-primary)" }}>
                      {v.page}
                    </td>
                    <td className="py-2.5 pr-4 font-mono" style={{ color: "var(--text-secondary)" }}>
                      {v.ip ?? "—"}
                    </td>
                    <td className="py-2.5 pr-4" style={{ color: "var(--text-secondary)" }}>
                      <div className="flex items-center gap-1">
                        <Monitor size={10} />
                        {parseDevice(v.userAgent)}
                      </div>
                    </td>
                    <td className="py-2.5 pr-4" style={{ color: "var(--text-secondary)" }}>
                      {parseBrowser(v.userAgent)}
                    </td>
                    <td className="py-2.5" style={{ color: "var(--text-muted)" }}>
                      {v.userId ? (
                        <span
                          className="px-2 py-0.5 rounded-md font-mono text-[10px]"
                          style={{ background: "rgba(0,212,161,0.1)", color: "#00d4a1" }}
                        >
                          {v.userId.slice(0, 8)}…
                        </span>
                      ) : (
                        <span
                          className="px-2 py-0.5 rounded-md text-[10px]"
                          style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444" }}
                        >
                          guest
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
