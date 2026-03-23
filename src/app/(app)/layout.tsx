import { Suspense } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { VisitLogger } from "@/components/layout/visit-logger";
import { LangProvider } from "@/lib/language";
import { AppLayoutClient } from "@/components/layout/app-layout-client";

function SidebarFallback() {
  return (
    <aside
      className="hidden lg:flex flex-col w-60 h-screen sticky top-0 flex-shrink-0"
      style={{ background: "var(--bg-surface)", borderInlineEnd: "1px solid var(--border-subtle)" }}
    />
  );
}

function NavbarFallback() {
  return (
    <div
      className="sticky top-0 z-40 h-16"
      style={{ background: "var(--bg-base)", borderBottom: "1px solid var(--border-subtle)" }}
    />
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LangProvider>
      <AppLayoutClient>
        <Suspense fallback={<SidebarFallback />}>
          <Sidebar />
        </Suspense>
        <div className="flex flex-col flex-1 min-w-0">
          <Suspense fallback={<NavbarFallback />}>
            <Navbar />
          </Suspense>
          <VisitLogger />
          <main className="flex-1 p-4 lg:p-8 overflow-auto">{children}</main>
        </div>
      </AppLayoutClient>
    </LangProvider>
  );
}
