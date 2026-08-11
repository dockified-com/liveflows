import { AppNav } from "@/components/app-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0e1117]">
      <AppNav />
      <main className="flex-1 min-h-0 overflow-auto">{children}</main>
    </div>
  );
}
