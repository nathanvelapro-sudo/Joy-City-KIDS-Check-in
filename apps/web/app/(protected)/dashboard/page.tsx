import { LiveDashboard } from "@/components/dashboard/live-dashboard";
import { requireStaff } from "@/lib/auth";
import { getDashboardSnapshot } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  await requireStaff();
  const supabase = await createClient();
  const snapshot = await getDashboardSnapshot(supabase);

  return (
    <LiveDashboard
      initialBoard={snapshot.board}
      initialCurrentService={snapshot.currentService}
      initialNotifications={snapshot.notifications}
      initialRooms={snapshot.rooms}
      initialServices={snapshot.services}
      volunteers={snapshot.volunteers}
    />
  );
}

