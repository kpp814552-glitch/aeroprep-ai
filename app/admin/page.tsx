import { notFound, redirect } from "next/navigation";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AppFrame from "@/components/layout/AppFrame";
import { createReadonlyServerClient } from "@/lib/supabase/server-readonly";
import { isPlatformAdmin } from "@/lib/admin/auth";

// 后台页面一律服务端鉴权：非管理员直接 404，连页面壳都拿不到
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createReadonlyServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/admin");
  if (!(await isPlatformAdmin(supabase, user))) notFound();

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
