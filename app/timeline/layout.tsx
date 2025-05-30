import { AppHeader } from "@/components/layout/app-header";
import { MainNav } from "@/components/layout/main-nav";

export default function TimelineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-1 overflow-y-auto pt-4 pb-20 md:pb-6"> {/* Adjust padding as needed */}
        {children}
      </main>
      <MainNav />
    </div>
  );
}
