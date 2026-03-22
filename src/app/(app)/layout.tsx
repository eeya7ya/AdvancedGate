import { Suspense } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { VisitLogger } from "@/components/layout/visit-logger";

function SidebarFallback() {
  return (
    <aside
      className="hidden lg:flex flex-col w-60 min-h-screen flex-shrink-0"
      style={{ background: "var(--bg-surface)", borderRight: "1px solid var(--border-subtle)" }}
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
    <div className="flex min-h-screen" style={{ background: "var(--bg-base)" }}>
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
    </div>
  );
}
