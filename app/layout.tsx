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
  metadataBase: new URL("https://flow-nine-mauve.vercel.app"),
  icons: {
    icon: "https://expoflamenco.b-cdn.net/wp-content/uploads/2024/08/favicon-75x75.png",
    shortcut: "https://expoflamenco.b-cdn.net/wp-content/uploads/2024/08/favicon-75x75.png",
    apple: "https://expoflamenco.b-cdn.net/wp-content/uploads/2024/08/favicon-75x75.png",
  },
  openGraph: {
    url: "https://flow-nine-mauve.vercel.app/",
    type: "website",
    title: "Expoflamenco Flow",
    description: "Plataforma interna de ticketing para soporte técnico en Expoflamenco",
    images: [
      {
        url: "/branding/preloader_icon.png",
        width: 1200,
        height: 1200,
        alt: "Expoflamenco Flow",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Expoflamenco Flow",
    description: "Plataforma interna de ticketing para soporte técnico en Expoflamenco",
    images: ["/branding/preloader_icon.png"],
  },
  other: {
    "twitter:domain": "flow-nine-mauve.vercel.app",
    "twitter:url": "https://flow-nine-mauve.vercel.app/",
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
