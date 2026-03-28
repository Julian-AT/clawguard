/** Public, unauthenticated demo: mirrors the real GitHub org/repo for this product. */
export const DEMO_OWNER = "julian-at";
export const DEMO_REPO = "clawguard";

export const DEMO_DASHBOARD_HUB_PATH = `/dashboard/${DEMO_OWNER}/${DEMO_REPO}`;

const LEGACY_DEMO = "/dashboard/demo/demo";

/** Paths allowed without a session (see `proxy.ts` + `app/dashboard/layout.tsx`). */
export function isPublicDemoDashboardPath(pathname: string): boolean {
  if (pathname === LEGACY_DEMO || pathname.startsWith(`${LEGACY_DEMO}/`)) {
    return true;
  }
  const orgBase = `/dashboard/${DEMO_OWNER}`;
  const repoBase = `${orgBase}/${DEMO_REPO}`;
  if (pathname === `${orgBase}/learnings` || pathname.startsWith(`${orgBase}/learnings/`)) {
    return true;
  }
  if (pathname === `${orgBase}/knowledge` || pathname.startsWith(`${orgBase}/knowledge/`)) {
    return true;
  }
  if (pathname === repoBase || pathname.startsWith(`${repoBase}/`)) {
    return true;
  }
  return false;
}

export function isDemoDashboardOwner(owner: string): boolean {
  return owner === DEMO_OWNER;
}

export function isDemoDashboardRepo(owner: string, repo: string): boolean {
  return owner === DEMO_OWNER && repo === DEMO_REPO;
}
