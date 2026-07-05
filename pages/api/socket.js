/**
 * WebSocket (Socket.IO) — Real-time communication hub.
 * 
 * Integration instructions:
 * 1. Install: npm install socket.io socket.io-client
 * 2. This file runs as a Next.js custom server or a separate process.
 * 3. Run with: node pages/api/socket.js (or integrate into server.js)
 * 
 * Architecture:
 * ┌────────────┐     ┌──────────────┐     ┌────────────┐
 * │  Browser    │────▶│  Socket.IO   │────▶│  AI Models │
 * │ (Client)    │◀────│  (Server)    │◀────│  (Backend) │
 * └────────────┘     └──────────────┘     └────────────┘
 * 
 * Events:
 * - client → server: "audio:chunk" (streaming audio input)
 * - client → server: "video:frame" (camera frames for HAN Vision)
 * - client → server: "message" (text message)
 * - server → client: "ai:token" (streaming AI response tokens)
 * - server → client: "ai:sentence" (complete sentence for TTS)
 * - server → client: "vision:analysis" (HAN Vision results)
 * 
 * This replaces HTTP polling with persistent bidirectional connection.
 */

// Socket.IO Server (run separately or integrate with Next.js custom server)
/*
import { Server } from 'socket.io';

const io = new Server({
  cors: {
    origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log('[Socket] Connected:', socket.id);
  
  socket.on('message', async (data) => {
    // Process message, stream response back
    const { text, audio, history } = data;
    // ... call AI model, emit 'ai:token' events ...
  });
  
  socket.on('audio:chunk', (chunk) => {
    // Accumulate audio chunks, process when complete
  });
  
  socket.on('video:frame', (frame) => {
    // Send frame to HAN Vision / qwen-vl-plus for analysis
  });
  
  socket.on('disconnect', () => {
    console.log('[Socket] Disconnected:', socket.id);
  });
});

const PORT = process.env.SOCKET_PORT || 3001;
io.listen(PORT);
console.log(`[Socket] Server running on port ${PORT}`);
*/

export default function handler(req, res) {
  res.status(200).json({ 
    status: 'WebSocket not active',
    instructions: 'Run Socket.IO server separately on port 3001',
    setup: 'npm install socket.io && node pages/api/socket.js'
  });
}
