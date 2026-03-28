import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getSession } from "@/lib/auth";
import { listReposWithAudits } from "@/lib/redis-queries";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/api/auth/signin?callbackUrl=/dashboard");
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
