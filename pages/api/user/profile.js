import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prismaClient } from "@/lib/prisma";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: "Yetkisiz erişim" });
  }

  if (req.method === "GET") {
    try {
      const user = await prismaClient.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true },
      });
      return res.status(200).json({ name: user?.name || "", email: user?.email || "" });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "POST") {
    try {
      const { name } = req.body || {};
      const trimmed = typeof name === "string" ? name.trim().slice(0, 60) : "";
      if (!trimmed) {
        return res.status(400).json({ error: "Geçerli bir ad gerekli." });
      }
      const user = await prismaClient.user.update({
        where: { id: session.user.id },
        data: { name: trimmed },
        select: { name: true },
      });
      return res.status(200).json({ success: true, name: user.name });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
