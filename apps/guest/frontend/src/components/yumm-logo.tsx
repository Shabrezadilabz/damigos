type Props = {
  className?: string;
  priority?: boolean;
};

/** Official YUMM wordmark. Proportions are fixed — never stretch. */
export function YummLogo({ className = "", priority = false }: Props) {
  return (
    <img
      src="/brand/yumm-logo.png"
      alt="YUMM"
      width={656}
      height={301}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      className={`yumm-logo h-auto max-w-full shrink-0 object-contain ${className}`}
    />
  );
}
