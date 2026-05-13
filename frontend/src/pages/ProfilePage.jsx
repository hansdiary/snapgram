import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Avatar from '../components/ui/Avatar';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/posts/PostCard';

const rawApi = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const API_URL = rawApi.startsWith('http') ? rawApi.replace('/api', '') : '';

export default function ProfilePage() {
  const { username } = useParams();
  const { user: me, updateUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile]   = useState(null);
  const [posts, setPosts]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [following, setFollowing] = useState(false);
  const [editMode, setEditMode]   = useState(false);
  const [editForm, setEditForm]   = useState({});
  const [selectedPost, setSelectedPost] = useState(null);

  const isMe = me?.username === username;

  useEffect(() => {
    setLoading(true);
    api.get(`/users/${username}`)
      .then(({ data }) => {
        setProfile(data.user);
        setPosts(data.posts);
        setFollowing(data.user.followers?.some(f => f._id === me?._id || f === me?._id));
        setEditForm({ fullName: data.user.fullName, bio: data.user.bio, website: data.user.website });
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [username]);

  const handleFollow = async () => {
    try {
      const { data } = await api.post(`/users/${profile._id}/follow`);
      setFollowing(data.followed);
      setProfile(prev => ({
        ...prev,
        followers: data.followed
          ? [...prev.followers, { _id: me._id, username: me.username }]
          : prev.followers.filter(f => f._id !== me._id),
      }));
    } catch { toast.error('Erreur'); }
  };

  // ✅ Upload avatar immédiatement dès la sélection du fichier
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const form = new FormData();
      form.append('avatar', file);
      form.append('fullName', profile.fullName || '');
      form.append('bio', profile.bio || '');
      form.append('website', profile.website || '');

      const { data } = await api.put('/users/profile/update', form);
      updateUser(data.user);
      setProfile(data.user);
      toast.success('Photo mise à jour');
    } catch {
      toast.error('Erreur upload photo');
    }
  };

  const handleEdit = async () => {
    try {
      const form = new FormData();
      Object.entries(editForm).forEach(([k, v]) => {
        if (k !== '_avatar') form.append(k, v || '');
      });

      const { data } = await api.put('/users/profile/update', form);
      updateUser(data.user);
      setProfile(data.user);
      setEditMode(false);
      toast.success('Profil mis à jour');
    } catch { toast.error('Erreur'); }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!profile) return null;

  return (
    <div style={{ paddingBottom: 40 }}>
      <div className="profile-header">
        {/* ✅ Click sur avatar => input fichier => upload immédiat */}
        <label htmlFor={isMe ? 'avatar-input' : undefined} style={{ cursor: isMe ? 'pointer' : 'default' }}>
          <Avatar user={profile} size={96} />
        </label>
        {isMe && (
          <input
            id="avatar-input"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
          />
        )}

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 4 }}>
            <h1 style={{ fontSize: 24, fontWeight: 300 }}>{profile.username}</h1>
            {isMe ? (
              <button className="btn btn-secondary btn-sm" onClick={() => setEditMode(v => !v)}>
                {editMode ? 'Annuler' : 'Modifier le profil'}
              </button>
            ) : (
              <>
                <button className={`btn btn-sm ${following ? 'btn-secondary' : 'btn-primary'}`} onClick={handleFollow}>
                  {following ? 'Ne plus suivre' : 'Suivre'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/messages/${profile._id}`)}>
                  Message
                </button>
              </>
            )}
          </div>

          <div className="profile-stats">
            <div className="profile-stat">
              <div className="profile-stat-num">{posts.length}</div>
              <div className="profile-stat-label">posts</div>
            </div>
            <div className="profile-stat">
              <div className="profile-stat-num">{profile.followers?.length || 0}</div>
              <div className="profile-stat-label">abonnés</div>
            </div>
            <div className="profile-stat">
              <div className="profile-stat-num">{profile.following?.length || 0}</div>
              <div className="profile-stat-label">abonnements</div>
            </div>
          </div>

          {!editMode ? (
            <>
              {profile.fullName && <div style={{ fontWeight: 600, fontSize: 14 }}>{profile.fullName}</div>}
              {profile.bio && <div style={{ fontSize: 14, marginTop: 4, whiteSpace: 'pre-line' }}>{profile.bio}</div>}
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 14, color: '#0095F6', textDecoration: 'none' }}>{profile.website}</a>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 300 }}>
              <input className="input" placeholder="Nom complet" value={editForm.fullName || ''} onChange={e => setEditForm(p => ({ ...p, fullName: e.target.value }))} />
              <textarea className="input" placeholder="Bio" rows={2} style={{ resize: 'none' }} value={editForm.bio || ''} onChange={e => setEditForm(p => ({ ...p, bio: e.target.value }))} />
              <input className="input" placeholder="Site web" value={editForm.website || ''} onChange={e => setEditForm(p => ({ ...p, website: e.target.value }))} />
              <button className="btn btn-primary btn-sm" onClick={handleEdit}>Enregistrer</button>
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      <div style={{ borderTop: '1px solid var(--border)', marginBottom: 16 }} />

      <div className="profile-grid">
        {posts.map(post => (
          <div key={post._id} className="explore-item" onClick={() => setSelectedPost(post)}>
            <img src={`${API_URL}${post.imageUrl}`} alt={post.caption} />
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 16, color: '#fff', fontWeight: 700, fontSize: 14,
              transition: 'background 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.45)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0)'}
            >
              <span>♥ {post.likes?.length || 0}</span>
              <span>💬 {post.comments?.length || 0}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal post */}
      {selectedPost && (
        <div className="modal-overlay" onClick={() => setSelectedPost(null)}>
          <div style={{ maxWidth: 500, width: '95vw' }} onClick={e => e.stopPropagation()}>
            <PostCard post={selectedPost} onDelete={(id) => { setPosts(p => p.filter(x => x._id !== id)); setSelectedPost(null); }} />
          </div>
        </div>
      )}

      {posts.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
          <div>Aucun post pour l'instant</div>
        </div>
      )}
    </div>
  );
}