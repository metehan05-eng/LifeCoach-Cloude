const { setupDevPlatform } = require('@cloudflare/next-on-pages/next-dev');

if (process.env.NODE_ENV === 'development') {
  setupDevPlatform();
}

const nextConfig = {
  experimental: {
    appDir: true,
    runtime: 'edge', // Tüm API Rotalarını varsayılan olarak Edge Runtime'da çalıştırır
  },
  webpack(config) {
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
    };

    return config;
  },
};

module.exports = nextConfig;
