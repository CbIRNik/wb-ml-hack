import * as SeparatorPrimitive from "@base-ui/react/separator";

import { cn } from "@/shared/lib/utils";

function Separator({
  className,
  orientation = "horizontal",
  ...props
}: SeparatorPrimitive.Separator.Props) {
  return (
    <SeparatorPrimitive.Separator
      data-slot="separator"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
