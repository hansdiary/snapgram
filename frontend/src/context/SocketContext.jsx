import { createContext, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    // En prod Nginx proxifie /socket.io/, donc on utilise window.location.origin
    // En dev on pointe directement sur le backend
    const socketUrl = process.env.REACT_APP_SOCKET_URL || window.location.origin;

    socketRef.current = io(socketUrl, {
      withCredentials: true,
      path: '/socket.io/',
    });

    socketRef.current.emit('user:join', user._id);

    return () => {
      socketRef.current?.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);