import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "OpsGraph AI · Operations, connected",
  description:
    "Demo local de pagos y respuesta a incidentes. Sin transacciones reales.",
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
