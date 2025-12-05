import "./globals.css";
import type { Metadata } from "next";
import { Inter, Fredoka } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
  weight: ["300", "400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "PetCare - Pet Health Management",
  description: "Smart pet health tracking and management platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${fredoka.variable} font-sans`}>
        <main>
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}