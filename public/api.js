import express from 'express';
import * as planService from '../services/planService.js';
import * as focusService from '../services/focusService.js';
import * as goalService from '../services/goalService.js';

const router = express.Router();

// --- Daily Plan Routes ---
router.post('/plan/generate', async (req, res) => {
    try {
        const result = await planService.createDailyPlan(req.user.id, req.body);
        res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

router.get('/plan/today', async (req, res) => {
    try {
        const result = await planService.getTodayPlan(req.user.id);
        res.json(result || { message: "Bugün için plan yok." });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Focus Mode Routes ---
router.post('/focus/start', async (req, res) => {
    try {
        const result = await focusService.startFocusSession(req.user.id);
        res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post('/focus/end', async (req, res) => {
    try {
        const { sessionId } = req.body;
        const result = await focusService.endFocusSession(req.user.id, sessionId);
        res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Goal Routes (Advanced) ---
router.post('/goals/advanced', async (req, res) => {
    try {
        const result = await goalService.createGoal(req.user.id, req.body);
        res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- AI Goal Routes (Feature 5) ---
router.post('/goals/analyze', async (req, res) => {
    try {
        const { text } = req.body;
        const analysis = await goalService.analyzeGoal(req.user.id, text);
        res.json(analysis);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post('/goals/confirm', async (req, res) => {
    try {
        const result = await goalService.createConfirmedGoal(req.user.id, req.body);
        res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

export default router;