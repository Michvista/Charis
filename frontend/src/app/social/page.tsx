'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/lib/context/ToastContext';
import { listSocialFeed, createOutfitShare, addComment, voteShare, createFriendship, listFriendships } from '@/api/social.api';
import { fetchProfile } from '@/api/auth.api';
import { motion, AnimatePresence } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import { FavouriteIcon, Comment01Icon, Bookmark01Icon, PlusSignIcon, SentIcon, UserAdd01Icon, Search01Icon, Cancel01Icon, Loading01Icon } from '@hugeicons/core-free-icons';
import type { OutfitShare, UserProfile } from '@/lib/types';
import { useOutfits } from '@/lib/context/OutfitsContext';
import OutfitSnapshotCard from '@/components/outfits/OutfitSnapshotCard';

export default function SocialPage() {
  const { session } = useAuth();
  const { toastSuccess, toastError } = useToast();

  const [activeTab, setActiveTab] = useState<'feed' | 'profile'>('feed');
  const [shares, setShares] = useState<OutfitShare[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingFeed, setLoadingFeed] = useState(true);

  // Compose state
  const [postCaption, setPostCaption] = useState('');
  const [postVisibility, setPostVisibility] = useState<'public' | 'friends' | 'link_only'>('public');
  const [submittingPost, setSubmittingPost] = useState(false);

  // Like / Vote — track which posts the user has already liked to prevent double-counting
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [votingPosts, setVotingPosts] = useState<Set<string>>(new Set());

  // Comment state per share
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});

  const [selectedOutfitId, setSelectedOutfitId] = useState<string>('');

  const { outfits: savedOutfitsList } = useOutfits();

  // Profile tab: search
  const [profileSearch, setProfileSearch] = useState('');
  const [friendships, setFriendships] = useState<any[]>([]);
  const [requestedFriends, setRequestedFriends] = useState<Set<string>>(new Set());
  const [expandedSearchPost, setExpandedSearchPost] = useState<string | null>(null);
  const [viewingUser, setViewingUser] = useState<{ userId: string; userEmail: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [session]);

  const formatUserHandle = (email?: string) => {
    if (!email) return 'CURATOR';
    return email.split('@')[0].split('+')[0].toUpperCase();
  };

  const loadData = async () => {
    if (!session?.accessToken) return;
    setLoadingFeed(true);
    try {
      const [feedData, userProf, friendData] = await Promise.all([
        listSocialFeed(session.accessToken).catch(() => []),
        fetchProfile(session.accessToken).catch(() => session.user),
        listFriendships(session.accessToken).catch(() => []),
      ]);
      setShares(feedData);
      if (userProf) setProfile(userProf as UserProfile);
      setFriendships(friendData);
    } catch {
      // silently fail
    } finally {
      setLoadingFeed(false);
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
      // Generate a fresh UUID for outfit_id if not selected to satisfy unique constraint
      const finalOutfitId = selectedOutfitId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`);
      const newShare = await createOutfitShare(session.accessToken, {
        outfit_id: finalOutfitId,
        caption: postCaption.trim(),
        visibility: postVisibility,
      });
      toastSuccess('Post Published', 'Your look has been shared to the Charis community feed.');
      setShares((prev) => [newShare, ...prev]);
      setPostCaption('');
      setSelectedOutfitId('');
    } catch (err) {
      toastError('Post Failed', err instanceof Error ? err.message : 'Error sharing post.');
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleVote = async (shareId: string) => {
    if (!session?.accessToken) return;
    if (votingPosts.has(shareId)) return;

    const isCurrentlyLiked = likedPosts.has(shareId);
    const targetLiked = !isCurrentlyLiked;
    const delta = targetLiked ? 1 : -1;

    // Optimistic update: apply instantly so the like feels immediate
    setLikedPosts((prev) => {
      const next = new Set(prev);
      if (targetLiked) next.add(shareId);
      else next.delete(shareId);
      return next;
    });
    setShares((prev) =>
      prev.map((s) =>
        s.id === shareId
          ? {
              ...s,
              vote_count: Math.max(0, (s.vote_count || 0) + delta),
              vote_breakdown: {
                upvotes: Math.max(0, (s.vote_breakdown?.upvotes || 0) + delta),
                downvotes: s.vote_breakdown?.downvotes || 0,
              },
            }
          : s
      )
    );

    setVotingPosts((prev) => new Set([...prev, shareId]));
    try {
      await voteShare(session.accessToken, shareId, delta);
      toastSuccess(targetLiked ? 'Liked Post' : 'Unliked Post', targetLiked ? 'Upvote added to look.' : 'Removed your upvote.');
    } catch (err) {
      // Revert on failure
      setLikedPosts((prev) => {
        const next = new Set(prev);
        if (isCurrentlyLiked) next.add(shareId);
        else next.delete(shareId);
        return next;
      });
      setShares((prev) =>
        prev.map((s) =>
          s.id === shareId
            ? {
                ...s,
                vote_count: Math.max(0, (s.vote_count || 0) - delta),
                vote_breakdown: {
                  upvotes: Math.max(0, (s.vote_breakdown?.upvotes || 0) - delta),
                  downvotes: s.vote_breakdown?.downvotes || 0,
                },
              }
            : s
        )
      );
      toastError('Vote Failed', err instanceof Error ? err.message : 'Could not register vote.');
    } finally {
      setVotingPosts((prev) => {
        const next = new Set(prev);
        next.delete(shareId);
        return next;
      });
    }
  };

  const handleAddComment = async (shareId: string) => {
    const text = commentInputs[shareId];
    if (!session?.accessToken || !text?.trim()) return;
    if (submittingComment[shareId]) return;

    setSubmittingComment((prev) => ({ ...prev, [shareId]: true }));
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
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [shareId]: false }));
    }
  };

  const handleSendFriendRequest = async (userId: string, name: string) => {
    if (!session?.accessToken) return;
    if (requestedFriends.has(userId)) {
      toastSuccess('Already Requested', `Friend request already sent to ${name}.`);
      return;
    }
    try {
      await createFriendship(session.accessToken, userId);
      setRequestedFriends((prev) => new Set([...prev, userId]));
      toastSuccess('Friend Request Sent', `Connected with ${name}.`);
    } catch (err) {
      toastError('Connection Failed', err instanceof Error ? err.message : 'Could not connect.');
    }
  };

  // Unique poster users from feed (for discovery sidebar)
  const feedUsers = Array.from(
    new Map(
      shares.map((s) => [s.user, { userId: s.user || '', userEmail: s.user_email || '' }])
    ).values()
  ).filter((u) => u.userId && u.userId !== session?.user?.id);

  // Profile search filters feed posts by caption or user
  const filteredFeedForProfile = profileSearch.trim()
    ? shares.filter(
        (s) =>
          s.caption?.toLowerCase().includes(profileSearch.toLowerCase()) ||
          s.user_email?.toLowerCase().includes(profileSearch.toLowerCase())
      )
    : shares;

  const myPosts = shares.filter((s) => s.user === session?.user?.id);
  const totalLikes = myPosts.reduce((sum, s) => sum + (s.vote_breakdown?.upvotes || 0), 0);

  return (
    <AuthGuard>
      <AppShell>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-8">
          {/* Page Header */}
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
                    <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 bg-[#f5ece7] border border-[#d9c1c0] grid place-items-center font-bold text-[#380208]">
                      {session?.user?.avatar_url ? (
                        <img src={session.user.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        session?.user?.username?.[0]?.toUpperCase() ?? 'C'
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
                      <div className="flex flex-col gap-2 border-t border-[#d9c1c0]/30 pt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[#867272] font-semibold shrink-0">Attach Outfit / Garment:</span>
                          <select
                            value={selectedOutfitId}
                            onChange={(e) => setSelectedOutfitId(e.target.value)}
                            className="text-xs text-[#1e1b18] bg-[#fbf2ed] border border-[#d9c1c0] rounded-md px-2.5 py-1.5 outline-none cursor-pointer flex-1"
                          >
                            <option value="">(Optional: Attach Saved Outfit or Item)</option>
                            <optgroup label="Saved Outfits Archive">
                              {savedOutfitsList.map((o: any) => (
                                <option key={o.id} value={o.outfit_id}>
                                  {o.verdict === 'works' ? '✓' : '~'} Outfit ({o.score}%) — {o.items?.map((i: any) => i.name).join(', ') || o.outfit_id.slice(0, 8)}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-between items-center border-t border-[#d9c1c0]/40 pt-3">
                        <select
                          value={postVisibility}
                          onChange={(e) => setPostVisibility(e.target.value as any)}
                          className="text-xs text-[#544342] bg-white border border-[#d9c1c0] rounded-md px-2 py-1 outline-none cursor-pointer"
                        >
                          <option value="public">Public</option>
                          <option value="friends">Friends Only</option>
                          <option value="link_only">Link Only</option>
                        </select>
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

                {/* Feed Posts */}
                {loadingFeed ? (
                  <div className="py-12 flex justify-center">
                    <div className="w-8 h-8 border-2 border-[#380208]/30 border-t-[#380208] rounded-full animate-spin" />
                  </div>
                ) : shares.length === 0 ? (
                  <div className="py-12 text-center bg-white/60 border border-dashed border-[#d9c1c0] rounded-2xl">
                    <p className="serif text-xl font-semibold text-[#1e1b18]">No community posts yet</p>
                    <p className="text-xs text-[#544342] mt-1">Be the first to share your look!</p>
                  </div>
                ) : (
                  shares.map((share, i) => {
                    const isLiked = likedPosts.has(share.id);
                    const isVoting = votingPosts.has(share.id);

                    return (
                      <motion.div
                        key={share.id}
                        className="bg-white rounded-2xl border border-[#d9c1c0] overflow-hidden flex flex-col gap-4 p-6 shadow-sm"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#f5ece7] border border-[#d9c1c0] grid place-items-center font-bold text-[#380208] text-sm">
                              {(share.user_email?.[0] || 'C').toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-[#1e1b18]">
                                {formatUserHandle(share.user_email)}
                              </p>
                              <p className="text-[10px] text-[#867272]">
                                {new Date(share.shared_at || share.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          {share.user !== session?.user?.id && (
                            <button
                              onClick={() => handleSendFriendRequest(share.user || '', share.user_email || 'Curator')}
                              className={`text-xs font-semibold flex items-center gap-1 transition-colors ${
                                requestedFriends.has(share.user || '')
                                  ? 'text-emerald-700'
                                  : 'text-[#380208] hover:underline'
                              }`}
                            >
                              <HugeiconsIcon icon={UserAdd01Icon} size={14} />
                              {requestedFriends.has(share.user || '') ? 'Requested' : 'Connect'}
                            </button>
                          )}
                        </div>

                        <p className="text-sm leading-relaxed text-[#1e1b18]">{share.caption}</p>

                        {(share as any).outfit && (
                          <OutfitSnapshotCard
                            snapshot={{
                              outfitId: (share as any).outfit.outfit_id,
                              score: (share as any).outfit.score,
                              verdict: (share as any).outfit.verdict,
                              visualNotes: (share as any).outfit.visual_notes,
                              items: (share as any).outfit.items || [],
                            }}
                          />
                        )}

                        {/* Actions Bar */}
                        <div className="flex justify-between items-center border-t border-[#d9c1c0]/40 pt-3">
                          <div className="flex gap-5">
                            <button
                              onClick={() => handleVote(share.id)}
                              disabled={isVoting}
                              className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                                isLiked ? 'text-red-600' : 'text-[#544342] hover:text-red-700'
                              }`}
                            >
                              <HugeiconsIcon icon={FavouriteIcon} size={16} className={isLiked ? 'fill-red-600 text-red-600' : ''} />
                              <span>{(share.vote_breakdown?.upvotes || 0)} Likes</span>
                            </button>
                            <button
                              onClick={() => setOpenComments((prev) => ({ ...prev, [share.id]: !prev[share.id] }))}
                              className="flex items-center gap-1.5 text-xs font-semibold text-[#544342] hover:text-[#380208] transition-colors"
                            >
                              <HugeiconsIcon icon={Comment01Icon} size={16} />
                              <span>{share.comment_count ?? 0} Reflections</span>
                            </button>
                          </div>
                          <button
                            onClick={() => toastSuccess('Bookmarked', 'Added to saved lookbook inspiration.')}
                            className="text-[#867272] hover:text-[#380208]"
                          >
                            <HugeiconsIcon icon={Bookmark01Icon} size={16} />
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
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(share.id); }}}
                                className="flex-1 px-3 py-2 text-xs border border-[#d9c1c0] rounded-lg outline-none focus:border-[#380208]"
                              />
                              <button
                                onClick={() => handleAddComment(share.id)}
                                disabled={submittingComment[share.id] || !commentInputs[share.id]?.trim()}
                                className="px-4 py-2 bg-[#380208] text-white rounded-lg text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                              >
                                {submittingComment[share.id] ? (
                                  <HugeiconsIcon icon={Loading01Icon} size={12} className="animate-spin" />
                                ) : (
                                  <HugeiconsIcon icon={SentIcon} size={12} />
                                )}
                                Post
                              </button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>

              {/* Sidebar — Real Community Users */}
              <div className="sticky top-6 flex flex-col gap-5">
                <div className="bg-white rounded-2xl p-5 border border-[#d9c1c0] shadow-sm flex flex-col gap-4">
                  <h3 className="eyebrow">Active Curators</h3>
                  {feedUsers.length === 0 ? (
                    <p className="text-xs text-[#867272] italic">Other users' posts will appear here once they join the community.</p>
                  ) : (
                    feedUsers.slice(0, 5).map((u) => (
                      <div key={u.userId} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#f5ece7] border border-[#d9c1c0] grid place-items-center font-bold text-[#380208] text-sm shrink-0">
                          {(u.userEmail?.[0] || 'C').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold tracking-wider text-[#1e1b18] truncate">{u.userEmail?.split('@')[0]?.toUpperCase()}</p>
                          <p className="text-[10px] text-[#867272]">@{u.userEmail?.split('@')[0]}</p>
                        </div>
                        <button
                          onClick={() => handleSendFriendRequest(u.userId, u.userEmail)}
                          className={`px-3 py-1 rounded-full border text-[11px] font-semibold transition-all ${
                            requestedFriends.has(u.userId)
                              ? 'border-emerald-400 text-emerald-700 bg-emerald-50'
                              : 'border-[#d9c1c0] hover:border-[#380208] hover:bg-[#380208] hover:text-white'
                          }`}
                        >
                          {requestedFriends.has(u.userId) ? '✓ Requested' : 'Follow'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* My Profile Tab */
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
                    <span className="serif text-2xl font-bold text-[#1e1b18]">{myPosts.length}</span>
                    <span className="block text-[10px] uppercase tracking-wider text-[#867272]">My Posts</span>
                  </div>
                  <div>
                    <span className="serif text-2xl font-bold text-[#1e1b18]">{friendships.length}</span>
                    <span className="block text-[10px] uppercase tracking-wider text-[#867272]">Connections</span>
                  </div>
                  <div>
                    <span className="serif text-2xl font-bold text-[#380208]">{totalLikes}</span>
                    <span className="block text-[10px] uppercase tracking-wider text-[#867272]">Total Likes</span>
                  </div>
                </div>
              </div>

              {/* Community Discovery Search */}
              <div className="bg-white rounded-2xl p-6 border border-[#d9c1c0] shadow-sm flex flex-col gap-4">
                <h3 className="serif text-xl font-bold text-[#1e1b18]">Discover Community Posts & People</h3>
                <div className="relative">
                  <HugeiconsIcon icon={Search01Icon} size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#867272]" />
                  <input
                    type="text"
                    placeholder="Search posts, captions, or community members..."
                    value={profileSearch}
                    onChange={(e) => setProfileSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-[#d9c1c0] rounded-lg text-sm outline-none focus:border-[#380208]"
                  />
                  {profileSearch && (
                    <button onClick={() => setProfileSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#867272] hover:text-[#380208]">
                      <HugeiconsIcon icon={Cancel01Icon} size={14} />
                    </button>
                  )}
                </div>

                {/* Search Results */}
                {profileSearch.trim() && (
                  <div className="flex flex-col gap-3">
                    {filteredFeedForProfile.length === 0 ? (
                      <p className="text-xs text-[#867272] italic text-center py-4">No posts found matching "{profileSearch}"</p>
                    ) : (
                      filteredFeedForProfile.slice(0, 8).map((s) => {
                        const isExpanded = expandedSearchPost === s.id;
                        const isOwnPost = s.user === session?.user?.id;
                        return (
                          <div key={s.id} className="flex flex-col gap-2 p-3 bg-[#fbf2ed] rounded-xl border border-[#d9c1c0]/40 cursor-pointer hover:border-[#380208]/40 transition-colors">
                            <div className="flex items-start justify-between gap-3" onClick={() => setExpandedSearchPost(isExpanded ? null : s.id)}>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setViewingUser({ userId: s.user || '', userEmail: s.user_email || '' }); }}
                                  className="w-8 h-8 rounded-full bg-[#380208]/10 text-[#380208] font-bold text-sm grid place-items-center hover:ring-2 hover:ring-[#380208]/30 shrink-0"
                                >
                                  {(s.user_email?.[0] || 'C').toUpperCase()}
                                </button>
                                <div>
                                  <p className="text-xs font-bold text-[#380208]">{s.user_email?.split('@')[0]?.toUpperCase()}</p>
                                  <p className="text-xs text-[#1e1b18] line-clamp-2">{s.caption}</p>
                                </div>
                              </div>
                              {!isOwnPost && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleSendFriendRequest(s.user || '', s.user_email || ''); }}
                                  className="px-2 py-1 rounded-full border border-[#d9c1c0] text-[10px] font-semibold hover:border-[#380208] hover:bg-[#380208] hover:text-white transition-all shrink-0"
                                >
                                  {requestedFriends.has(s.user || '') ? '\u2713' : '+ Follow'}
                                </button>
                              )}
                            </div>
                            {isExpanded && (
                              <div className="pt-2 border-t border-[#d9c1c0]/30 flex gap-4 text-xs text-[#544342]">
                                <button onClick={(e) => { e.stopPropagation(); handleVote(s.id); }} className={`flex items-center gap-1 font-semibold ${likedPosts.has(s.id) ? 'text-red-600' : 'hover:text-[#380208]'}`}>
                                  ♥ {s.vote_breakdown?.upvotes || 0} Likes
                                </button>
                                <span>· {s.comment_count || 0} Comments</span>
                                <span>· {s.visibility}</span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* My own posts */}
                {!profileSearch.trim() && (
                  <div className="flex flex-col gap-3">
                    <span className="eyebrow">My Posts</span>
                    {myPosts.length === 0 ? (
                      <p className="text-xs text-[#867272] italic">You haven't published any posts yet.</p>
                    ) : (
                      myPosts.map((s) => (
                        <div key={s.id} className="flex items-start justify-between gap-3 p-3 bg-[#fbf2ed] rounded-xl border border-[#d9c1c0]/40">
                          <p className="text-xs text-[#1e1b18] line-clamp-2">{s.caption}</p>
                          <div className="flex items-center gap-2 text-[10px] text-[#867272] shrink-0">
                            <HugeiconsIcon icon={FavouriteIcon} size={10} className="text-red-400" /> {s.vote_breakdown?.upvotes || 0}
                            <HugeiconsIcon icon={Comment01Icon} size={10} /> {s.comment_count || 0}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
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

        {/* Mini User Profile Modal */}
        <AnimatePresence>
          {viewingUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setViewingUser(null)}>
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-[#d9c1c0] flex flex-col gap-5"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-[#f5ece7] border-2 border-[#380208] grid place-items-center text-xl font-bold text-[#380208]">
                      {(viewingUser.userEmail?.[0] || 'C').toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-[#1e1b18]">{viewingUser.userEmail?.split('@')[0]}</p>
                      <p className="text-xs text-[#867272]">{viewingUser.userEmail}</p>
                    </div>
                  </div>
                  <button onClick={() => setViewingUser(null)} className="text-[#867272] hover:text-[#380208]"><HugeiconsIcon icon={Cancel01Icon} size={18} /></button>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center border-t border-b border-[#d9c1c0]/40 py-4">
                  <div>
                    <span className="serif text-xl font-bold text-[#1e1b18] block">{shares.filter(s => s.user === viewingUser.userId).length}</span>
                    <span className="text-[10px] uppercase tracking-wider text-[#867272]">Posts</span>
                  </div>
                  <div>
                    <span className="serif text-xl font-bold text-[#1e1b18] block">{friendships.filter(f => f.requester === viewingUser.userId || f.addressee === viewingUser.userId).length}</span>
                    <span className="text-[10px] uppercase tracking-wider text-[#867272]">Connections</span>
                  </div>
                  <div>
                    <span className="serif text-xl font-bold text-[#380208] block">{shares.filter(s => s.user === viewingUser.userId).reduce((sum, s) => sum + (s.vote_breakdown?.upvotes || 0), 0)}</span>
                    <span className="text-[10px] uppercase tracking-wider text-[#867272]">Likes</span>
                  </div>
                </div>
                <button
                  onClick={() => { handleSendFriendRequest(viewingUser.userId, viewingUser.userEmail); }}
                  className={`w-full py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                    requestedFriends.has(viewingUser.userId)
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                      : 'bg-[#380208] text-white hover:bg-[#54161b]'
                  }`}
                >
                  {requestedFriends.has(viewingUser.userId) ? '\u2713 Follow Request Sent' : 'Send Follow Request'}
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </AppShell>
    </AuthGuard>
  );
}
