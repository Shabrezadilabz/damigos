import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-[14px] border border-[#E2E5EE] bg-white px-3.5 py-2.5 text-[15px] font-medium text-[#0F1115] shadow-[0_1px_2px_rgba(15,23,42,0.03)] outline-none transition-all placeholder:text-[#64748B] focus-visible:border-[#0F1115] focus-visible:ring-2 focus-visible:ring-[#0F1115]/10 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
