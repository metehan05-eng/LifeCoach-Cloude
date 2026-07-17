import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";
import { getKVData, setKVData } from "../../lib/db.js";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: "Yetkisiz" });
  }

  const userId = session.user.email;

  if (req.method === "GET") {
    try {
      const allSaved = await getKVData("waffle-saved") || {};
      const userSaved = allSaved[userId] || [];
      return res.status(200).json({ items: userSaved });
    } catch (err) {
      console.error("[waffle-save GET]", err);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "POST") {
    try {
      const { prompt, url, mediaType, optimized, model, provider } = req.body;
      if (!url) {
        return res.status(400).json({ error: "URL gerekli" });
      }

      const allSaved = await getKVData("waffle-saved") || {};
      const userSaved = allSaved[userId] || [];

      const newItem = {
        id: Date.now().toString(),
        prompt: prompt || "",
        url,
        mediaType: mediaType || "image",
        optimized: optimized || null,
        model: model || null,
        provider: provider || null,
        savedAt: new Date().toISOString(),
      };

      userSaved.unshift(newItem);
      allSaved[userId] = userSaved;
      await setKVData("waffle-saved", allSaved);

      return res.status(200).json({ item: newItem });
    } catch (err) {
      console.error("[waffle-save POST]", err);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "DELETE") {
    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "ID gerekli" });

      const allSaved = await getKVData("waffle-saved") || {};
      const userSaved = allSaved[userId] || [];
      allSaved[userId] = userSaved.filter((item) => item.id !== id);
      await setKVData("waffle-saved", allSaved);

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("[waffle-save DELETE]", err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
