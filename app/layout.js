import { Inter, Space_Grotesk } from "next/font/google";
import Providers from "./providers";
import VercelInsights from "./VercelInsights";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap", preload: false });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space", display: "swap", preload: false });

export const metadata = {
  title: "LifeCoach AI – HAN 4.2 Ultra Core",
  description: "Yapay Zeka Destekli Kişisel Yaşam Koçunuz. Hedeflerine ulaş, potansiyelini keşfet.",
  keywords: "yapay zeka, life coach, AI, hedef, üretkenlik, HAN AI",
  openGraph: {
    title: "LifeCoach AI",
    description: "Seni anlayan yeni nesil yaşam koçu",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr" className={`${inter.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#060618" />
        <link rel="icon" href="/lifecoach-favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/lifecoach-logo-icon.svg" />
      </head>
      <body style={{ background: '#030308' }} suppressHydrationWarning>
        <Providers>{children}</Providers>
        <VercelInsights />
      </body>
    </html>
  );
}
