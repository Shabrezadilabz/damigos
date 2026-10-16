import { redirect } from "next/navigation";
import { resolveScanToken } from "@/lib/api";

/** G-S1 / G-01.01 */
export default async function ScanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  try {
    const result = await resolveScanToken(token);
    redirect(result.redirectPath);
  } catch (e: unknown) {
    if (isNextRedirect(e)) throw e;
    const err = e as { status?: number; data?: { error?: { code?: string } } };
    const code = err.data?.error?.code ?? "ERROR";
    redirect(`/scan-error?code=${encodeURIComponent(code)}`);
  }
}

function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: string }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}
