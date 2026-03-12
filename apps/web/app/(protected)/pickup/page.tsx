import { PickupConsole } from "@/components/pickup/pickup-console";
import { requireStaff } from "@/lib/auth";

export default async function PickupPage() {
  await requireStaff();
  return <PickupConsole />;
}

