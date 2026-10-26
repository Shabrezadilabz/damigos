import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-0.5 text-[11px] font-bold tracking-tight transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[#EAFF81] text-[#0F1115]",
        secondary: "border-transparent bg-[#EEF0F5] text-[#0F1115]",
        outline: "border-[#E2E5EE] bg-white text-[#0F1115]",
        success: "border-transparent bg-[#D1FAE5] text-[#065F46]",
        warning: "border-transparent bg-amber-100 text-amber-900",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
