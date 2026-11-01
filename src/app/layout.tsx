import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "Gestión Comercio", template: "%s · Gestión Comercio" },
  description: "Administración privada de comercios.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}
