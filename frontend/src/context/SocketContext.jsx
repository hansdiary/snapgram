import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user) return;

    // ✅ Même origine que le frontend — l'Ingress GCE route /socket.io/* vers le backend
    const newSocket = io(window.location.origin, {
      path: "/socket.io/",
      transports: ["polling"],
    });

    socketRef.current = newSocket;
    setSocket(newSocket);comment 

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