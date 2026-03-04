import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ?? 'http://localhost:3000';

type SocketEvent = {
  event: string;
  handler: (...args: unknown[]) => void;
};

export function useSocket(events?: SocketEvent[]) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let socket: Socket;

    const connect = async () => {
      const token = await SecureStore.getItemAsync('jwt_token');
      if (!token) return;

      socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        console.log('[Socket] Connected:', socket.id);
      });

      socket.on('connect_error', (err) => {
        console.error('[Socket] Connection error:', err.message);
      });

      if (events) {
        for (const { event, handler } of events) {
          socket.on(event, handler);
        }
      }

      socketRef.current = socket;
    };

    connect();

    return () => {
      socket?.disconnect();
      socketRef.current = null;
    };
  }, []);

  return socketRef;
}

export function useRequestSocket(requestId: string, onFulfillmentNew: (f: unknown) => void, onFulfillmentUpdated: (f: unknown) => void) {
  const socketRef = useSocket([
    { event: 'fulfillment:new', handler: onFulfillmentNew },
    { event: 'fulfillment:updated', handler: onFulfillmentUpdated },
  ]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !requestId) return;

    const joinRoom = () => {
      socket.emit('join:request', requestId);
    };

    if (socket.connected) {
      joinRoom();
    } else {
      socket.on('connect', joinRoom);
    }

    return () => {
      socket.emit('leave:request', requestId);
      socket.off('connect', joinRoom);
    };
  }, [requestId, socketRef.current]);

  return socketRef;
}
