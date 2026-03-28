import { redirect } from "next/navigation";

import { DEMO_DASHBOARD_HUB_PATH } from "@/lib/public-demo-dashboard";

/** Old showcase URL — canonical hub is julian-at/clawguard. */
export default function LegacyDemoPathRedirect() {
  redirect(DEMO_DASHBOARD_HUB_PATH);
}
