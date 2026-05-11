import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import Avatar from './Avatar';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function Suggestions() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState([]);
  const [followed, setFollowed] = useState({});

  useEffect(() => {
    api.get('/users/suggestions').then(({ data }) => setSuggestions(data)).catch(() => {});
  }, []);

  const handleFollow = async (u) => {
    try {
      await api.post(`/users/${u._id}/follow`);
      setFollowed(prev => ({ ...prev, [u._id]: true }));
      toast.success(`Vous suivez ${u.username}`);
    } catch { toast.error('Erreur'); }
  };

  if (suggestions.length === 0) return null;

  return (
    <div style={{ width: 300, padding: '24px 0 0 32px', flexShrink: 0 }}>
      {/* Profil résumé */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Avatar user={user} size={44} />
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{user?.username}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>{user?.fullName}</div>
        </div>
        <Link to={`/${user?.username}`} style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600, color: '#0095F6', textDecoration: 'none' }}>
          Voir
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Suggestions pour vous</span>
      </div>

      {suggestions.map(u => (
        <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Link to={`/${u.username}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit', flex: 1, minWidth: 0 }}>
            <Avatar user={u} size={36} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.username}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {u.followersCount} abonné{u.followersCount !== 1 ? 's' : ''}
              </div>
            </div>
          </Link>
          {followed[u._id] ? (
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>✓</span>
          ) : (
            <button onClick={() => handleFollow(u)} style={{ background: 'none', border: 'none', color: '#0095F6', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
              Suivre
            </button>
          )}
        </div>
      ))}
    </div>
  );
}