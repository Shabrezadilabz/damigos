import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UiDemoPanel } from "@/components/ui-demo-panel";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 p-4">
      <UiDemoPanel />
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-primary">Guest app · P0</p>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">D&apos;aMigo&apos;s</h1>
        <p className="mt-2 text-sm text-foreground/70">
          Packaging QR entry — use <code className="rounded bg-muted px-1">/s/your-token</code> after seed.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Button asChild>
          <Link href="/orders">Orders home (G-S5)</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/hub">Discover hub (P2 shell)</Link>
        </Button>
      </div>
    </main>
  );
}
