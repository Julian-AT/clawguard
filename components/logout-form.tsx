"use client";

import { LogOutIcon } from "lucide-react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldDescription } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export function LogoutForm({
  className,
  callbackUrl = "/",
  ...props
}: React.ComponentProps<"div"> & { callbackUrl?: string }) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Sign out</CardTitle>
          <CardDescription>
            You will need to sign in with GitHub again to open your security dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full gap-2" type="button" onClick={() => signOut({ callbackUrl })}>
            <LogOutIcon className="size-4" aria-hidden />
            Sign out
          </Button>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        You can return to the{" "}
        <a href="/" className="underline-offset-4 hover:underline">
          home page
        </a>{" "}
        without signing out.
      </FieldDescription>
    </div>
  );
}
