import { PrismaClient } from "@prisma/client";

const globalPrisma = {
  prisma: undefined,
};

export const prismaClient = globalPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalPrisma.prisma = prismaClient;
}

if (process.env.NODE_ENV !== "production") globalPrisma.prisma = prismaClient;

/**
 * Prisma hatası mı? Tablo bulunamadı (P2021) veya bağlantı havuzu dolu (EMAXCONNSESSION).
 * Vercel serverless ortamında DB yokken hata fırlatmak yerine boş veri döndürmek için kullan.
 */
export function isPrismaError(err) {
  if (!err) return false;
  const code = err?.code || '';
  return code === 'P2021' || code === 'EMAXCONNSESSION' || code === 'P1001' || code === 'P1000';
}

/**
 * Try-catch wrapper: Prisma hatası durumunda boş/fallback değer döndürür.
 * Kullanım: await safeQuery(() => prismaClient.target.findMany({...}), [])
 */
export async function safeQuery(fn, fallback = null) {
  try {
    return await fn();
  } catch (err) {
    if (isPrismaError(err)) {
      console.warn('[DB] Prisma hatası (veritabanı yok), boş veri döndürülüyor:', err?.code);
      return fallback;
    }
    throw err;
  }
}
