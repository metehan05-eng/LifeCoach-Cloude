/**
 * LifeCoach AI — Capacitor (Ionic) mobil yapılandırması.
 * Uygulama, kimlik doğrulaması ve API için canlı sunucuya bağlanır.
 * Sunucu adresi: MOBILE_APP_URL ortam değişkeniyle değiştirilebilir.
 */
module.exports = {
  appId: "com.lifecoach.ai",
  appName: "LifeCoachAI",
  webDir: "public",
  server: {
    url: process.env.MOBILE_APP_URL || "https://lifecoach-cloude.vercel.app",
    androidScheme: "https",
    cleartext: false,
    allowNavigation: ["lifecoach-cloude.vercel.app", "localhost"],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#0b0d1e",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0b0d1e",
      overlaysWebView: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};