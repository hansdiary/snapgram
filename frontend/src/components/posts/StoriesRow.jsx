import { useRef, useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../ui/Avatar';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const rawApi = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const API_URL = rawApi.startsWith('http') ? rawApi.replace('/api', '') : '';

export default function StoriesRow({ following = [] }) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [stories, setStories]     = useState([]); // groupées par user
  const [viewing, setViewing]     = useState(null); // { stories[], index, storyIndex }
  const [progress, setProgress]   = useState(0);
  const inputRef   = useRef(null);
  const timerRef   = useRef(null);
  const DURATION   = 5000; // 5s par story

  useEffect(() => {
    api.get('/posts/stories').then(({ data }) => {
      // Grouper par auteur
      const grouped = {};
      data.forEach(s => {
        const uid = s.author._id;
        if (!grouped[uid]) grouped[uid] = { user: s.author, stories: [] };
        grouped[uid].stories.push(s);
      });
      setStories(Object.values(grouped));
    }).catch(() => {});
  }, []);

  // Lecture automatique avec barre de progression
  useEffect(() => {
    if (!viewing) return;
    setProgress(0);
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) goNext();
    }, 50);
    return () => clearInterval(timerRef.current);
  }, [viewing?.index, viewing?.storyIndex]);

  const openStories = (groupIndex) => {
    setViewing({ index: groupIndex, storyIndex: 0 });
  };

  const goNext = () => {
    setViewing(prev => {
      if (!prev) return null;
      const group = stories[prev.index];
      if (prev.storyIndex < group.stories.length - 1) {
        return { ...prev, storyIndex: prev.storyIndex + 1 };
      } else if (prev.index < stories.length - 1) {
        return { index: prev.index + 1, storyIndex: 0 };
      }
      return null; // fin
    });
  };

  const goPrev = () => {
    setViewing(prev => {
      if (!prev) return null;
      if (prev.storyIndex > 0) return { ...prev, storyIndex: prev.storyIndex - 1 };
      if (prev.index > 0) return { index: prev.index - 1, storyIndex: 0 };
      return prev;
    });
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      form.append('caption', '');
      form.append('isStory', 'true');
      await api.post('/posts', form);
      toast.success('Story publiée ! (visible 24h)');
      // Recharger les stories
      const { data } = await api.get('/posts/stories');
      const grouped = {};
      data.forEach(s => {
        const uid = s.author._id;
        if (!grouped[uid]) grouped[uid] = { user: s.author, stories: [] };
        grouped[uid].stories.push(s);
      });
      setStories(Object.values(grouped));
    } catch {
      toast.error('Erreur');
    } finally {
      setUploading(false);
    }
  };

  const currentGroup   = viewing ? stories[viewing.index] : null;
  const currentStory   = currentGroup ? currentGroup.stories[viewing.storyIndex] : null;
  const totalInGroup   = currentGroup ? currentGroup.stories.length : 0;

  return (
    <>
      {/* Barre de stories */}
      <div className="stories-row">
        {/* Ma story — bouton upload */}
        <div className="story-item" onClick={() => inputRef.current?.click()}>
          <div style={{ position: 'relative' }}>
            <div className="story-ring" style={{ background: uploading ? '#ccc' : 'var(--accent-g)' }}>
              <div className="story-ring-inner">
                <Avatar user={user} size={52} />
              </div>
            </div>
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 20, height: 20, borderRadius: '50%',
              background: '#0095F6', border: '2px solid white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, color: '#fff', fontWeight: 700,
            }}>+</div>
          </div>
          <span className="story-label">{uploading ? '...' : 'Ma story'}</span>
          <input ref={inputRef} type="file" accept="image/*"
            style={{ display: 'none' }} onChange={handleUpload} />
        </div>

        {/* Stories des amis */}
        {stories.map((group, i) => (
          <div key={group.user._id} className="story-item" onClick={() => openStories(i)}>
            <div className="story-ring">
              <div className="story-ring-inner">
                <Avatar user={group.user} size={52} />
              </div>
            </div>
            <span className="story-label">{group.user.username}</span>
          </div>
        ))}

        {/* Amis sans story (suivis) */}
        {following
          .filter(f => !stories.find(s => s.user._id === f._id))
          .slice(0, 5)
          .map(u => (
            <div key={u._id} className="story-item" style={{ opacity: 0.5 }}>
              <div style={{ borderRadius: '50%', padding: 2, background: '#ccc' }}>
                <div className="story-ring-inner">
                  <Avatar user={u} size={52} />
                </div>
              </div>
              <span className="story-label">{u.username}</span>
            </div>
          ))}
      </div>

      {/* Viewer plein écran style Instagram/Facebook */}
      {viewing && currentStory && (
        <div style={{
          position: 'fixed', inset: 0, background: '#000',
          zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Image */}
          <img
            src={`${API_URL}${currentStory.imageUrl}`}
            alt=""
            style={{ maxHeight: '100vh', maxWidth: '100vw', objectFit: 'contain' }}
          />

          {/* Barres de progression */}
          <div style={{
            position: 'absolute', top: 12, left: 12, right: 12,
            display: 'flex', gap: 4,
          }}>
            {currentGroup.stories.map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 3, background: 'rgba(255,255,255,0.4)',
                borderRadius: 2, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  background: '#fff',
                  width: i < viewing.storyIndex ? '100%'
                       : i === viewing.storyIndex ? `${progress}%`
                       : '0%',
                  transition: i === viewing.storyIndex ? 'none' : undefined,
                }} />
              </div>
            ))}
          </div>

          {/* Header utilisateur */}
          <div style={{
            position: 'absolute', top: 28, left: 16,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Avatar user={currentGroup.user} size={36} />
            <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>
              {currentGroup.user.username}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
              {new Date(currentStory.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Fermer */}
          <button onClick={() => setViewing(null)} style={{
            position: 'absolute', top: 28, right: 16,
            background: 'none', border: 'none', color: '#fff',
            fontSize: 28, cursor: 'pointer', lineHeight: 1,
          }}>×</button>

          {/* Caption */}
          {currentStory.caption && (
            <div style={{
              position: 'absolute', bottom: 40, left: 0, right: 0,
              textAlign: 'center', color: '#fff',
              fontSize: 15, padding: '0 24px',
              textShadow: '0 1px 4px rgba(0,0,0,0.6)',
            }}>
              {currentStory.caption}
            </div>
          )}

          {/* Zones clic prev/next */}
          <div onClick={goPrev} style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: '35%', cursor: 'pointer',
          }} />
          <div onClick={goNext} style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: '35%', cursor: 'pointer',
          }} />
        </div>
      )}
    </>
  );
}