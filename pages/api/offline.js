import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'gizli-anahtar-degistir';

// Helper: Authenticate token
function authenticateToken(req) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return null;
  
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// In-memory stores
const learningPaths = {};
const offlineSyncQueue = {};

// Predefined learning paths
const LEARNING_PATH_TEMPLATES = {
  'time-management': {
    title: 'Zaman Yönetimi Ustası',
    description: '30 gün içinde zaman yönetimini öğren',
    modules: [
      { week: 1, topic: 'Prioritize etme', lessons: 3 },
      { week: 2, topic: 'Pomodoro & Time Blocking', lessons: 3 },
      { week: 3, topic: 'İş-Hayat Dengesi', lessons: 3 },
      { week: 4, topic: 'Uygulamaya Geç', lessons: 2 }
    ]
  },
  'habit-building': {
    title: 'Alışkanlık Kurma',
    description: '66 gün alışkanlık döngüsü',
    modules: [
      { week: 1, topic: 'Alışkanlık Bilimi', lessons: 2 },
      { week: 2, topic: 'Tetikler ve Rutinler', lessons: 3 },
      { week: 3, topic: 'Ödül Sistemi', lessons: 2 },
      { week: 8, topic: 'Uygulamaya Geç', lessons: 4 }
    ]
  },
  'stress-management': {
    title: 'Stres Yönetimi',
    description: 'Stres başa çıkma stratejileri',
    modules: [
      { week: 1, topic: 'Stres Kaynakları', lessons: 2 },
      { week: 2, topic: 'Relaxation Tekniği', lessons: 3 },
      { week: 3, topic: 'Mindfulness', lessons: 3 }
    ]
  },
  'personal-development': {
    title: 'Kişisel Gelişim',
    description: 'Genel kişisel gelişim programı',
    modules: [
      { week: 1, topic: 'Kendini Tanı', lessons: 2 },
      { week: 2, topic: 'Hedef Belirleme', lessons: 2 },
      { week: 3, topic: 'Eylem Planı', lessons: 2 },
      { week: 4, topic: 'Değerlendirme', lessons: 1 }
    ]
  }
};

