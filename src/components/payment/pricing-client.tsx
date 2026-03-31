"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Zap, Crown, Building2, Sparkles, CreditCard } from "lucide-react";
import { useLang } from "@/lib/language";

const PLAN_FEATURES = {
  free: {
    en: [
      "20 AI advisor sessions / month",
      "Basic roadmap generation",
      "Course recommendations",
      "Arabic & English support",
    ],
    ar: [
      "20 جلسة مع المستشار الذكي شهرياً",
      "إنشاء خارطة طريق أساسية",
      "توصيات الدورات",
      "دعم العربية والإنجليزية",
    ],
  },
  pro: {
    en: [
      "Unlimited AI advisor sessions",
      "Full roadmap with verified course URLs",
      "Certificate course highlighting",
      "Schedule planner & email reminders",
      "Multi-source course comparison (Free / Paid / Cert)",
      "Priority AI responses",
    ],
    ar: [
      "جلسات غير محدودة مع المستشار",
      "خارطة طريق كاملة مع روابط دورات محققة",
      "إبراز الدورات المعتمدة بشهادات",
      "مخطط الجدول الزمني وتذكيرات البريد",
      "مقارنة مصادر متعددة (مجاني / مدفوع / شهادة)",
      "ردود الذكاء الاصطناعي ذات الأولوية",
    ],
  },
  enterprise: {
    en: [
      "Everything in Pro",
      "Team & organization accounts",
      "Admin console access",
      "Custom AI persona for your org",
      "Dedicated support",
      "Onboarding session",
    ],
    ar: [
      "كل ما في Pro",
      "حسابات الفرق والمنظمات",
      "الوصول إلى لوحة التحكم للمشرفين",
      "شخصية ذكاء اصطناعي مخصصة لمنظمتك",
      "دعم مخصص",
      "جلسة تأهيل",
    ],
  },
};

interface Plan {
  id: string;
  nameEn: string;
  nameAr: string;
  price: string;
  priceNote?: string;
  priceNoteAr?: string;
  icon: React.ReactNode;
  color: string;
  glow: string;
  border: string;
  envKey: string;
  features: { en: string[]; ar: string[] };
  highlight?: boolean;
  ctaEn: string;
  ctaAr: string;
}

const PLANS: Plan[] = [
  {
    id: "free",
    nameEn: "Free",
    nameAr: "مجاني",
    price: "$0",
    priceNote: "/month",
    priceNoteAr: "/شهر",
    icon: <Sparkles size={20} />,
    color: "#94a3b8",
    glow: "rgba(148,163,184,0.2)",
    border: "rgba(148,163,184,0.2)",
    envKey: "",
    features: PLAN_FEATURES.free,
    ctaEn: "Current Plan",
    ctaAr: "خطتك الحالية",
  },
  {
    id: "pro",
    nameEn: "Pro",
    nameAr: "المحترف",
    price: "$12",
    priceNote: "/month",
    priceNoteAr: "/شهر",
    icon: <Zap size={20} fill="currentColor" />,
    color: "#6366f1",
    glow: "rgba(99,102,241,0.3)",
    border: "rgba(99,102,241,0.35)",
    envKey: "NEXT_PUBLIC_STRIPE_PRICE_PRO",
    features: PLAN_FEATURES.pro,
    highlight: true,
    ctaEn: "Upgrade to Pro",
    ctaAr: "الترقية إلى Pro",
  },
  {
    id: "enterprise",
    nameEn: "Enterprise",
    nameAr: "المؤسسات",
    price: "$29",
    priceNote: "/month",
    priceNoteAr: "/شهر",
    icon: <Building2 size={20} />,
    color: "#f59e0b",
    glow: "rgba(245,158,11,0.25)",
    border: "rgba(245,158,11,0.3)",
    envKey: "NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE",
    features: PLAN_FEATURES.enterprise,
    ctaEn: "Upgrade to Enterprise",
    ctaAr: "الترقية إلى Enterprise",
  },
];

