'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/lib/context/ToastContext';
import { fetchProfile, updateProfile } from '@/api/auth.api';
import { motion } from 'framer-motion';
import { User, Mail, Shield, LogOut, Save, Camera, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { session, setSession, logout: authLogout } = useAuth();
  const { toastSuccess, toastError } = useToast();
  const router = useRouter();

  const [username, setUsername] = useState(session?.user?.username || '');
  const [bio, setBio] = useState(session?.user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(session?.user?.avatar_url || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session?.accessToken) return;
    fetchProfile(session.accessToken)
      .then((prof) => {
        if (prof) {
          setUsername(prof.username || '');
          setBio(prof.bio || '');
          setAvatarUrl(prof.avatar_url || '');
        }
      })
      .catch(() => {});
  }, [session]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.accessToken) return;

    setSaving(true);
    try {
      const updatedUser = await updateProfile(session.accessToken, {
        username: username.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl.trim() || undefined,
      });

      setSession({
        ...session,
        user: updatedUser,
      });
      toastSuccess('Profile Updated', 'Your profile details have been saved.');
    } catch (err) {
      toastError('Update Failed', err instanceof Error ? err.message : 'Could not save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    authLogout();
    toastSuccess('Logged Out', 'You have been signed out of your workspace.');
    router.replace('/login');
  };

  return (
    <AuthGuard>
      <AppShell>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto flex flex-col gap-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#d9c1c0]/50 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-[#867272]">
                <span className="w-6 h-px bg-[#d9c1c0]" />
                Account Management
              </div>
              <h1 className="serif text-4xl font-bold text-[#1e1b18] mt-1">Settings &amp; Profile</h1>
              <p className="text-sm text-[#544342]">
                Manage your editorial identity, bio, and account credentials.
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-red-200 text-red-700 bg-white hover:bg-red-50 text-xs font-semibold uppercase tracking-wider transition-colors shrink-0 shadow-sm"
            >
              <LogOut size={16} /> Log Out
            </button>
          </div>

          {/* Profile Form Card */}
          <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl p-8 border border-[#d9c1c0] shadow-sm flex flex-col gap-6">
            {/* Avatar Header */}
            <div className="flex items-center gap-6 pb-6 border-b border-[#d9c1c0]/40">
              <div className="relative w-20 h-20 rounded-full overflow-hidden bg-[#f5ece7] border-2 border-[#380208] shrink-0 grid place-items-center text-2xl font-bold text-[#380208] shadow-md">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  username?.[0]?.toUpperCase() || 'C'
                )}
                <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  <Camera size={20} className="text-white" />
                </div>
              </div>

              <div>
                <h2 className="serif text-2xl font-bold text-[#1e1b18]">{username || 'Curator'}</h2>
                <p className="text-xs text-[#867272] mt-0.5">{session?.user?.email}</p>
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-[#380208] bg-[#fbf2ed] px-2.5 py-0.5 rounded-full mt-2 border border-[#d9c1c0]/40">
                  <Shield size={12} /> Authenticated User
                </span>
              </div>
            </div>

            {/* Fields */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#544342] flex items-center gap-1.5">
                  <User size={14} className="text-[#380208]" /> Username / Editorial Handle
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="your_handle"
                  className="py-2.5 px-3 border border-[#d9c1c0] rounded-xl bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208]"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#544342] flex items-center gap-1.5">
                  <Mail size={14} className="text-[#380208]" /> Email Address (Read-only)
                </label>
                <input
                  type="email"
                  value={session?.user?.email || ''}
                  disabled
                  className="py-2.5 px-3 border border-[#d9c1c0]/50 rounded-xl bg-[#fbf2ed] text-sm text-[#867272] outline-none cursor-not-allowed"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#544342]">Profile Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Share a short summary of your sartorial style philosophy..."
                  rows={3}
                  className="py-2.5 px-3 border border-[#d9c1c0] rounded-xl bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208] resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#544342]">Avatar Image URL</label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="py-2.5 px-3 border border-[#d9c1c0] rounded-xl bg-transparent text-sm text-[#1e1b18] outline-none focus:border-[#380208]"
                />
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex justify-end pt-4 border-t border-[#d9c1c0]/40">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-[#380208] text-white rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-[#54161b] transition-all shadow-md shadow-[#380208]/20 flex items-center gap-2 disabled:opacity-50"
              >
                <Save size={16} /> {saving ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>

          <footer className="flex justify-between items-center pt-6 border-t border-[#d9c1c0]/50">
            <span className="text-xs text-[#867272]">© 2026 CHARIS EDITORIAL. ALL RIGHTS RESERVED.</span>
            <nav className="flex gap-4 text-xs text-[#867272]">
              <a href="#" className="hover:text-[#380208]">Privacy</a>
              <a href="#" className="hover:text-[#380208]">Terms</a>
            </nav>
          </footer>
        </motion.div>
      </AppShell>
    </AuthGuard>
  );
}
