import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import Avatar from '../ui/Avatar';
import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';

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
const SendIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22,2 15,22 11,13 2,9"/>
  </svg>
);

export default function PostCard({ post: initialPost, onDelete }) {
  const { user } = useAuth();
  const [post, setPost] = useState(initialPost);
  const [comment, setComment] = useState('');
  const [showComments, setShowComments] = useState(false);

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
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      const { data } = await api.post(`/posts/${post._id}/comment`, { content: comment });
      setPost(prev => ({ ...prev, comments: [...(prev.comments || []), data] }));
      setComment('');
    } catch {}
  };

  const timeAgo = (date) => {
    const s = Math.floor((Date.now() - new Date(date)) / 1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s/60)}min`;
    if (s < 86400) return `${Math.floor(s/3600)}h`;
    return `${Math.floor(s/86400)}j`;
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
          <button
            onClick={() => { if (window.confirm('Supprimer ce post ?')) { api.delete(`/posts/${post._id}`).then(() => onDelete?.(post._id)); } }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 20 }}
          >⋯</button>
        )}
      </div>

      {/* Image */}
      <img
        className="post-image"
        src={`${API_URL}${post.imageUrl}`}
        alt={post.caption || 'post'}
        onDoubleClick={handleLike}
      />

      {/* Actions */}
      <div className="post-actions">
        <button className={`post-action-btn ${liked ? 'liked' : ''}`} onClick={handleLike}>
          <HeartIcon filled={liked} />
        </button>
        <button className="post-action-btn" onClick={() => setShowComments(v => !v)}>
          <CommentIcon />
        </button>
        <button className="post-action-btn">
          <SendIcon />
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

      {/* Comments preview */}
      {post.comments?.length > 0 && (
        <div className="post-comments-preview" onClick={() => setShowComments(v => !v)}>
          {showComments ? 'Masquer les commentaires' : `Voir les ${post.comments.length} commentaire${post.comments.length > 1 ? 's' : ''}`}
        </div>
      )}

      {showComments && (
        <div style={{ padding: '6px 14px' }}>
          {post.comments?.map((c, i) => (
            <div key={i} style={{ fontSize: 14, marginBottom: 4 }}>
              <Link to={`/${c.user?.username}`} style={{ fontWeight: 600, marginRight: 6, textDecoration: 'none', color: 'inherit' }}>
                {c.user?.username}
              </Link>
              {c.content}
            </div>
          ))}
        </div>
      )}

      {/* Time */}
      <div className="post-time">{timeAgo(post.createdAt)}</div>

      {/* Comment input */}
      <div className="comment-input-row">
        <Avatar user={user} size={28} />
        <input
          placeholder="Ajouter un commentaire…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleComment(e)}
        />
        <button className="comment-post-btn" onClick={handleComment} disabled={!comment.trim()}>
          Publier
        </button>
      </div>
    </div>
  );
}
