import { requireAdmin } from "@/lib/admin/guard";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto px-6 py-8 lg:px-10">{children}</main>
    </div>
  );
}
