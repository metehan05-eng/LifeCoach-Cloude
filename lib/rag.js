/**
 * RAG — Retrieval Augmented Generation for long-term memory.
 * Uses DashScope embeddings + PostgreSQL pgvector for similarity search.
 */

const DASHSCOPE_BASE = 'https://dashscope-intl.aliyuncs.com';

function getApiKey() {
  const key = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY;
  if (!key || key.includes('PLACEHOLDER') || key.trim() === '') {
    throw new Error('DashScope API anahtarı gerekli (RAG için)');
  }
  return key.trim();
}

/**
 * Generate text embedding using DashScope's text-embedding-v2 model.
 */
export async function generateEmbedding(text) {
  const apiKey = getApiKey();

  const res = await fetch(`${DASHSCOPE_BASE}/api/v1/services/embeddings/text-embedding/text-embedding`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-v3',
      input: { texts: [text.slice(0, 2048)] },
      parameters: { text_type: 'document' },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Embedding hatası: ${data.message || data.code}`);
  }

  return data.output?.embeddings?.[0]?.embedding;
}

/**
 * Store a message embedding in the database for future retrieval.
 */
export async function storeEmbedding(prisma, userId, message, role, chatId) {
  try {
    const embedding = await generateEmbedding(message);
    if (!embedding) return;

    // Store as JSON string in a text field (pgvector requires raw SQL for actual vector column)
    await prisma.$executeRaw`
      INSERT INTO "MessageEmbedding" ("id", "userId", "chatId", "role", "content", "embedding", "createdAt")
      VALUES (gen_random_uuid(), ${userId}, ${chatId}, ${role}, ${message}, ${JSON.stringify(embedding)}::vector(1024), NOW())
      ON CONFLICT DO NOTHING
    `;
  } catch (err) {
    console.warn('[RAG] Embedding storage error:', err.message);
  }
}

/**
 * Find semantically similar past messages.
 */
export async function findSimilarContext(prisma, userId, query, limit = 5) {
  try {
    const queryEmbedding = await generateEmbedding(query);
    if (!queryEmbedding) return [];

    const results = await prisma.$queryRaw`
      SELECT "content", "role", "createdAt", 1 - ("embedding" <=> ${JSON.stringify(queryEmbedding)}::vector(1024)) AS similarity
      FROM "MessageEmbedding"
      WHERE "userId" = ${userId}
        AND "embedding" IS NOT NULL
      ORDER BY "embedding" <=> ${JSON.stringify(queryEmbedding)}::vector(1024)
      LIMIT ${limit}
    `;

    return results
      .filter(r => r.similarity > 0.7)
      .map(r => r.content);
  } catch (err) {
    console.warn('[RAG] Query error:', err.message);
    return [];
  }
}
