import AdminDashboard from "@/components/admin/AdminDashboard";
import AppFrame from "@/components/layout/AppFrame";

export default function AdminPage() {
  return (
    <AppFrame backHref="/" backLabel="返回首页">
      <main className="relative z-10 px-5 pb-16 pt-8 md:px-8">
        <div className="mx-auto max-w-6xl">
          <AdminDashboard />
        </div>
      </main>
    </AppFrame>
  );
}
