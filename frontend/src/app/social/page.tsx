'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/lib/context/ToastContext';
import { listSocialFeed, createOutfitShare, addComment, voteShare, createFriendship } from '@/api/social.api';
import { fetchProfile } from '@/api/auth.api';
import { demoShares } from '@/data/demo';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageSquare, Bookmark, Image, User, Plus, Send, UserPlus, Sparkles, X, Check } from 'lucide-react';
import type { OutfitShare, UserProfile } from '@/lib/types';

const CURATORS = [
  { id: 'usr-1', name: 'JULIAN REID', handle: '@julian_reid', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&q=80' },
  { id: 'usr-2', name: 'SOPHIA CHEN', handle: '@sophia_style', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80' },
  { id: 'usr-3', name: 'ELARA VANCE', handle: '@elara_vance', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&q=80' },
];

const FEED_IMAGES = [
  'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=90',
  'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&q=90',
  'https://images.unsplash.com/photo-1544441893-675973e31985?w=800&q=90',
];

export default function SocialPage() {
  const { session } = useAuth();
  const { toastSuccess, toastError } = useToast();

  const [activeTab, setActiveTab] = useState<'feed' | 'profile'>('feed');
  const [shares, setShares] = useState<OutfitShare[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // Compose Post State
  const [postCaption, setPostCaption] = useState('');
  const [postVisibility, setPostVisibility] = useState<'public' | 'friends' | 'link_only'>('public');
  const [submittingPost, setSubmittingPost] = useState(false);

  // Comment State per share
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});

  const loadData = async () => {
    if (!session?.accessToken) return;
    try {
      const [feedData, userProf] = await Promise.all([
        listSocialFeed(session.accessToken).catch(() => []),
        fetchProfile(session.accessToken).catch(() => session.user),
      ]);
      setShares(feedData);
      if (userProf) setProfile(userProf);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    loadData();
  }, [session]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.accessToken || !postCaption.trim()) return;

    setSubmittingPost(true);
    try {
      const newShare = await createOutfitShare(session.accessToken, {
        outfit_id: '73187852-76ad-458c-80a6-b2a2d1f0b065',
        caption: postCaption.trim(),
        visibility: postVisibility,
      });
      toastSuccess('Post Published', 'Your look has been shared to the Charis community feed.');
      setShares((prev) => [newShare, ...prev]);
      setPostCaption('');
    } catch (err) {
      toastError('Post Failed', err instanceof Error ? err.message : 'Error sharing post.');
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleVote = async (shareId: string, currentVotes: number) => {
    if (!session?.accessToken) return;
    try {
      await voteShare(session.accessToken, shareId, 1);
      toastSuccess('Liked Post', 'Upvote added to look.');
      setShares((prev) =>
        prev.map((s) =>
          s.id === shareId
            ? { ...s, vote_breakdown: { ...s.vote_breakdown, upvotes: (s.vote_breakdown?.upvotes || currentVotes) + 1 } }
            : s
        )
      );
    } catch (err) {
      toastError('Vote Failed', err instanceof Error ? err.message : 'Could not register vote.');
    }
  };

  const handleAddComment = async (shareId: string) => {
    const text = commentInputs[shareId];
    if (!session?.accessToken || !text?.trim()) return;

    try {
      const newComment = await addComment(session.accessToken, shareId, text.trim());
      toastSuccess('Comment Posted', 'Your reflection has been added.');
      setCommentInputs((prev) => ({ ...prev, [shareId]: '' }));
      setShares((prev) =>
        prev.map((s) =>
          s.id === shareId
            ? { ...s, comment_count: (s.comment_count || 0) + 1, comments: [...(s.comments || []), newComment] }
            : s
        )
      );
    } catch (err) {
      toastError('Comment Failed', err instanceof Error ? err.message : 'Could not add comment.');
    }
  };

  const handleSendFriendRequest = async (friendId: string, name: string) => {
    if (!session?.accessToken) return;
    try {
      await createFriendship(session.accessToken, friendId);
      toastSuccess('Friend Request Sent', `Connected with ${name}.`);
    } catch (err) {
      toastError('Connection Failed', err instanceof Error ? err.message : 'Could not connect.');
    }
  };

  return (
    <AuthGuard>
      <AppShell>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-8">
          {/* Page Header with Tabs */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#d9c1c0]/50 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-[#867272]">
                <span className="w-6 h-px bg-[#d9c1c0]" />
                Editorial Community
              </div>
              <h1 className="serif text-4xl font-bold text-[#1e1b18] mt-1">The Lookbook</h1>
              <p className="text-sm text-[#544342] mt-1">
                A curated stream of capsule wardrobes and aesthetic commentary.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('feed')}
                className={`px-5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                  activeTab === 'feed'
                    ? 'bg-[#380208] text-white shadow-md shadow-[#380208]/20'
                    : 'bg-white border border-[#d9c1c0] text-[#1e1b18] hover:border-[#380208]'
                }`}
              >
                Community Feed
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                  activeTab === 'profile'
                    ? 'bg-[#380208] text-white shadow-md shadow-[#380208]/20'
                    : 'bg-white border border-[#d9c1c0] text-[#1e1b18] hover:border-[#380208]'
                }`}
              >
                My Profile
              </button>
            </div>
          </div>

          {activeTab === 'feed' ? (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">
              {/* Feed Column */}
              <div className="flex flex-col gap-6">
                {/* Compose Form */}
                <form onSubmit={handleCreatePost} className="bg-white rounded-2xl p-5 border border-[#d9c1c0] shadow-sm flex flex-col gap-4">
                  <div className="flex gap-3">
                    <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 bg-[#f5ece7] border border-[#d9c1c0]">
                      {session?.user?.avatar_url ? (
                        <img src={session.user.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full grid place-items-center font-bold text-[#380208]">
                          {session?.user?.username?.[0]?.toUpperCase() ?? 'C'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <textarea
                        className="w-full border-none outline-none resize-none text-sm text-[#1e1b18] bg-transparent leading-relaxed placeholder:text-[#867272]"
                        placeholder="Share a look, post a new acquisition, or request styling commentary..."
                        value={postCaption}
                        onChange={(e) => setPostCaption(e.target.value)}
                        rows={2}
                        required
                      />
                      <div className="flex justify-between items-center border-t border-[#d9c1c0]/40 pt-3">
                        <div className="flex items-center gap-3">
                          <select
                            value={postVisibility}
                            onChange={(e) => setPostVisibility(e.target.value as any)}
                            className="text-xs text-[#544342] bg-transparent border border-[#d9c1c0] rounded-md px-2 py-1 outline-none cursor-pointer"
                          >
                            <option value="public">Public</option>
                            <option value="friends">Friends Only</option>
                            <option value="link_only">Link Only</option>
                          </select>
                        </div>
                        <button
                          type="submit"
                          disabled={submittingPost || !postCaption.trim()}
                          className="px-5 py-2 bg-[#380208] text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-[#54161b] transition-all disabled:opacity-50"
                        >
                          {submittingPost ? 'Posting...' : 'Publish Look →'}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>

                {/* Posts Feed */}
                {shares.map((share, i) => (
                  <motion.div
                    key={share.id}
                    className="bg-white rounded-2xl border border-[#d9c1c0] overflow-hidden flex flex-col gap-4 p-6 shadow-sm"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-[#d9c1c0]">
                          <img
                            src={CURATORS[i % CURATORS.length].avatar}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-xs font-bold tracking-wider text-[#1e1b18]">
                            {share.user_email?.split('@')[0]?.toUpperCase() ?? 'CURATOR'}
                          </p>
                          <p className="text-[10px] text-[#867272]">2026 · {share.visibility || 'Public'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSendFriendRequest(share.user || 'usr-1', share.user_email || 'Curator')}
                        className="text-xs font-semibold text-[#380208] hover:underline flex items-center gap-1"
                      >
                        <UserPlus size={14} /> Connect
                      </button>
                    </div>

                    <div className="relative rounded-xl overflow-hidden aspect-[4/5] bg-[#f5ece7]">
                      <img
                        src={FEED_IMAGES[i % FEED_IMAGES.length]}
                        alt="Curated Look"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <p className="text-sm leading-relaxed text-[#1e1b18]">{share.caption}</p>

                    {/* Actions Bar */}
                    <div className="flex justify-between items-center border-t border-[#d9c1c0]/40 pt-3">
                      <div className="flex gap-5">
                        <button
                          onClick={() => handleVote(share.id, share.vote_breakdown?.upvotes || 18)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-[#544342] hover:text-red-700 transition-colors"
                        >
                          <Heart size={16} className="text-red-600 fill-red-600" />
                          <span>{share.vote_breakdown?.upvotes ?? 24} Likes</span>
                        </button>
                        <button
                          onClick={() => setOpenComments((prev) => ({ ...prev, [share.id]: !prev[share.id] }))}
                          className="flex items-center gap-1.5 text-xs font-semibold text-[#544342] hover:text-[#380208] transition-colors"
                        >
                          <MessageSquare size={16} />
                          <span>{share.comment_count ?? 0} Reflections</span>
                        </button>
                      </div>
                      <button
                        onClick={() => toastSuccess('Bookmarked', 'Added to saved lookbook inspiration.')}
                        className="text-[#867272] hover:text-[#380208]"
                      >
                        <Bookmark size={16} />
                      </button>
                    </div>

                    {/* Comments Section */}
                    {openComments[share.id] && (
                      <div className="flex flex-col gap-3 pt-2 border-t border-[#d9c1c0]/30">
                        {share.comments?.map((c) => (
                          <div key={c.id} className="bg-[#fbf2ed] p-3 rounded-lg text-xs flex flex-col gap-1">
                            <span className="font-bold text-[#380208]">{c.user_email || 'Community Member'}</span>
                            <p className="text-[#1e1b18]">{c.text}</p>
                          </div>
                        ))}
                        <div className="flex gap-2 mt-1">
                          <input
                            type="text"
                            placeholder="Write a style reflection..."
                            value={commentInputs[share.id] || ''}
                            onChange={(e) => setCommentInputs((prev) => ({ ...prev, [share.id]: e.target.value }))}
                            className="flex-1 px-3 py-2 text-xs border border-[#d9c1c0] rounded-lg outline-none focus:border-[#380208]"
                          />
                          <button
                            onClick={() => handleAddComment(share.id)}
                            className="px-4 py-2 bg-[#380208] text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                          >
                            <Send size={12} /> Comment
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Sidebar */}
              <div className="sticky top-6 flex flex-col gap-5">
                <div className="bg-white rounded-2xl p-5 border border-[#d9c1c0] shadow-sm flex flex-col gap-4">
                  <h3 className="eyebrow">Featured Curators</h3>
                  {CURATORS.map((c) => (
                    <div key={c.name} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-[#d9c1c0]">
                        <img src={c.avatar} alt={c.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold tracking-wider text-[#1e1b18] truncate">{c.name}</p>
                        <p className="text-[10px] text-[#867272]">{c.handle}</p>
                      </div>
                      <button
                        onClick={() => handleSendFriendRequest(c.id, c.name)}
                        className="px-3 py-1 rounded-full border border-[#d9c1c0] text-[11px] font-semibold hover:border-[#380208] hover:bg-[#380208] hover:text-white transition-all"
                      >
                        Follow
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* User Profile View */
            <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
              <div className="bg-white rounded-2xl p-8 border border-[#d9c1c0] shadow-md flex flex-col gap-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-[#f5ece7] border-2 border-[#380208] shrink-0 grid place-items-center text-2xl font-bold text-[#380208]">
                    {session?.user?.avatar_url ? (
                      <img src={session.user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      session?.user?.username?.[0]?.toUpperCase() ?? 'C'
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 className="serif text-2xl font-bold text-[#1e1b18]">{session?.user?.username || 'Curator'}</h2>
                    <p className="text-xs text-[#867272]">{session?.user?.email}</p>
                    <p className="text-xs text-[#544342] mt-2 leading-relaxed">
                      {profile?.bio || 'Curating a wardrobe OS with editorial precision in 2026.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 border-t border-b border-[#d9c1c0]/50 py-4 text-center">
                  <div>
                    <span className="serif text-2xl font-bold text-[#1e1b18]">{shares.length}</span>
                    <span className="block text-[10px] uppercase tracking-wider text-[#867272]">Posts</span>
                  </div>
                  <div>
                    <span className="serif text-2xl font-bold text-[#1e1b18]">14</span>
                    <span className="block text-[10px] uppercase tracking-wider text-[#867272]">Connections</span>
                  </div>
                  <div>
                    <span className="serif text-2xl font-bold text-[#380208]">184</span>
                    <span className="block text-[10px] uppercase tracking-wider text-[#867272]">Total Likes</span>
                  </div>
                </div>
              </div>
            </div>
          )}

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
