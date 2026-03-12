import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-[110px] w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-orange-300 focus:ring-2 focus:ring-orange-200",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };

