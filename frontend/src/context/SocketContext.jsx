import { createContext, useContext, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    const SOCKET_URL =
      process.env.REACT_APP_SOCKET_URL ||
      "http://34.36.179.232";

    socketRef.current = io(SOCKET_URL, {
      path: "/socket.io/",
      transports: ["polling", "websocket"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current.on("connect", () => {
      console.log("✅ Socket connecté :", socketRef.current.id);

      socketRef.current.emit("user:join", user._id);
    });

    socketRef.current.on("connect_error", (err) => {
      console.error("❌ Socket error:", err.message);
    });

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