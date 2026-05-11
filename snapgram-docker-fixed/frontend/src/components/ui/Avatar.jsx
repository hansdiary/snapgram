const API_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';

export default function Avatar({ user, size = 40, style = {} }) {
  const src = user?.avatar ? `${API_URL}${user.avatar}` : null;
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
