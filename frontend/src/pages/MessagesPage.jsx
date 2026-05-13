import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Avatar from '../components/ui/Avatar';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function MessagesPage() {
  const { userId } = useParams();
  const { user: me } = useAuth();
  const navigate = useNavigate();

  const socket = useSocket(); // ✅ SOCKET GLOBAL (IMPORTANT)

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);

  const bottomRef = useRef(null);
  const typingTimer = useRef(null);

  // =========================
  // LOAD CONVERSATIONS
  // =========================
  useEffect(() => {
    api.get('/messages/conversations').then(({ data }) => {
      setConversations(data);

      if (userId) {
        const found = data.find(c => c.participant._id === userId);

        if (found) {
          setActiveConv(found.participant);
        } else {
          setActiveConv({ _id: userId });
        }
      }
    });
  }, [userId]);

  // =========================
  // LOAD MESSAGES
  // =========================
  useEffect(() => {
    if (!activeConv?._id) return;

    api.get(`/messages/${activeConv._id}`).then(({ data }) => {
      setMessages(data);
      scrollToBottom();
    });
  }, [activeConv]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  // =========================
  // SOCKET EVENTS (PROPRE)
  // =========================
  useEffect(() => {
    if (!socket || !me?._id) return;

    socket.emit('user:join', me._id);

    const handleReceive = (msg) => {
      if (
        msg.sender?._id === activeConv?._id ||
        msg.from === activeConv?._id
      ) {
        setMessages(prev => [...prev, msg]);
      }

      setConversations(prev =>
        prev.map(c =>
          c.participant._id === (msg.from || msg.sender?._id)
            ? {
                ...c,
                lastMessage: msg,
                unread: (c.unread || 0) + 1,
              }
            : c
        )
      );
    };

    const handleTyping = ({ from, isTyping }) => {
      if (from === activeConv?._id) {
        setTyping(isTyping);
      }
    };

    socket.on('message:receive', handleReceive);
    socket.on('typing:update', handleTyping);

    return () => {
      socket.off('message:receive', handleReceive);
      socket.off('typing:update', handleTyping);
    };
  }, [socket, me?._id, activeConv?._id]);

  // =========================
  // SEND MESSAGE
  // =========================
  const handleSend = async (e) => {
    e?.preventDefault();

    if (!input.trim() || !activeConv?._id || sending) return;

    setSending(true);

    try {
      const { data } = await api.post(
        `/messages/${activeConv._id}`,
        { content: input }
      );

      setMessages(prev => [...prev, data]);
      setInput('');

      setConversations(prev => {
        const exists = prev.find(
          c => c.participant._id === activeConv._id
        );

        if (exists) {
          return prev.map(c =>
            c.participant._id === activeConv._id
              ? {
                  ...c,
                  lastMessage: data,
                  unread: 0,
                }
              : c
          );
        }

        const cid = [me._id, activeConv._id].sort().join('_');

        return [
          {
            conversationId: cid,
            participant: activeConv,
            lastMessage: data,
            unread: 0,
          },
          ...prev,
        ];
      });
    } catch (err) {
      console.error(err);
    }

    setSending(false);
  };

  // =========================
  // TYPING
  // =========================
  const handleTyping = (v) => {
    setInput(v);

    if (!socket || !activeConv?._id) return;

    socket.emit('typing:start', {
      to: activeConv._id,
      from: me._id,
      username: me.username,
    });

    clearTimeout(typingTimer.current);

    typingTimer.current = setTimeout(() => {
      socket.emit('typing:stop', {
        to: activeConv._id,
        from: me._id,
      });
    }, 1500);
  };

  const formatTime = (d) =>
    new Date(d).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

  // =========================
  // UI
  // =========================
  return (
    <div className="messages-layout" style={{ height: '100vh' }}>
      {/* CONVERSATIONS */}
      <div className="conversations-list">
        <div className="conv-header">Messages</div>

        {conversations.map(conv => (
          <button
            key={conv.conversationId}
            className={`conv-item ${
              activeConv?._id === conv.participant._id ? 'active' : ''
            }`}
            onClick={() => {
              setActiveConv(conv.participant);
              navigate(`/messages/${conv.participant._id}`);
            }}
          >
            <Avatar user={conv.participant} size={44} />

            <div className="conv-info">
              <div className="conv-name">
                {conv.participant.username}
              </div>
              <div className="conv-preview">
                {conv.lastMessage?.content}
              </div>
            </div>

            {conv.unread > 0 && (
              <div className="conv-unread">{conv.unread}</div>
            )}
          </button>
        ))}
      </div>

      {/* CHAT */}
      <div className="chat-area">
        {!activeConv ? (
          <div style={{ padding: 20 }}>Select a conversation</div>
        ) : (
          <>
            <div className="chat-header">
              <Avatar user={activeConv} size={36} />
              <div>{activeConv.username || activeConv._id}</div>
            </div>

            <div className="messages-scroll">
              {messages.map((msg, i) => {
                const mine =
                  (msg.sender?._id || msg.sender) === me._id;

                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: mine ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div
                      className={`message-bubble ${
                        mine ? 'mine' : 'theirs'
                      }`}
                    >
                      {msg.content}
                    </div>

                    <div className="message-time">
                      {formatTime(msg.createdAt)}
                    </div>
                  </div>
                );
              })}

              {typing && (
                <div className="typing-indicator">
                  {activeConv.username} is typing...
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            <div className="message-input-row">
              <input
                className="input"
                value={input}
                placeholder="Message..."
                onChange={(e) => handleTyping(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && handleSend(e)
                }
              />

              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
              >
                Envoyer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}