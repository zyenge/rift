import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthPayload } from '../middleware/auth';

export function initSocketServer(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // JWT auth handshake
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) {
      return next(new Error('Authentication error: missing token'));
    }
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
      (socket as typeof socket & { user: AuthPayload }).user = payload;
      next();
    } catch {
      next(new Error('Authentication error: invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = (socket as typeof socket & { user: AuthPayload }).user;
    console.log(`[Socket] User ${user.userId} connected`);

    // Client joins a request room to receive real-time fulfillment updates
    socket.on('join:request', (requestId: string) => {
      socket.join(`request:${requestId}`);
      console.log(`[Socket] User ${user.userId} joined room request:${requestId}`);
    });

    socket.on('leave:request', (requestId: string) => {
      socket.leave(`request:${requestId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] User ${user.userId} disconnected`);
    });
  });

  return io;
}

// Exported so routes can emit events
let _io: SocketServer | null = null;

export function setIo(io: SocketServer): void {
  _io = io;
}

export function getIo(): SocketServer {
  if (!_io) throw new Error('Socket.io not initialized');
  return _io;
}
