import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getSession } from "@/lib/auth";
import { DEMO_OWNER, DEMO_REPO, isPublicDemoDashboardPath } from "@/lib/public-demo-dashboard";
import { listReposWithAudits } from "@/lib/redis-queries";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const h = await headers();
  const pathname = h.get("x-pathname") ?? "";
  const session = await getSession();
  const isDemoPath = isPublicDemoDashboardPath(pathname);
  const usePublicDemoShell = isDemoPath && !session?.user;

  if (usePublicDemoShell) {
    return (
      <DashboardShell
        user={{
          name: "Demo User",
          email: "demo@clawguard.dev",
          image: null,
        }}
        repos={[{ owner: DEMO_OWNER, repo: DEMO_REPO }]}
      >
        {children}
      </DashboardShell>
    );
  }

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
