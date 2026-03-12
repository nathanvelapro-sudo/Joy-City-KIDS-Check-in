import { formatGradeOrAge } from "@/lib/utils";
import type {
  CheckinRecord,
  CheckinSession,
  Child,
  Family,
  KioskLabelPayload,
  Room,
  ServiceEvent,
} from "@/lib/types";

export function buildLabelPayload(params: {
  family: Family;
  session: CheckinSession;
  service: ServiceEvent | null;
  children: Child[];
  checkins: CheckinRecord[];
  rooms: Room[];
}): KioskLabelPayload {
  const roomMap = new Map(params.rooms.map((room) => [room.id, room.name]));
  const childMap = new Map(params.children.map((child) => [child.id, child]));

  return {
    family: params.family,
    session: params.session,
    service: params.service,
    children: params.checkins
      .map((checkin) => {
        const child = childMap.get(checkin.child_id);
        if (!child) {
          return null;
        }

        return {
          ...child,
          grade_label: formatGradeOrAge(child.grade_label, child.birthdate),
          roomName: roomMap.get(checkin.room_id ?? "") ?? "Room assignment pending",
          allergyText: checkin.allergies_snapshot || "No allergies listed",
        };
      })
      .filter(Boolean) as KioskLabelPayload["children"],
  };
}

