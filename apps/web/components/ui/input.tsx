import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-2xl border border-orange-100 bg-white px-4 py-2 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-orange-300 focus:ring-2 focus:ring-orange-200",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };

