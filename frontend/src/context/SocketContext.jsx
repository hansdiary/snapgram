import { createContext, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    socketRef.current = io(window.location.origin, {
      path: '/socket.io/',
      // Forcer polling uniquement — Apache ne supporte pas l'upgrade WebSocket
      transports: ['polling'],
      withCredentials: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current.on('connect', () => {
      console.log('Socket connecté via polling');
      socketRef.current.emit('user:join', user._id);
    });

    socketRef.current.on('connect_error', (err) => {
      console.warn('Socket erreur:', err.message);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [user?._id]);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);