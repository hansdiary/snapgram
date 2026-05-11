import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import Avatar from '../ui/Avatar';
import { useAuth } from '../../context/AuthContext';

const rawApi = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const API_URL = rawApi.startsWith('http') ? rawApi.replace('/api', '') : '';

const HeartIcon = ({ filled }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? '#E1306C' : 'none'} stroke={filled ? '#E1306C' : 'currentColor'} strokeWidth={2}>
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
  </svg>
);
const CommentIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14H6L5,6"/><path d="M10,11v6"/><path d="M14,11v6"/><path d="M9,6V4h6v2"/>
  </svg>
);
const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

export default function PostCard({ post: initialPost, onDelete }) {
  const { user } = useAuth();
  const [post, setPost]             = useState(initialPost);
  const [comment, setComment]       = useState('');
  const [showComments, setShowComments] = useState(false);
  const [editingComment, setEditingComment] = useState(null); // { id, content }
  const [editContent, setEditContent] = useState('');
  const [showMenu, setShowMenu]     = useState(false);

  const liked = post.likes?.includes(user?._id);

  const handleLike = async () => {
    try {
      const { data } = await api.post(`/posts/${post._id}/like`);
      setPost(prev => ({
        ...prev,
        likes: data.liked
          ? [...(prev.likes || []), user._id]
          : (prev.likes || []).filter(id => id !== user._id),
      }));
    } catch {}
  };

  const handleComment = async (e) => {
    e?.preventDefault();
    if (!comment.trim()) return;
    try {
      const { data } = await api.post(`/posts/${post._id}/comment`, { content: comment });
      setPost(prev => ({ ...prev, comments: [...(prev.comments || []), data] }));
      setComment('');
      setShowComments(true);
    } catch {}
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`/posts/${post._id}/comment/${commentId}`);
      setPost(prev => ({ ...prev, comments: prev.comments.filter(c => c._id !== commentId) }));
    } catch {}
  };

  const handleEditComment = async (commentId) => {
    if (!editContent.trim()) return;
    try {
      const { data } = await api.put(`/posts/${post._id}/comment/${commentId}`, { content: editContent });
      setPost(prev => ({
        ...prev,
        comments: prev.comments.map(c => c._id === commentId ? { ...c, content: data.content } : c),
      }));
      setEditingComment(null);
    } catch {}
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Supprimer ce post ?')) return;
    try {
      await api.delete(`/posts/${post._id}`);
      onDelete?.(post._id);
    } catch {}
  };

  const timeAgo = (date) => {
    const s = Math.floor((Date.now() - new Date(date)) / 1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}min`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}j`;
  };

  return (
    <div className="card post-card">
      {/* Header */}
      <div className="post-header">
        <Link to={`/${post.author?.username}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit', flex: 1 }}>
          <Avatar user={post.author} size={36} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{post.author?.username}</div>
            {post.location && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{post.location}</div>}
          </div>
        </Link>

        {post.author?._id === user?._id && (
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowMenu(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--muted)', padding: '0 8px' }}>⋯</button>
            {showMenu && (
              <div style={{ position: 'absolute', right: 0, top: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', zIndex: 10, minWidth: 140, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                <button onClick={() => { setShowMenu(false); handleDeletePost(); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', color: '#E1306C', fontSize: 14 }}>
                  <TrashIcon /> Supprimer
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image */}
      <img className="post-image" src={`${API_URL}${post.imageUrl}`} alt={post.caption || 'post'} onDoubleClick={handleLike} />

      {/* Actions */}
      <div className="post-actions">
        <button className={`post-action-btn ${liked ? 'liked' : ''}`} onClick={handleLike}>
          <HeartIcon filled={liked} />
        </button>
        <button className="post-action-btn" onClick={() => setShowComments(v => !v)}>
          <CommentIcon />
        </button>
      </div>

      {/* Likes */}
      {(post.likes?.length > 0) && (
        <div className="post-likes">{post.likes.length} J'aime{post.likes.length > 1 ? 's' : ''}</div>
      )}

      {/* Caption */}
      {post.caption && (
        <div className="post-caption">
          <strong>{post.author?.username}</strong>{post.caption}
        </div>
      )}

      {/* Commentaires */}
      {post.comments?.length > 0 && (
        <button onClick={() => setShowComments(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 14px 4px', fontSize: 13, color: 'var(--muted)', textAlign: 'left' }}>
          {showComments ? 'Masquer' : `Voir les ${post.comments.length} commentaire${post.comments.length > 1 ? 's' : ''}`}
        </button>
      )}

      {showComments && (
        <div style={{ padding: '6px 14px 8px' }}>
          {post.comments?.map((c) => (
            <div key={c._id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
              <Avatar user={c.user} size={28} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 12, padding: '7px 12px' }}>
                {editingComment === c._id ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleEditComment(c._id)}
                      style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                      autoFocus
                    />
                    <button onClick={() => handleEditComment(c._id)} style={{ background: 'none', border: 'none', color: '#0095F6', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>OK</button>
                    <button onClick={() => setEditingComment(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 13, cursor: 'pointer' }}>✕</button>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 13 }}>
                      <Link to={`/${c.user?.username}`} style={{ fontWeight: 600, marginRight: 6, textDecoration: 'none', color: 'inherit' }}>
                        {c.user?.username}
                      </Link>
                      {c.content}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{timeAgo(c.createdAt)}</span>
                      {c.user?._id === user?._id && (
                        <>
                          <button onClick={() => { setEditingComment(c._id); setEditContent(c.content); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 3, fontSize: 11 }}>
                            <EditIcon /> Modifier
                          </button>
                          <button onClick={() => handleDeleteComment(c._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E1306C', display: 'flex', alignItems: 'center', gap: 3, fontSize: 11 }}>
                            <TrashIcon /> Supprimer
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--muted)', padding: '0 14px 10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {timeAgo(post.createdAt)}
      </div>

      {/* Saisie commentaire */}
      <div className="comment-input-row">
        <Avatar user={user} size={28} />
        <input
          placeholder="Ajouter un commentaire…"
          value={comment}
          onChange={e => setComment(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleComment(e)}
        />
        <button className="comment-post-btn" onClick={handleComment} disabled={!comment.trim()}>Publier</button>
      </div>
    </div>
  );
}