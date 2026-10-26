import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-[14px] font-bold tracking-tight transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[#0F1115] text-white shadow-[0_6px_16px_-4px_rgba(15,17,21,0.32),inset_0_1px_0_rgba(255,255,255,0.22)] hover:bg-[#1E222B]",
        outline:
          "border border-[#E2E5EE] bg-white text-[#0F1115] shadow-[0_2px_6px_rgba(15,23,42,0.04)] hover:bg-[#F8F9FB]",
        ghost: "text-[#0F1115] hover:bg-[#0F1115]/6",
        secondary: "bg-[#EEF0F5] text-[#0F1115] hover:bg-[#E2E5EE]",
        accent:
          "bg-[#EAFF81] text-[#0F1115] shadow-[0_6px_16px_-4px_rgba(180,210,30,0.35),inset_0_1px_0_rgba(255,255,255,0.65)] hover:bg-[#d8f259]",
        success:
          "bg-[#10B981] text-white shadow-[0_6px_16px_-4px_rgba(16,185,129,0.38),inset_0_1px_0_rgba(255,255,255,0.25)] hover:bg-[#059669]",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-full px-4 text-[12px]",
        lg: "h-12 rounded-full px-8 text-[15px]",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
