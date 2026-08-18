'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { login, register } from '@/api/auth.api';
import { HugeiconsIcon } from '@hugeicons/react';
import { ViewIcon, ViewOffIcon, AlertCircleIcon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';

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

  const [authModal, setAuthModal] = useState<{ status: 'success' | 'error'; title: string; message: string } | null>(null);

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
      setAuthModal({
        status: 'success',
        title: tab === 'signin' ? 'Welcome Back!' : 'Account Created!',
        message: 'Authentication successful. Redirecting to your personal workspace...',
      });
      setTimeout(() => {
        router.push('/');
      }, 1200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed. Please check your credentials.';
      setServerError(msg);
      setAuthModal({
        status: 'error',
        title: 'Authentication Failed',
        message: msg,
      });
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
                    <HugeiconsIcon icon={AlertCircleIcon} size={12} /> Username must be at least 3 characters
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
                  <HugeiconsIcon icon={AlertCircleIcon} size={12} /> Enter a valid email address
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
                  {showPassword ? <HugeiconsIcon icon={ViewOffIcon} size={16} /> : <HugeiconsIcon icon={ViewIcon} size={16} />}
                </button>
              </div>
              {!isPasswordValid && password.length > 0 && (
                <span className="text-[11px] text-red-600 flex items-center gap-1">
                  <HugeiconsIcon icon={AlertCircleIcon} size={12} /> Password must be at least 8 characters
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
                    {showPasswordConfirm ? <HugeiconsIcon icon={ViewOffIcon} size={16} /> : <HugeiconsIcon icon={ViewIcon} size={16} />}
                  </button>
                </div>
                {!isPasswordMatch && passwordConfirm.length > 0 && (
                  <span className="text-[11px] text-red-600 flex items-center gap-1">
                    <HugeiconsIcon icon={AlertCircleIcon} size={12} /> Passwords do not match
                  </span>
                )}
                {isPasswordMatch && passwordConfirm.length >= 8 && (
                  <span className="text-[11px] text-emerald-700 flex items-center gap-1">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} /> Passwords match
                  </span>
                )}
              </div>
            )}

            {/* Server Error Alert */}
            {serverError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-start gap-2">
                <HugeiconsIcon icon={AlertCircleIcon} size={14} className="shrink-0 mt-0.5" />
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
        </div>
      </div>

      {/* Auth Success / Error Popup Modal */}
      {authModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-[#d9c1c0] flex flex-col items-center text-center gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className={`w-14 h-14 rounded-full grid place-items-center ${
              authModal.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}>
              <HugeiconsIcon icon={authModal.status === 'success' ? CheckmarkCircle02Icon : AlertCircleIcon} size={32} />
            </div>
            <div>
              <h3 className="serif text-2xl font-bold text-[#1e1b18]">{authModal.title}</h3>
              <p className="text-xs text-[#544342] mt-1 leading-relaxed">{authModal.message}</p>
            </div>
            {authModal.status === 'error' && (
              <button
                onClick={() => setAuthModal(null)}
                className="w-full py-3 bg-[#380208] text-white rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-[#54161b] transition-all mt-2"
              >
                Dismiss &amp; Retry
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