export function PricingClient({ userEmail }: { userEmail: string | null }) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingTopup, setLoadingTopup] = useState(false);

  async function handleUpgrade(priceId: string, planId: string) {
    if (!priceId || planId === "free") return;
    setLoadingPlan(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          successUrl: `${window.location.origin}/dashboard?payment=success`,
          cancelUrl: `${window.location.origin}/pricing?payment=cancelled`,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      /* silently fail — user stays on page */
    } finally {
      setLoadingPlan(null);
    }
  }

  async function handleTopUp() {
    const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_QUOTA_TOPUP ?? "";
    if (!priceId) return;
    setLoadingTopup(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          successUrl: `${window.location.origin}/dashboard?payment=quota_success`,
          cancelUrl: `${window.location.origin}/pricing`,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      /* silently fail */
    } finally {
      setLoadingTopup(false);
    }
  }

  return (
    <div
      className="max-w-5xl mx-auto"
      dir={ar ? "rtl" : "ltr"}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-5"
          style={{
            background: "rgba(99,102,241,0.1)",
            border: "1px solid rgba(99,102,241,0.25)",
            color: "#818cf8",
          }}
        >
          <Crown size={14} />
          {ar ? "خطط وأسعار eSpark" : "eSpark Plans & Pricing"}
        </div>
        <h1 className="text-3xl lg:text-4xl font-black mb-3" style={{ color: "var(--text-primary)" }}>
          {ar ? "اختر خطتك" : "Choose Your Plan"}
        </h1>
        <p className="text-base max-w-lg mx-auto" style={{ color: "var(--text-secondary)" }}>
          {ar
            ? "بدء مجاني. ترقية عند الحاجة إلى المزيد."
            : "Start free. Upgrade when you need more."}
        </p>
      </motion.div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
        {PLANS.map((plan, i) => {
          const priceId = plan.envKey
            ? (typeof window !== "undefined" ? "" : "") // resolved at runtime from env
            : "";
          const isLoading = loadingPlan === plan.id;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="relative flex flex-col rounded-2xl p-6"
              style={{
                background: plan.highlight
                  ? `linear-gradient(160deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 100%)`
                  : "var(--bg-card)",
                border: `1px solid ${plan.border}`,
                boxShadow: plan.highlight ? `0 0 40px ${plan.glow}` : "none",
              }}
            >
              {plan.highlight && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                >
                  {ar ? "الأكثر شعبية" : "Most Popular"}
                </div>
              )}

              {/* Plan header */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${plan.glow}`, color: plan.color }}
                >
                  {plan.icon}
                </div>
                <div>
                  <div className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
                    {ar ? plan.nameAr : plan.nameEn}
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="mb-5">
                <span className="text-4xl font-black" style={{ color: plan.color }}>
                  {plan.price}
                </span>
                <span className="text-sm ms-1" style={{ color: "var(--text-muted)" }}>
                  {ar ? plan.priceNoteAr : plan.priceNote}
                </span>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 flex-1 mb-6">
                {(ar ? plan.features.ar : plan.features.en).map((f, fi) => (
                  <li key={fi} className="flex items-start gap-2.5 text-sm">
                    <Check size={14} className="flex-shrink-0 mt-0.5" style={{ color: plan.color }} />
                    <span style={{ color: "var(--text-secondary)" }}>{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {plan.id === "free" ? (
                <div
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-center"
                  style={{
                    background: "var(--bg-base)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-muted)",
                  }}
                >
                  {ar ? plan.ctaAr : plan.ctaEn}
                </div>
              ) : (
                <button
                  onClick={() => {
                    // Read price ID from env at click time
                    const pid = plan.id === "pro"
                      ? (process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO ?? "")
                      : (process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE ?? "");
                    void handleUpgrade(pid, plan.id);
                  }}
                  disabled={isLoading || !plan.envKey}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`,
                    boxShadow: `0 0 16px ${plan.glow}`,
                  }}
                >
                  {isLoading
                    ? (ar ? "جارٍ التوجيه..." : "Redirecting...")
                    : (ar ? plan.ctaAr : plan.ctaEn)}
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Quota Top-Up section */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-5"
        style={{
          background: "var(--bg-card)",
          border: "1px solid rgba(0,212,161,0.2)",
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(0,212,161,0.12)", color: "#00d4a1" }}
          >
            <CreditCard size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold mb-0.5" style={{ color: "var(--text-primary)" }}>
              {ar ? "شراء حصص إضافية" : "Buy Extra Quota"}
            </h3>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {ar
                ? "هل نفدت جلساتك؟ احصل على 50 جلسة إضافية مقابل $4.99 فقط."
                : "Running low? Get 50 extra AI sessions for just $4.99."}
            </p>
          </div>
        </div>
        <button
          onClick={handleTopUp}
          disabled={loadingTopup}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white flex-shrink-0 transition-all hover:opacity-90 disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #00d4a1, #22d3ee)",
            boxShadow: "0 0 20px rgba(0,212,161,0.35)",
          }}
        >
          <Zap size={15} fill="currentColor" />
          {loadingTopup
            ? (ar ? "جارٍ التوجيه..." : "Redirecting...")
            : (ar ? "50 جلسة — $4.99" : "50 Sessions — $4.99")}
        </button>
      </motion.div>

      {/* Footer note */}
      <p className="text-center text-xs mt-6" style={{ color: "var(--text-muted)" }}>
        {userEmail && (
          <>
            {ar ? "الحساب: " : "Signed in as "}
            <span style={{ color: "var(--text-secondary)" }}>{userEmail}</span>
            {" · "}
          </>
        )}
        {ar
          ? "جميع المدفوعات آمنة ومشفرة عبر Stripe · إلغاء الاشتراك في أي وقت"
          : "All payments are secure & encrypted via Stripe · Cancel anytime"}
      </p>
    </div>
  );
}
