import { ReportsScreen } from "@/components/reports/reports-screen";
import { requireStaff } from "@/lib/auth";
import { getReportsSnapshot } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function ReportsPage() {
  await requireStaff();
  const supabase = await createClient();
  const snapshot = await getReportsSnapshot(supabase);

  return (
    <ReportsScreen
      initialAttendance={snapshot.attendance}
      initialPickupLogs={snapshot.pickupLogs}
      initialVolunteers={snapshot.volunteers}
    />
  );
}

