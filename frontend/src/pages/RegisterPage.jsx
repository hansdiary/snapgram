import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]     = useState({ email: '', fullName: '', username: '', password: '' });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Mot de passe trop court (6 caractères minimum)');
    setLoading(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur d\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div>
        <div className="auth-card">
          <div className="auth-logo">Snapgram</div>
          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>
            Inscrivez-vous pour voir les photos de vos amis.
          </p>
          <form className="auth-form" onSubmit={handleSubmit}>
            <input className="input" type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
            <input className="input" placeholder="Nom complet" value={form.fullName} onChange={set('fullName')} />
            <input className="input" placeholder="Nom d'utilisateur" value={form.username} onChange={set('username')} required minLength={3} />
            <input className="input" type="password" placeholder="Mot de passe" value={form.password} onChange={set('password')} required minLength={6} />
            <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
              {loading ? 'Inscription…' : 'S\'inscrire'}
            </button>
            <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
              En vous inscrivant, vous acceptez nos conditions d'utilisation.
            </p>
          </form>
        </div>
        <div className="auth-link">
          Vous avez déjà un compte ? <Link to="/login">Se connecter</Link>
        </div>
      </div>
    </div>
  );
}
