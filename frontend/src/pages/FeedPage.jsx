import { useState, useEffect } from 'react';
import api from '../utils/api';
import PostCard from '../components/posts/PostCard';
import StoriesRow from '../components/posts/StoriesRow';
import Suggestions from '../components/ui/Suggestions';
import { useAuth } from '../context/AuthContext';

export default function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts]         = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [hasMore, setHasMore]     = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/posts/feed?page=1&limit=10'),
      api.get(`/users/${user.username}`),
    ]).then(([postsRes, profileRes]) => {
      setPosts(postsRes.data);
      setHasMore(postsRes.data.length === 10);
      setPage(2);
      setFollowing(profileRes.data.user.following || []);
    }).finally(() => setLoading(false));
  }, []);

  const loadMore = async () => {
    const { data } = await api.get(`/posts/feed?page=${page}&limit=10`);
    setPosts(prev => [...prev, ...data]);
    setHasMore(data.length === 10);
    setPage(p => p + 1);
  };

  const handleDelete = (id) => setPosts(prev => prev.filter(p => p._id !== id));

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
  <div style={{ display: 'flex', maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
    
    {/* Fil principal centré */}
    <div style={{ flex: '0 0 470px', maxWidth: 470 }}>
      <StoriesRow following={following} />
      {posts.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📸</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Votre fil est vide</div>
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>
            Suivez des comptes dans les suggestions →
          </div>
        </div>
      ) : (
        <>
          {posts.map(post => (
            <PostCard key={post._id} post={post} onDelete={handleDelete} />
          ))}
          {hasMore && (
            <button className="btn btn-secondary btn-full" onClick={loadMore} style={{ marginTop: 8 }}>
              Charger plus
            </button>
          )}
        </>
      )}
    </div>

    {/* Sidebar suggestions — collée au fil */}
    <div style={{ 
      flex: '0 0 300px', 
      marginLeft: 48, 
      paddingTop: 8,
      position: 'sticky',
      top: 24,
      alignSelf: 'flex-start',
    }}>
      <Suggestions />
    </div>

  </div>
);
}