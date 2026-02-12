import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "@/styles/globals.css";
import { ToasterProvider } from "@/components/layout/Toaster";
import { BackendGuard } from "@/components/BackendGuard";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pristav Radosti",
  description: "Rehab Center Management",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="cs" className={plusJakarta.variable}>
      <body className="font-sans">
        <ToasterProvider>
          <BackendGuard>{children}</BackendGuard>
        </ToasterProvider>
      </body>
    </html>
  );
}
