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
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LifeCoach AI",
  },
  openGraph: {
    title: "LifeCoach AI",
    description: "Seni anlayan yeni nesil yaşam koçu",
    type: "website",
  },
};

// Mobil + çentikli cihaz desteği: viewport-fit=cover safe-area env() değerlerini etkinleştirir.
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#060618" },
    { media: "(prefers-color-scheme: light)", color: "#f8f9fc" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr" className={`${inter.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="icon" href="/lifecoach-favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/lifecoach-logo-icon.svg" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('han-theme');if(!t&&window.matchMedia('(prefers-color-scheme:light)').matches)t='light';if(!t)t='dark';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
      </head>
      <body style={{ background: 'var(--bg-deep)' }} suppressHydrationWarning>
        <Providers>{children}</Providers>
        <VercelInsights />
      </body>
    </html>
  );
}
