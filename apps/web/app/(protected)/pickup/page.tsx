import { PickupConsole } from "@/components/pickup/pickup-console";
import { requireStaff } from "@/lib/auth";
import { getPickupBootstrap } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function PickupPage() {
  const { profile } = await requireStaff();
  const supabase = await createClient();
  const bootstrap = await getPickupBootstrap(supabase);

  return (
    <PickupConsole
      isAdmin={profile.role === "admin"}
      initialRoster={bootstrap.roster}
      initialSelectedServiceId={bootstrap.selectedServiceId}
      initialServices={bootstrap.services}
    />
  );
}
