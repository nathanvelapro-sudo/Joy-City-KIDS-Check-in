import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Checkbox({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn(
        "h-5 w-5 rounded-md border-orange-200 text-orange-500 focus:ring-orange-300",
        className,
      )}
      {...props}
    />
  );
}

