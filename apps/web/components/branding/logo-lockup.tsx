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
        alt="Joy City Smile"
        className="h-12 w-12 rounded-2xl"
        height={48}
        src="/joy-city-smile.svg"
        width={48}
      />
      {compact ? null : (
        <Image
          alt="Joy City Church"
          className="h-10 w-auto"
          height={40}
          src="/joy-city-wordmark.svg"
          width={236}
        />
      )}
    </div>
  );
}

