import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

import { isPublicDemoDashboardPath } from "@/lib/public-demo-dashboard";

/** Dashboard auth + `x-pathname` on the *request* so `headers()` in RSC can read it (response headers are not visible downstream). */
export const proxy = withAuth(
  function setPathnameHeader(req: NextRequest) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-pathname", req.nextUrl.pathname);
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const p = req.nextUrl.pathname;
        if (isPublicDemoDashboardPath(p)) {
          return true;
        }
        return !!token;
      },
    },
  },
);

export const config = {
  matcher: ["/dashboard/:path*"],
};
