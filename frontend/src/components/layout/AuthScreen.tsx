import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Github, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { register, login } from '../../api/auth.api';
import type { AuthSession } from '../../lib/types';

type Props = {
  onAuthenticated: (session: AuthSession) => void;
};

export function AuthScreen({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<'sign-in' | 'register'>('sign-in');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: 'editor@example.com',
    username: 'editorial',
    password: 'Password123!',
    password_confirm: 'Password123!',
    bio: 'Curating a wardrobe OS with editorial precision.',
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const session =
        mode === 'sign-in'
          ? await login(form.email, form.password)
          : await register(form);
      onAuthenticated(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <motion.aside
        className="auth-visual"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="auth-brand">CHARIS</div>
        <div className="auth-visual-copy">
          <p className="eyebrow">Wardrobe OS</p>
          <h1>Curate your personal sartorial narrative.</h1>
          <p>
            Organize, style, and share your collection with editorial precision and
            AI-guided intelligence.
          </p>
        </div>
        <div className="auth-visual-footnote">
          <span>Designer-grade workflow</span>
          <span>Recharts + Framer Motion</span>
        </div>
      </motion.aside>

      <motion.main
        className="auth-panel"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.12 }}
      >
        <div className="auth-panel-header">
          <div>
            <p className="eyebrow">Charis</p>
            <h2>Wardrobe OS</h2>
          </div>
          <div className="auth-toggle">
            <button className={mode === 'sign-in' ? 'active' : ''} onClick={() => setMode('sign-in')} type="button">
              Sign In
            </button>
            <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')} type="button">
              Create Account
            </button>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span>Email Address</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="editor@example.com"
            />
          </label>
          {mode === 'register' && (
            <label>
              <span>Username</span>
              <input
                value={form.username}
                onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                placeholder="editorial"
              />
            </label>
          )}
          <label className="password-field">
            <div className="label-row">
              <span>Password</span>
              <button type="button" onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="Password123!"
            />
          </label>
          {mode === 'register' && (
            <label>
              <span>Confirm Password</span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password_confirm}
                onChange={(event) => setForm((current) => ({ ...current, password_confirm: event.target.value }))}
                placeholder="Password123!"
              />
            </label>
          )}

          {mode === 'register' && (
            <label>
              <span>Bio</span>
              <textarea
                rows={4}
                value={form.bio}
                onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
                placeholder="A short editorial bio."
              />
            </label>
          )}

          {error && <div className="form-error">{error}</div>}

          <Button type="submit" size="lg" disabled={loading}>
            {loading ? 'Working...' : mode === 'sign-in' ? 'Enter Workspace' : 'Create Workspace'}
            <ArrowRight size={18} />
          </Button>
        </form>

        <div className="auth-divider">
          <span>or continue with</span>
        </div>

        <div className="social-login">
          <Button type="button" variant="outline">
            <Github size={18} />
            GitHub
          </Button>
          <Button type="button" variant="outline">
            Demo user
          </Button>
        </div>
      </motion.main>
    </div>
  );
}
