import { useState, useEffect } from 'react';
import api from '../utils/api';
import PostCard from '../components/posts/PostCard';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/ui/Avatar';

export default function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchPosts(1);
  }, []);

  const fetchPosts = async (p = page) => {
    try {
      const { data } = await api.get(`/posts/feed?page=${p}&limit=10`);
      if (p === 1) setPosts(data);
      else setPosts(prev => [...prev, ...data]);
      setHasMore(data.length === 10);
      setPage(p + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => setPosts(prev => prev.filter(p => p._id !== id));

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="feed-wrapper">
      {/* Stories placeholder */}
      <div className="stories-row">
        <div className="story-item">
          <div className="story-ring">
            <div className="story-ring-inner">
              <Avatar user={user} size={52} />
            </div>
          </div>
          <span className="story-label">Votre story</span>
        </div>
        {['Alice', 'Marc', 'Lucie', 'Tom', 'Sara'].map((name) => (
          <div key={name} className="story-item">
            <div className="story-ring">
              <div className="story-ring-inner">
                <div className="avatar-placeholder" style={{ width: 52, height: 52, fontSize: 20 }}>
                  {name[0]}
                </div>
              </div>
            </div>
            <span className="story-label">{name}</span>
          </div>
        ))}
      </div>

      {posts.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📸</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Votre fil est vide</div>
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>Suivez des comptes pour voir leurs posts ici</div>
        </div>
      ) : (
        <>
          {posts.map(post => (
            <PostCard key={post._id} post={post} onDelete={handleDelete} />
          ))}
          {hasMore && (
            <button className="btn btn-secondary btn-full" onClick={() => fetchPosts()} style={{ marginTop: 8 }}>
              Charger plus
            </button>
          )}
        </>
      )}
    </div>
  );
}
