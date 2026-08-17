'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { login, register } from '@/api/auth.api';
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const [tab, setTab] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('editor@example.com');
  const [username, setUsername] = useState('editor');
  const [password, setPassword] = useState('Password123!');
  const [passwordConfirm, setPasswordConfirm] = useState('Password123!');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const { setSession } = useAuth();
  const router = useRouter();

  // Inline Validation Rules
  const isEmailValid = /\S+@\S+\.\S+/.test(email);
  const isPasswordValid = password.length >= 8;
  const isPasswordMatch = tab === 'signin' || password === passwordConfirm;
  const isUsernameValid = tab === 'signin' || username.trim().length >= 3;

  const isFormValid = isEmailValid && isPasswordValid && isPasswordMatch && isUsernameValid;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    setServerError('');
    try {
      let session;
      if (tab === 'signin') {
        session = await login(email, password);
      } else {
        session = await register(email, password, passwordConfirm, username);
      }
      setSession(session);
      router.push('/');
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-[#fff8f5]">
      {/* Left: Fashion Photo */}
      <div className="relative overflow-hidden bg-[#f5ece7] hidden md:block">
        <img
          src="https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=1080&q=90"
          alt="Editorial fashion"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute bottom-12 left-12 right-12">
          <p className="serif text-4xl font-bold text-white leading-tight drop-shadow-lg">
            Curate your personal<br />narrative.
          </p>
          <span className="text-xs uppercase tracking-widest text-white/80 mt-2 block font-sans">
            Charis Wardrobe Operating System
          </span>
        </div>
      </div>

      {/* Right: Auth Form */}
      <div className="flex items-center justify-center p-8 md:p-14 bg-white">
        <div className="w-full max-w-md flex flex-col gap-8">
          <div className="flex flex-col gap-1">
            <span className="serif text-3xl font-bold text-[#380208] tracking-tight">CHARIS</span>
            <span className="text-xs text-[#867272] tracking-widest uppercase">Wardrobe OS</span>
          </div>

          {/* Tab Switcher */}
          <div className="flex border-b border-[#d9c1c0]">
            <button
              type="button"
              className={`pb-3 mr-6 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                tab === 'signin' ? 'text-[#380208] border-[#380208]' : 'text-[#867272] border-transparent hover:text-[#380208]'
              }`}
              onClick={() => {
                setTab('signin');
                setServerError('');
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`pb-3 mr-6 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                tab === 'register' ? 'text-[#380208] border-[#380208]' : 'text-[#867272] border-transparent hover:text-[#380208]'
              }`}
              onClick={() => {
                setTab('register');
                setServerError('');
              }}
            >
              Create Account
            </button>
          </div>

          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            {/* Username Field (Register Only) */}
            {tab === 'register' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#544342]">Username</label>
                <input
                  type="text"
                  className="w-full py-2.5 border-b border-[#d9c1c0] bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208] transition-colors"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="editorial_handle"
                  required
                />
                {!isUsernameValid && username.length > 0 && (
                  <span className="text-[11px] text-red-600 flex items-center gap-1">
                    <AlertCircle size={12} /> Username must be at least 3 characters
                  </span>
                )}
              </div>
            )}

            {/* Email Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#544342]">Email Address</label>
              <input
                type="email"
                className="w-full py-2.5 border-b border-[#d9c1c0] bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208] transition-colors"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="editor@example.com"
                required
              />
              {!isEmailValid && email.length > 0 && (
                <span className="text-[11px] text-red-600 flex items-center gap-1">
                  <AlertCircle size={12} /> Enter a valid email address
                </span>
              )}
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-[#544342]">Password</label>
                {tab === 'signin' && (
                  <button type="button" className="text-xs text-[#867272] hover:text-[#380208]">
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full py-2.5 pr-8 border-b border-[#d9c1c0] bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208] transition-colors"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-[#867272] hover:text-[#380208]"
                  onClick={() => setShowPassword(p => !p)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {!isPasswordValid && password.length > 0 && (
                <span className="text-[11px] text-red-600 flex items-center gap-1">
                  <AlertCircle size={12} /> Password must be at least 8 characters
                </span>
              )}
            </div>

            {/* Confirm Password Field (Register Only) */}
            {tab === 'register' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#544342]">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showPasswordConfirm ? 'text' : 'password'}
                    className="w-full py-2.5 pr-8 border-b border-[#d9c1c0] bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208] transition-colors"
                    value={passwordConfirm}
                    onChange={e => setPasswordConfirm(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-[#867272] hover:text-[#380208]"
                    onClick={() => setShowPasswordConfirm(p => !p)}
                  >
                    {showPasswordConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {!isPasswordMatch && passwordConfirm.length > 0 && (
                  <span className="text-[11px] text-red-600 flex items-center gap-1">
                    <AlertCircle size={12} /> Passwords do not match
                  </span>
                )}
                {isPasswordMatch && passwordConfirm.length >= 8 && (
                  <span className="text-[11px] text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Passwords match
                  </span>
                )}
              </div>
            )}

            {/* Server Error Alert */}
            {serverError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !isFormValid}
              className="w-full py-4 bg-[#380208] text-white rounded-lg text-sm font-semibold tracking-wide transition-all hover:bg-[#54161b] hover:-translate-y-0.5 shadow-md shadow-[#380208]/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {tab === 'signin' ? 'Authenticating...' : 'Creating Account...'}
                </span>
              ) : tab === 'signin' ? (
                'Enter Workspace →'
              ) : (
                'Create Account →'
              )}
            </button>
          </form>

          <div className="flex items-center gap-3 text-xs text-[#867272] before:flex-1 before:h-px before:bg-[#d9c1c0] after:flex-1 after:h-px after:bg-[#d9c1c0]">
            <span>Or continue with</span>
          </div>

          <div className="flex gap-4 justify-center">
            <button className="w-12 h-12 rounded-lg border border-[#d9c1c0] grid place-items-center transition-all hover:border-[#380208] hover:-translate-y-0.5 bg-white" aria-label="Google">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </button>
            <button className="w-12 h-12 rounded-lg border border-[#d9c1c0] grid place-items-center transition-all hover:border-[#380208] hover:-translate-y-0.5 bg-white" aria-label="GitHub">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
