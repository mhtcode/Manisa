import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Manisa — Business Management Platform",
  description: "A focused platform for managing customers, appointments, services, payments, and business insights.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
