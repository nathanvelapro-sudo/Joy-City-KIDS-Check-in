import Image from "next/image";

import { cn } from "@/lib/utils";

export function LogoLockup({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Image
        alt="JoyKids"
        className="h-12 w-12 rounded-2xl"
        height={48}
        src="/joy-city-smile.svg"
        width={48}
      />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-600">
          Joy City Church
        </p>
        {compact ? null : <p className="text-lg font-semibold leading-tight text-slate-950">JoyKids Check-In</p>}
      </div>
    </div>
  );
}
