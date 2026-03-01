import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FindMyFauna — AI Biodiversity Mapping",
  description:
    "Snap a photo and ID the species with Google Gemini 2.5 Flash. Map biodiversity sightings in real-time.",
  keywords: ["biodiversity", "wildlife", "AI", "mapping", "ecology", "species identification", "Gemini"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
