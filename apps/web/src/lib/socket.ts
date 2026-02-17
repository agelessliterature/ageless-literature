import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initSocket = (token?: string): Socket => {
  if (!socket) {
    // Use explicit socket URL or empty (relative, for same-origin)
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '';

    socket = io(socketUrl, {
      auth: {
        token: token || '',
      },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });
  }

  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default { initSocket, getSocket, disconnectSocket };
