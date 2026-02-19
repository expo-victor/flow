import type { Metadata } from "next";
import { Geist, Geist_Mono, Nunito_Sans } from "next/font/google";
import { GlobalPreloader } from "@/components/flow/global-preloader";
import "./globals.css";

const nunitoSans = Nunito_Sans({variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Expoflamenco Flow",
  description: "Plataforma interna de ticketing para soporte técnico en Expoflamenco",
  icons: {
    icon: "https://expoflamenco.b-cdn.net/wp-content/uploads/2024/08/favicon-75x75.png",
    shortcut: "https://expoflamenco.b-cdn.net/wp-content/uploads/2024/08/favicon-75x75.png",
    apple: "https://expoflamenco.b-cdn.net/wp-content/uploads/2024/08/favicon-75x75.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={nunitoSans.variable}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GlobalPreloader>{children}</GlobalPreloader>
      </body>
    </html>
  );
}
