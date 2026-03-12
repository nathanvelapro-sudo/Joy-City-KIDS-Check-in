import { ParentPortal } from "@/components/parent/parent-portal";
import { requireUser } from "@/lib/auth";
import { getParentBootstrap } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function ParentPage() {
  const { user, profile } = await requireUser();
  const supabase = await createClient();
  const bootstrap = await getParentBootstrap(supabase, user.id);

  return (
    <ParentPortal
      familyId={bootstrap.familyId}
      initialPrecheckins={bootstrap.precheckins}
      initialSnapshot={bootstrap.snapshot}
      profile={profile}
      rooms={bootstrap.rooms}
      services={bootstrap.services}
    />
  );
}

