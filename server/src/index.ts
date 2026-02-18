import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cron from 'node-cron';

import { prisma } from './db.js';
import techStacksRouter from './routes/techStacks.js';
import vulnerabilitiesRouter from './routes/vulnerabilities.js';
import settingsRouter from './routes/settings.js';
import notificationsRouter from './routes/notifications.js';
import { runVulnerabilityCheck } from './jobs/vulnerabilityChecker.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/tech-stacks', techStacksRouter);
app.use('/api/vulnerabilities', vulnerabilitiesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/notifications', notificationsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Manual trigger for vulnerability check
app.post('/api/check-vulnerabilities', async (req, res) => {
  try {
    await runVulnerabilityCheck(io);
    res.json({ message: 'Vulnerability check completed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to run vulnerability check' });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('subscribe', (techStacks: string[]) => {
    techStacks.forEach(ts => socket.join(`tech-stack:${ts}`));
    console.log(`Socket ${socket.id} subscribed to tech stacks:`, techStacks);
  });

  socket.on('unsubscribe', (techStacks: string[]) => {
    techStacks.forEach(ts => socket.leave(`tech-stack:${ts}`));
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Scheduled job: Run vulnerability check every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  console.log('Running scheduled vulnerability check...');
  try {
    await runVulnerabilityCheck(io);
    console.log('Scheduled vulnerability check completed');
  } catch (error) {
    console.error('Scheduled vulnerability check failed:', error);
  }
});

export { io };

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`
  VulnPulse - Vulnerability Intelligence Platform
  Server running on http://localhost:${PORT}
  WebSocket ready
  Vulnerability check scheduled every 30 minutes
  `);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});
