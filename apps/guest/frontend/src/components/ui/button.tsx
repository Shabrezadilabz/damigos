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
          "bg-primary text-primary-foreground shadow-[0_6px_16px_-4px_rgba(56,25,50,0.32),inset_0_1px_0_rgba(255,243,230,0.22)] hover:brightness-110",
        outline:
          "border border-border bg-card text-foreground shadow-[0_2px_6px_rgba(56,25,50,0.04)] hover:bg-secondary",
        ghost: "text-foreground hover:bg-primary/6",
        secondary: "bg-secondary text-secondary-foreground hover:bg-surface-container-high",
        accent:
          "bg-accent text-accent-foreground shadow-[0_6px_16px_-4px_rgba(185,138,174,0.4),inset_0_1px_0_rgba(255,255,255,0.45)] hover:bg-[#a37798]",
        success:
          "bg-success text-white shadow-[0_6px_16px_-4px_rgba(61,139,110,0.38),inset_0_1px_0_rgba(255,255,255,0.25)] hover:brightness-95",
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
