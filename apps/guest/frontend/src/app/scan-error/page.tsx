import { GuestErrorView } from "@/components/guest-error-view";

import { resolveGuestError } from "@/lib/guest-error-copy";



/** G-14 — scan / sticker errors (packaging copy) */

export default async function ScanErrorPage({

  searchParams,

}: {

  searchParams: Promise<{ code?: string; msg?: string }>;

}) {

  const { code, msg } = await searchParams;

  const content = resolveGuestError(code);



  return <GuestErrorView content={content} detail={msg} />;

}

