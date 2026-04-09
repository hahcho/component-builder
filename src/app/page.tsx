import { redirect } from "next/navigation";
import { getDB } from "@/lib/db";

export default function RootPage() {
  const db = getDB();
  const latest = db
    .prepare(
      "SELECT id FROM sessions WHERE onboarding_completed = 1 ORDER BY updated_at DESC LIMIT 1"
    )
    .get() as { id: string } | undefined;

  if (latest) {
    redirect(`/sessions/${latest.id}`);
  }

  redirect("/onboarding");
}
