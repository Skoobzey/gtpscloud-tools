import { Sidebar } from '@/components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#09090b]">
      <Sidebar />
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
