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
      const prefs = await prismaClient.userPreference.findUnique({
        where: { userId: session.user.id },
        select: { userBio: true },
      });
      return res.status(200).json({ userBio: prefs?.userBio || "" });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "POST") {
    try {
      const { userBio } = req.body;
      await prismaClient.userPreference.upsert({
        where: { userId: session.user.id },
        update: { userBio: userBio || "" },
        create: {
          userId: session.user.id,
          userBio: userBio || "",
        },
      });
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
