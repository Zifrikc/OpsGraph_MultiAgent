import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "OpsGraph AI · Operations, connected",
  description:
    "Connected payment operations and graph-based incident response demo. No real transactions.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
