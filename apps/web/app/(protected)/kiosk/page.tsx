import { KioskScreen } from "@/components/kiosk/kiosk-screen";
import { requireStaff } from "@/lib/auth";
import { getKioskBootstrap } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function KioskPage() {
  await requireStaff();
  const supabase = await createClient();
  const bootstrap = await getKioskBootstrap(supabase);

  return (
    <KioskScreen
      initialPrecheckins={bootstrap.precheckins}
      initialRooms={bootstrap.rooms}
      initialServiceId={bootstrap.selectedServiceId}
      initialServices={bootstrap.services}
    />
  );
}

