import { useState, useEffect } from 'react';
import api from '../utils/api';

const API_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';

export default function ExplorePage() {
  const [posts, setPosts]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get('/posts/explore?limit=30')
      .then(({ data }) => setPosts(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div style={{ padding: '16px 0' }}>
      <div className="explore-grid">
        {posts.map(post => (
          <div key={post._id} className="explore-item" onClick={() => setSelected(post)}>
            <img src={`${API_URL}${post.imageUrl}`} alt={post.caption} />
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 14,
              transition: 'background 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.35)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0)'}
            >
              ♥ {post.likes?.length || 0}
            </div>
          </div>
        ))}
      </div>

      {/* Quick post viewer */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, display: 'flex', maxWidth: 900, width: '95vw', maxHeight: '90vh', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>
            <img src={`${API_URL}${selected.imageUrl}`} alt="" style={{ width: '55%', objectFit: 'cover' }} />
            <div style={{ padding: 24, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>@{selected.author?.username}</div>
              {selected.caption && <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text)' }}>{selected.caption}</p>}
              <div style={{ marginTop: 12, color: 'var(--muted)', fontSize: 13 }}>♥ {selected.likes?.length || 0} J'aimes</div>
              <div style={{ marginTop: 4, color: 'var(--muted)', fontSize: 13 }}>💬 {selected.comments?.length || 0} commentaires</div>
              <button onClick={() => setSelected(null)} className="btn btn-secondary" style={{ marginTop: 20 }}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
