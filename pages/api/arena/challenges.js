export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const challenges = [
        {
            id: 1,
            title: 'İlk Adım',
            description: 'Uygulamada ilk kez giriş yap',
            xp_reward: 50,
            difficulty: 'Easy',
            completed: false
        },
        {
            id: 2,
            title: 'Hedef Belirle',
            description: '3 hedef oluştur',
            xp_reward: 100,
            difficulty: 'Medium',
            completed: false
        },
        {
            id: 3,
            title: 'Alışkanlık Kurucusu',
            description: '7 gün boyunca günlük alışkanlık takip et',
            xp_reward: 200,
            difficulty: 'Hard',
            completed: false
        },
        {
            id: 4,
            title: 'Meditasyon Ustası',
            description: 'Toplam 30 dakika meditasyon yap',
            xp_reward: 150,
            difficulty: 'Medium',
            completed: false
        },
        {
            id: 5,
            title: 'Diyetisyen',
            description: '10 beslenme logu ekle',
            xp_reward: 100,
            difficulty: 'Easy',
            completed: false
        },
        {
            id: 6,
            title: 'Sporcu',
            description: '5 egzersiz kaydı oluştur',
            xp_reward: 120,
            difficulty: 'Medium',
            completed: false
        }
    ];

    return res.status(200).json({ challenges });
}
