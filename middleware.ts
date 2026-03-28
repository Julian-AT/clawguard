import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

const DEMO_PREFIX = "/dashboard/demo/demo";

/**
 * Next.js + Turbopack dev resolves the edge entry as `middleware.ts`.
 * Keep auth + pathname header logic here; do not add `proxy.ts` — Next 16 rejects both files.
 */
export const middleware = withAuth(
  function setPathnameHeader(req: NextRequest) {
    const response = NextResponse.next();
    response.headers.set("x-pathname", req.nextUrl.pathname);
    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const p = req.nextUrl.pathname;
        if (p === DEMO_PREFIX || p.startsWith(`${DEMO_PREFIX}/`)) {
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
