import { Suspense } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";

function SidebarFallback() {
  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-[#0d1424] border-r border-[rgba(255,255,255,0.06)] flex-shrink-0" />
  );
}

function NavbarFallback() {
  return (
    <div className="sticky top-0 z-40 h-16 bg-[#0d1424]/90 border-b border-[rgba(255,255,255,0.06)]" />
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#080c14]">
      <Suspense fallback={<SidebarFallback />}>
        <Sidebar />
      </Suspense>
      <div className="flex flex-col flex-1 min-w-0">
        <Suspense fallback={<NavbarFallback />}>
          <Navbar />
        </Suspense>
        <main className="flex-1 p-4 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
