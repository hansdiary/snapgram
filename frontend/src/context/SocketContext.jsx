import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null); // ✅ state au lieu de ref

  useEffect(() => {
    if (!user) return;

    const newSocket = io("http://136.112.28.143", {
      path: "/socket.io/",
      transports: ["websocket"],
    });

    socketRef.current = newSocket;
    setSocket(newSocket); // ✅ déclenche un re-render avec le vrai socket

    newSocket.on("connect", () => {
      console.log("✅ Socket connecté:", newSocket.id);
      newSocket.emit("user:join", user._id);
    });

    newSocket.on("connect_error", (err) => {
      console.error("❌ Socket error:", err.message);
    });

    return () => {
      newSocket.off("connect");
      newSocket.off("connect_error");
      newSocket.disconnect();
      setSocket(null);
    };
  }, [user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);