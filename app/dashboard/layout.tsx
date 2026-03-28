import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getSession } from "@/lib/auth";
import { listReposWithAudits } from "@/lib/redis-queries";

const DEMO_DASHBOARD_PATH = "/dashboard/demo/demo";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const h = await headers();
  const pathname = h.get("x-pathname") ?? "";
  const isDemoDashboard =
    pathname === DEMO_DASHBOARD_PATH || pathname.startsWith(`${DEMO_DASHBOARD_PATH}/`);

  if (isDemoDashboard) {
    return (
      <DashboardShell
        user={{
          name: "Demo User",
          email: "demo@clawguard.dev",
          image: null,
        }}
        repos={[{ owner: "demo", repo: "demo" }]}
      >
        {children}
      </DashboardShell>
    );
  }

  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }

  const repos = await listReposWithAudits();

  return (
    <DashboardShell
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
      repos={repos}
    >
      {children}
    </DashboardShell>
  );
}
