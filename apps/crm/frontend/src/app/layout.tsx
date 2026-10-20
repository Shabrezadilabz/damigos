import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "D'aMigo's CRM",
  description: "Restaurant CRM — menu, grow, orders",
};

/** Apple SF Pro system stack — DEC-009 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased min-h-dvh">{children}</body>
    </html>
  );
}
