import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket?.id);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }

  return socket;
}

export function subscribeToTechStacks(techStacks: string[]): void {
  const s = getSocket();
  s.emit('subscribe', techStacks);
}

export function unsubscribeFromTechStacks(techStacks: string[]): void {
  const s = getSocket();
  s.emit('unsubscribe', techStacks);
}

export interface VulnerabilityEvent {
  id: string;
  cveId: string | null;
  title: string;
  description: string;
  url: string;
  source: string;
  severity: string | null;
  cvssScore: number | null;
  aiSummary: string | null;
  techStacks?: Array<{ techStack: { name: string } }>;
  notification?: {
    id: string;
    title: string;
    severity: string | null;
  };
}

export interface NotificationEvent {
  type: string;
  title: string;
  content: string;
  vulnerabilityId?: string;
  severity?: string;
}

export function onNewVulnerability(callback: (vuln: VulnerabilityEvent) => void): () => void {
  const s = getSocket();
  s.on('vulnerability:new', callback);
  return () => s.off('vulnerability:new', callback);
}

export function onNotification(callback: (notification: NotificationEvent) => void): () => void {
  const s = getSocket();
  s.on('notification', callback);
  return () => s.off('notification', callback);
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
