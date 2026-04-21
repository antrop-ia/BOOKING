import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F5C042",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://reservas.parilla8187.antrop-ia.com"),
  title: {
    default: "Parrilla 8187 — Reservas online",
    template: "%s · Parrilla 8187",
  },
  description:
    "Reserve sua mesa na Parrilla 8187, bar e churrascaria em Boa Viagem, Recife. Atendimento do Beto, nosso sommelier IA.",
  applicationName: "Parrilla 8187",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: "Parrilla 8187",
    title: "Parrilla 8187 — Reservas online",
    description:
      "Reserve sua mesa em segundos. Bar e churrascaria em Boa Viagem, Recife.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Parrilla 8187 — Reservas online",
    description:
      "Reserve sua mesa em segundos. Bar e churrascaria em Boa Viagem, Recife.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
