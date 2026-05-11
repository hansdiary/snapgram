import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import Avatar from './Avatar';

export default function SearchBar() {
  const [q, setQ]       = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen]   = useState(false);
  const timerRef = useRef(null);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = (v) => {
    setQ(v);
    clearTimeout(timerRef.current);
    if (!v) { setResults([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/users/search?q=${v}`);
        setResults(data);
        setOpen(true);
      } catch {}
    }, 300);
  };

  return (
    <div className="search-bar" ref={ref} style={{ position: 'relative', marginBottom: 8 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input
        className="input"
        placeholder="Rechercher…"
        value={q}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
      />
      {open && results.length > 0 && (
        <div className="search-results">
          {results.map(u => (
            <Link
              key={u._id}
              to={`/${u.username}`}
              className="search-result-item"
              onClick={() => { setOpen(false); setQ(''); }}
            >
              <Avatar user={u} size={32} />
              <div>
                <div style={{ fontWeight: 600 }}>{u.username}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{u.fullName}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
