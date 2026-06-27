import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

// Vercel serverless için connection_limit=1 + pool_timeout=5:
// her serverless çağrı kendi bağlantısını alır, havuz şişmez
const dbUrl = process.env.DATABASE_URL || '';
const params = [];
if (!dbUrl.includes('connection_limit')) params.push('connection_limit=1');
if (!dbUrl.includes('pool_timeout')) params.push('pool_timeout=5');
// pgbouncer=true SADECE URL'de "pgbouncer" geçiyorsa eklenir
const extra = params.length ? (dbUrl.includes('?') ? '&' : '?') + params.join('&') : '';

export const prismaClient = globalForPrisma.prisma || new PrismaClient({
  datasources: {
    db: { url: dbUrl + extra },
  },
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prismaClient;

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