export default async function handler(req, res) {
  const user = authenticateToken(req);
  
  if (!user) {
    return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
  }
  
  const userId = user.id;
  
  // === LEARNING PATHS API ===
  
  // GET /api/offline?type=learning-paths - Get all learning paths
  if (req.method === 'GET' && req.query.type === 'learning-paths') {
    try {
      if (req.query.action === 'templates') {
        // Get available templates
        return res.status(200).json({
          success: true,
          templates: LEARNING_PATH_TEMPLATES,
          message: 'Learning path templates alındı'
        });
      }
      
      // Get user's learning paths
      const userPaths = learningPaths[userId] || [];
      
      return res.status(200).json({
        success: true,
        paths: userPaths,
        count: userPaths.length,
        message: 'Learning paths alındı'
      });
    } catch (err) {
      console.error('Learning paths GET error:', err);
      return res.status(500).json({ error: 'Learning paths alınamadı' });
    }
  }
  
  // POST /api/offline?type=learning-paths - Create learning path
  if (req.method === 'POST' && req.query.type === 'learning-paths') {
    try {
      const { templateId } = req.body;
      
      if (!templateId || !LEARNING_PATH_TEMPLATES[templateId]) {
        return res.status(400).json({ error: 'Geçersiz template ID' });
      }
      
      if (!learningPaths[userId]) {
        learningPaths[userId] = [];
      }
      
      const template = LEARNING_PATH_TEMPLATES[templateId];
      const newPath = {
        id: Math.random().toString(36).substr(2, 9),
        ...template,
        templateId,
        startedAt: new Date().toISOString(),
        progress: 0,
        completed: false,
        modulesProgress: template.modules.map(m => ({
          ...m,
          lessonsCompleted: 0,
          status: 'not-started'
        }))
      };
      
      learningPaths[userId].push(newPath);
      
      return res.status(201).json({
        success: true,
        message: 'Learning path oluşturuldu',
        path: newPath
      });
    } catch (err) {
      console.error('Learning path POST error:', err);
      return res.status(500).json({ error: 'Learning path oluşturulamadı' });
    }
  }
  
  // POST /api/offline?type=learning-paths&action=progress - Update progress
  if (req.method === 'POST' && req.query.type === 'learning-paths' && req.query.action === 'progress') {
    try {
      const { pathId, moduleIndex } = req.body;
      
      if (!learningPaths[userId]) {
        return res.status(404).json({ error: 'Learning path bulunamadı' });
      }
      
      const path = learningPaths[userId].find(p => p.id === pathId);
      if (!path) {
        return res.status(404).json({ error: 'Path bulunamadı' });
      }
      
      if (path.modulesProgress[moduleIndex]) {
        path.modulesProgress[moduleIndex].lessonsCompleted++;
        if (path.modulesProgress[moduleIndex].lessonsCompleted >= path.modulesProgress[moduleIndex].lessons) {
          path.modulesProgress[moduleIndex].status = 'completed';
        } else {
          path.modulesProgress[moduleIndex].status = 'in-progress';
        }
      }
      
      // Calculate overall progress
      const completedModules = path.modulesProgress.filter(m => m.status === 'completed').length;
      path.progress = Math.round((completedModules / path.modulesProgress.length) * 100);
      
      if (path.progress === 100) {
        path.completed = true;
      }
      
      return res.status(200).json({
        success: true,
        message: 'İlerleme güncellendi',
        path: path,
        progress: path.progress
      });
    } catch (err) {
      console.error('Progress update error:', err);
      return res.status(500).json({ error: 'İlerleme güncellenemedi' });
    }
  }
  
  // === OFFLINE MODE / SYNC API ===
  
  // GET /api/offline?type=sync - Get offline sync queue
  if (req.method === 'GET' && req.query.type === 'sync') {
    try {
      const queue = offlineSyncQueue[userId] || [];
      
      return res.status(200).json({
        success: true,
        syncQueue: queue,
        pendingChanges: queue.length,
        message: 'Sync queue alındı'
      });
    } catch (err) {
      console.error('Sync GET error:', err);
      return res.status(500).json({ error: 'Sync alınamadı' });
    }
  }
  
  // POST /api/offline?type=sync - Add to offline sync queue
  if (req.method === 'POST' && req.query.type === 'sync') {
    try {
      const { action, data } = req.body;
      
      if (!action || !data) {
        return res.status(400).json({ error: 'Action ve data gerekli' });
      }
      
      if (!offlineSyncQueue[userId]) {
        offlineSyncQueue[userId] = [];
      }
      
      const syncItem = {
        id: Math.random().toString(36).substr(2, 9),
        action, // create, update, delete
        data,
        timestamp: new Date().toISOString(),
        synced: false
      };
      
      offlineSyncQueue[userId].push(syncItem);
      
      return res.status(201).json({
        success: true,
        message: 'Offline sync öğesi eklendi',
        syncItem: syncItem
      });
    } catch (err) {
      console.error('Sync POST error:', err);
      return res.status(500).json({ error: 'Sync öğesi eklenemedi' });
    }
  }
  
  // POST /api/offline?type=sync&action=flush - Flush sync queue from server
  if (req.method === 'POST' && req.query.type === 'sync' && req.query.action === 'flush') {
    try {
      const queue = offlineSyncQueue[userId] || [];
      
      // Process all queued items
      for (const item of queue) {
        // Process based on item.action
        // In production, write to database
        item.synced = true;
      }
      
      // Clear queue
      offlineSyncQueue[userId] = [];
      
      return res.status(200).json({
        success: true,
        message: `${queue.length} öğesi senkronize edildi`,
        synced: queue.length
      });
    } catch (err) {
      console.error('Sync flush error:', err);
      return res.status(500).json({ error: 'Senkronizasyon başarısız' });
    }
  }
  
  // GET /api/offline?type=manifest - Get PWA manifest and offline data
  if (req.method === 'GET' && req.query.type === 'manifest') {
    try {
      return res.status(200).json({
        success: true,
        manifest: {
          name: 'LifeCoach AI',
          shortName: 'LifeCoach',
          description: 'Kişisel yapay zeka koçu',
          startUrl: '/',
          display: 'standalone',
          offlinePageUrl: '/offline.html',
          cacheStrategy: 'network-first'
        },
        offlineCapabilities: {
          chatHistoryAccess: true,
          goalsViewable: true,
          habitsTrackable: true,
          quitsSync: true
        }
      });
    } catch (err) {
      console.error('Manifest error:', err);
      return res.status(500).json({ error: 'Manifest alınamadı' });
    }
  }
  
  res.status(405).json({ error: 'Method not allowed' });
}
