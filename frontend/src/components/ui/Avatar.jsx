const rawApi = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const API_URL = rawApi.startsWith('http') ? rawApi.replace('/api', '') : '';

export default function Avatar({ user, size = 40, style = {} }) {
  // ✅ Si l'avatar commence par http, c'est déjà une URL complète (GCS)
  // Sinon on préfixe avec l'API locale
  const src = user?.avatar
    ? user.avatar.startsWith('http')
      ? user.avatar
      : `${API_URL}${user.avatar}`
    : null;

  const initials = (user?.fullName || user?.username || '?')[0].toUpperCase();

  if (src) {
    return (
      <img
        className="avatar"
        src={src}
        alt={user?.username}
        width={size}
        height={size}
        style={{ width: size, height: size, ...style }}
        onError={(e) => { e.target.style.display = 'none'; }}
      />
    );
  }

  return (
    <div
      className="avatar-placeholder"
      style={{ width: size, height: size, fontSize: size * 0.38, ...style }}
    >
      {initials}
    </div>
  );
}