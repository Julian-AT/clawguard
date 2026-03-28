import Link from "next/link";
import { redirect } from "next/navigation";
import { ClawGuardLogo } from "@/components/logo";
import { LogoutForm } from "@/components/logout-form";
import { getSession } from "@/lib/auth";

type Props = {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
};

export default async function LogoutPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/");
  }

  const sp = await searchParams;
  const raw = sp.callbackUrl;
  const first = Array.isArray(raw) ? raw[0] : raw;
  const callbackUrl =
    typeof first === "string" && first.startsWith("/") && !first.startsWith("//") ? first : "/";

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="flex items-center gap-2 self-center font-medium">
          <div className="flex size-6 items-center justify-center rounded-md text-primary-foreground">
            <ClawGuardLogo className="size-4" />
          </div>
          ClawGuard
        </Link>
        <LogoutForm callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
