import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Avatar from '../components/ui/Avatar';
import { useAuth } from '../context/AuthContext';

export default function MessagesPage() {
  const { userId } = useParams();
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv]       = useState(null);
  const [messages, setMessages]           = useState([]);
  const [input, setInput]                 = useState('');
  const [sending, setSending]             = useState(false);
  const [typing, setTyping]               = useState(false);
  const bottomRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimer = useRef(null);

  // Charger conversations
  useEffect(() => {
    api.get('/messages/conversations').then(({ data }) => {
      setConversations(data);
      if (userId) {
        const found = data.find(c => c.participant._id === userId);
        if (found) setActiveConv(found.participant);
        else {
          // Nouvelle conversation — chercher le user
          api.get(`/users/search?q=`).then().catch();
          setActiveConv({ _id: userId });
        }
      }
    });
  }, [userId]);

  // Charger les messages quand conversation change
  useEffect(() => {
    if (!activeConv?._id) return;
    api.get(`/messages/${activeConv._id}`).then(({ data }) => {
      setMessages(data);
      scrollToBottom();
    });
  }, [activeConv]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  // Socket.io
  useEffect(() => {
    const s = require('socket.io-client').io(
      process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000',
      { withCredentials: true }
    );
    socketRef.current = s;
    s.emit('user:join', me._id);

    s.on('message:receive', (msg) => {
      if (msg.sender?._id === activeConv?._id || msg.from === activeConv?._id) {
        setMessages(prev => [...prev, msg]);
      }
      setConversations(prev => prev.map(c =>
        c.participant._id === (msg.from || msg.sender?._id)
          ? { ...c, lastMessage: msg, unread: c.unread + 1 }
          : c
      ));
    });

    s.on('typing:update', ({ from, isTyping }) => {
      if (from === activeConv?._id) setTyping(isTyping);
    });

    return () => s.disconnect();
  }, [me._id, activeConv?._id]);

  const scrollToBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || !activeConv?._id || sending) return;
    setSending(true);
    try {
      const { data } = await api.post(`/messages/${activeConv._id}`, { content: input });
      setMessages(prev => [...prev, data]);
      setInput('');
      // Update conversations preview
      setConversations(prev => {
        const cid = [me._id, activeConv._id].sort().join('_');
        const exists = prev.find(c => c.participant._id === activeConv._id);
        if (exists) return prev.map(c => c.participant._id === activeConv._id ? { ...c, lastMessage: data, unread: 0 } : c);
        return [{ conversationId: cid, participant: activeConv, lastMessage: data, unread: 0 }, ...prev];
      });
    } catch {}
    setSending(false);
  };

  const handleTyping = (v) => {
    setInput(v);
    if (!activeConv?._id) return;
    socketRef.current?.emit('typing:start', { to: activeConv._id, from: me._id, username: me.username });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socketRef.current?.emit('typing:stop', { to: activeConv._id, from: me._id });
    }, 1500);
  };

  const formatTime = (d) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="messages-layout" style={{ height: '100vh' }}>
      {/* Conversations list */}
      <div className="conversations-list">
        <div className="conv-header">Messages</div>
        {conversations.length === 0 && (
          <div style={{ padding: 20, color: 'var(--muted)', fontSize: 14, textAlign: 'center' }}>
            Aucune conversation
          </div>
        )}
        {conversations.map(conv => (
          <button
            key={conv.conversationId}
            className={`conv-item ${activeConv?._id === conv.participant._id ? 'active' : ''}`}
            onClick={() => { setActiveConv(conv.participant); navigate(`/messages/${conv.participant._id}`); }}
          >
            <Avatar user={conv.participant} size={44} />
            <div className="conv-info">
              <div className="conv-name">{conv.participant.username}</div>
              <div className="conv-preview">{conv.lastMessage?.content}</div>
            </div>
            {conv.unread > 0 && <div className="conv-unread">{conv.unread}</div>}
          </button>
        ))}
      </div>

      {/* Chat area */}
      <div className="chat-area">
        {!activeConv ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>Vos messages</div>
            <div style={{ fontSize: 14, marginTop: 4 }}>Envoyez des messages privés à vos amis</div>
          </div>
        ) : (
          <>
            <div className="chat-header">
              <Avatar user={activeConv} size={36} />
              <div>
                <div style={{ fontWeight: 600 }}>{activeConv.username || activeConv._id}</div>
                {activeConv.fullName && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{activeConv.fullName}</div>}
              </div>
            </div>

            <div className="messages-scroll">
              {messages.map((msg, i) => {
                const mine = (msg.sender?._id || msg.sender) === me._id;
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                    <div className={`message-bubble ${mine ? 'mine' : 'theirs'}`}>{msg.content}</div>
                    <div className="message-time">{formatTime(msg.createdAt)}</div>
                  </div>
                );
              })}
              {typing && <div className="typing-indicator">{activeConv.username} est en train d'écrire…</div>}
              <div ref={bottomRef} />
            </div>

            <div className="message-input-row">
              <input
                className="input"
                placeholder="Message…"
                value={input}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend(e)}
              />
              <button className="btn btn-primary btn-sm" onClick={handleSend} disabled={!input.trim() || sending}>
                Envoyer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
