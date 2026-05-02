import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COUNTRIES = ['🇹🇷 TR', '🇺🇸 US', '🇩🇪 DE', '🇯🇵 JP', '🇬🇧 UK', '🇫🇷 FR', '🇰🇷 KR', '🇧🇷 BR', '🇨🇦 CA', '🇮🇹 IT'];
const NAMES = ['AlphaUser', 'DarkFocus', 'GoalMaster', 'ZenWarrior', 'LogicNode', 'HyperPlan', 'DeepWork', 'FocusEntity', 'MindArchitect', 'Visonary_X'];

export default async function handler(req, res) {
  const { email } = req.query;

  try {
    let currentUser = null;
    if (email) {
      currentUser = await prisma.user.findUnique({
        where: { email },
        select: { name: true, xp: true, level: true, totalXp: true }
      });
    }

    const userTotalXp = currentUser?.totalXp || 0;

    // 1. TOP 5 (Efsanevi Botlar)
    const topBots = NAMES.slice(0, 5).map((name, i) => {
       const baseLevel = 45 - i * 5;
       // Zamanla artan küçük XP simülasyonu
       const hours = new Date().getHours();
       const dynamicXp = hours * 2; 
       return {
         rank: i + 1,
         name,
         country: COUNTRIES[i % COUNTRIES.length],
         level: baseLevel,
         xp: 80 + dynamicXp,
         isBot: true
       };
    });

    // 2. Kullanıcının Sıralamasını Tahmin Et (12.500 kişi içinde)
    // Formula: (MaxXP - UserXP) üzerinden bir sıralama
    const totalSimulatedUsers = 12500;
    let userRank = Math.max(6, Math.floor(totalSimulatedUsers - (userTotalXp / 10)));
    if (userTotalXp > 5000) userRank = Math.min(userRank, 100); // Çok çalışırsa ilk 100'e girsin

    // 3. Yakın Rakipler (Kullanıcının hemen üstünde ve altında olan 2 fake hesap)
    const neighbors = [
      {
        rank: userRank - 1,
        name: NAMES[userRank % 10] || "ShadowWalker",
        country: COUNTRIES[(userRank - 1) % COUNTRIES.length],
        level: currentUser?.level || 1,
        xp: (currentUser?.xp || 0) + 15,
        isBot: true
      },
      {
        rank: userRank + 1,
        name: "Newbie_Focus",
        country: COUNTRIES[(userRank + 1) % COUNTRIES.length],
        level: Math.max(1, (currentUser?.level || 1) - 1),
        xp: Math.max(0, (currentUser?.xp || 0) - 20),
        isBot: true
      }
    ];

    res.status(200).json({
      top5: topBots,
      userRank,
      neighbors,
      totalUsers: totalSimulatedUsers
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await prisma.$disconnect();
  }
}
