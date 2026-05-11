import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../ui/Avatar';
import SearchBar from '../ui/SearchBar';
import NewPostModal from '../posts/NewPostModal';

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9,22 9,12 15,12 15,22"/>
  </svg>
);
const ExploreIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const MsgIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </svg>
);
const AddIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="3" width="18" height="18" rx="3"/>
    <line x1="12" y1="8" x2="12" y2="16"/>
    <line x1="8" y1="12" x2="16" y2="12"/>
  </svg>
);
const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
    <polyline points="16,17 21,12 16,7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showNewPost, setShowNewPost] = useState(false);

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <nav className="sidebar">
        <div className="logo">Snapgram</div>

        <SearchBar />

        <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <HomeIcon /> Accueil
        </NavLink>
        <NavLink to="/explore" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <ExploreIcon /> Explorer
        </NavLink>
        <NavLink to="/messages" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <MsgIcon /> Messages
        </NavLink>
        <button className="nav-item" onClick={() => setShowNewPost(true)}>
          <AddIcon /> Nouveau post
        </button>

        <div className="nav-divider" />

        <NavLink to={`/${user?.username}`} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Avatar user={user} size={24} />
          {user?.username}
        </NavLink>
        <button className="nav-item" onClick={() => { logout(); navigate('/login'); }}>
          <LogoutIcon /> Se déconnecter
        </button>
      </nav>

      {/* Main */}
      <main className="main-content">
        <Outlet />
      </main>

      {showNewPost && <NewPostModal onClose={() => setShowNewPost(false)} />}
    </div>
  );
}
