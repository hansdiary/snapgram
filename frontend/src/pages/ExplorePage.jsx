import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import Avatar from '../components/ui/Avatar';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const rawApi = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const API_URL = rawApi.startsWith('http') ? rawApi.replace('/api', '') : '';

export default function ExplorePage() {
  const { user: me } = useAuth();
  const [posts, setPosts]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [hasMore, setHasMore]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [comment, setComment]   = useState('');
  const observerRef = useRef(null);
  const sentinelRef = useRef(null);

  const fetchPosts = useCallback(async (p) => {
    try {
      const { data } = await api.get(`/posts/explore?page=${p}&limit=12`);
      setPosts(prev => p === 1 ? data : [...prev, ...data]);
      setHasMore(data.length === 12);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPosts(1); }, []);

  // Pagination infinie
  useEffect(() => {
    if (!hasMore || loading) return;
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setPage(p => {
          fetchPosts(p + 1);
          return p + 1;
        });
      }
    }, { threshold: 0.1 });
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, loading]);

  const handleLike = async (post) => {
    try {
      const { data } = await api.post(`/posts/${post._id}/like`);
      const update = (p) => p._id === post._id
        ? { ...p, likes: data.liked
            ? [...(p.likes || []), me._id]
            : (p.likes || []).filter(id => id !== me._id) }
        : p;
      setPosts(prev => prev.map(update));
      if (selected?._id === post._id) setSelected(prev => update(prev));
    } catch { toast.error('Erreur'); }
  };

  const handleComment = async () => {
    if (!comment.trim() || !selected) return;
    try {
      const { data } = await api.post(`/posts/${selected._id}/comment`, { content: comment });
      setSelected(prev => ({ ...prev, comments: [...(prev.comments || []), data] }));
      setPosts(prev => prev.map(p => p._id === selected._id
        ? { ...p, comments: [...(p.comments || []), data] } : p));
      setComment('');
    } catch { toast.error('Erreur'); }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div style={{ padding: '16px 0' }}>
      <div className="explore-grid">
        {posts.map(post => {
          const liked = post.likes?.includes(me._id);
          return (
            <div key={post._id} className="explore-item" onClick={() => setSelected(post)}>
              <img src={`${API_URL}${post.imageUrl}`} alt={post.caption} />
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 20, color: '#fff', fontWeight: 700, fontSize: 15,
                transition: 'background 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.45)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0)'}
              >
                <span>♥ {post.likes?.length || 0}</span>
                <span>💬 {post.comments?.length || 0}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sentinel pagination infinie */}
      <div ref={sentinelRef} style={{ height: 40 }} />
      {!hasMore && posts.length > 0 && (
        <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)', fontSize: 13 }}>
          Vous avez tout vu !
        </div>
      )}

      {/* Modal post complet */}
      {selected && (
        <div className="modal-overlay" onClick={() => { setSelected(null); setComment(''); }}>
          <div
            style={{ background: 'var(--surface)', borderRadius: 12, display: 'flex', maxWidth: 900, width: '95vw', maxHeight: '90vh', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Image */}
            <img src={`${API_URL}${selected.imageUrl}`} alt="" style={{ width: '55%', objectFit: 'cover', flexShrink: 0 }} />

            {/* Détails */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                <Avatar user={selected.author} size={36} />
                <Link
                  to={`/${selected.author?.username}`}
                  style={{ fontWeight: 700, fontSize: 14, textDecoration: 'none', color: 'inherit' }}
                  onClick={() => setSelected(null)}
                >
                  {selected.author?.username}
                </Link>
                <button onClick={() => setSelected(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--muted)' }}>×</button>
              </div>

              {/* Caption + commentaires */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
                {selected.caption && (
                  <div style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 12 }}>
                    <strong style={{ marginRight: 6 }}>{selected.author?.username}</strong>
                    {selected.caption}
                  </div>
                )}
                {(selected.comments || []).map((c, i) => (
                  <div key={i} style={{ fontSize: 14, marginBottom: 8 }}>
                    <Link
                      to={`/${c.user?.username}`}
                      style={{ fontWeight: 600, marginRight: 6, textDecoration: 'none', color: 'inherit' }}
                      onClick={() => setSelected(null)}
                    >
                      {c.user?.username}
                    </Link>
                    {c.content}
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div style={{ borderTop: '1px solid var(--border)', padding: '10px 16px' }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <button
                    onClick={() => handleLike(selected)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, padding: 4 }}
                  >
                    {selected.likes?.includes(me._id) ? '❤️' : '🤍'}
                  </button>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, padding: 4 }}>💬</button>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  {selected.likes?.length || 0} J'aime{selected.likes?.length > 1 ? 's' : ''}
                </div>
              </div>

              {/* Saisie commentaire */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
                <input
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, fontFamily: 'inherit', background: 'transparent' }}
                  placeholder="Ajouter un commentaire…"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleComment()}
                />
                <button
                  onClick={handleComment}
                  disabled={!comment.trim()}
                  style={{ background: 'none', border: 'none', color: '#0095F6', fontWeight: 600, fontSize: 14, cursor: 'pointer', opacity: comment.trim() ? 1 : 0.4 }}
                >
                  Publier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}