import type { AppRole } from "@/lib/types";

export const APP_NAME = "SafeKids Check-In";

export const NAV_ITEMS: Array<{
  href: string;
  label: string;
  roles: AppRole[];
}> = [
  {
    href: "/parent",
    label: "Parent Portal",
    roles: ["parent", "volunteer", "admin"],
  },
  {
    href: "/kiosk",
    label: "Kiosk",
    roles: ["volunteer", "admin"],
  },
  {
    href: "/dashboard",
    label: "Live Dashboard",
    roles: ["volunteer", "admin"],
  },
  {
    href: "/pickup",
    label: "Pickup",
    roles: ["volunteer", "admin"],
  },
  {
    href: "/reports",
    label: "Reports",
    roles: ["volunteer", "admin"],
  },
];

export const QUICK_MESSAGE_TEMPLATES = [
  {
    key: "comfort-check",
    label: "Comfort check",
    body: "Hi from SafeKids. Your child could use a quick comfort check in their room when you have a moment.",
  },
  {
    key: "bathroom-break",
    label: "Bathroom break",
    body: "Hi from SafeKids. Your child needs a quick bathroom break and a parent at the room door.",
  },
  {
    key: "service-update",
    label: "Service update",
    body: "Hi from SafeKids. Everything is going well, and your child is settled in. We will text again only if needed.",
  },
];

