import './config/env'; // validate env first
import express from 'express';
import http from 'http';
import cors from 'cors';
import { env } from './config/env';
import { redis } from './config/redis';
import { errorHandler } from './middleware/errorHandler';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import requestsRouter from './routes/requests';
import fulfillmentsRouter from './routes/fulfillments';
import { initSocketServer, setIo } from './sockets/fulfillment.socket';
import { startExpiryJob } from './services/expiry.service';

const app = express();
const httpServer = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/requests', requestsRouter);
// Fulfillment routes — both prefixes for convenience
app.use('/api/v1/requests', fulfillmentsRouter);
app.use('/api/v1/fulfillments', fulfillmentsRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

// Socket.io
const io = initSocketServer(httpServer);
setIo(io);

// Background jobs
startExpiryJob();

// Start
async function main() {
  try {
    await redis.connect();
    console.log('✅ Redis connected');
  } catch (err) {
    console.error('Redis connection failed:', err);
  }

  httpServer.listen(env.PORT, () => {
    console.log(`🚀 Rift API running on http://localhost:${env.PORT}`);
    console.log(`🔌 Socket.io ready`);
  });
}

main();
