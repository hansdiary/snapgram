import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

export default function NewPostModal({ onClose, onPosted }) {
  const [file, setFile]         = useState(null);
  const [preview, setPreview]   = useState(null);
  const [caption, setCaption]   = useState('');
  const [location, setLocation] = useState('');
  const [tags, setTags]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async () => {
    if (!file) return toast.error('Sélectionnez une image');
    setLoading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      form.append('caption', caption);
      form.append('location', location);
      form.append('tags', tags);
      const { data } = await api.post('/posts', form);
      toast.success('Post publié !');
      onPosted?.(data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <span>Nouveau post</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22 }}>×</button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!preview ? (
            <div
              className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <div style={{ fontSize: 40, marginBottom: 8 }}>📷</div>
              <div style={{ fontWeight: 600 }}>Glissez une photo ou cliquez</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>JPEG, PNG, GIF, WEBP — 10 Mo max</div>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <img src={preview} alt="preview" className="upload-preview" style={{ maxHeight: 360, objectFit: 'cover' }} />
              <button
                onClick={() => { setFile(null); setPreview(null); }}
                style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: '#fff', fontSize: 16 }}
              >×</button>
            </div>
          )}
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
          <textarea
            className="input"
            placeholder="Rédigez une légende…"
            rows={3}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            style={{ resize: 'none' }}
          />
          <input className="input" placeholder="Lieu" value={location} onChange={(e) => setLocation(e.target.value)} />
          <input className="input" placeholder="Tags (séparés par des virgules)" value={tags} onChange={(e) => setTags(e.target.value)} />
          <button className="btn btn-primary btn-full" onClick={handleSubmit} disabled={loading || !file}>
            {loading ? 'Publication…' : 'Partager'}
          </button>
        </div>
      </div>
    </div>
  );
}
