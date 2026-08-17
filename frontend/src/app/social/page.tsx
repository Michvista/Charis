'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { useAuth } from '@/lib/context/AuthContext';
import { listSocialFeed } from '@/api/social.api';
import { demoShares } from '@/data/demo';
import { motion } from 'framer-motion';
import { Heart, MessageSquare, Bookmark, MoreHorizontal, Image, User } from 'lucide-react';
import type { OutfitShare } from '@/lib/types';

const CURATORS = [
  { name: 'JULIAN REID', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60&q=80' },
  { name: 'SOPHIA CHEN', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&q=80' },
];

const FEED_IMAGES = [
  'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500&q=80',
  'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=500&q=80',
];

export default function SocialPage() {
  const { session } = useAuth();
  const [shares, setShares] = useState<OutfitShare[]>(demoShares);
  const [postText, setPostText] = useState('');

  useEffect(() => {
    if (!session?.accessToken) return;
    listSocialFeed(session.accessToken).then(data => {
      if (data.length) setShares(data);
    }).catch(() => {});
  }, [session]);

  return (
    <AuthGuard>
      <AppShell>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
          <div>
            <h1 className="serif text-4xl font-bold text-[#1e1b18]">The Lookbook</h1>
            <p className="text-sm text-[#544342] mt-1 max-w-sm leading-relaxed">
              A curated stream of style inspiration from the Charis community.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6 items-start">
            {/* Main Feed */}
            <div className="flex flex-col gap-6">
              {/* Compose */}
              <div className="flex gap-3.5 p-5 bg-white rounded-xl border border-[#e1d8d4]">
                <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-[#f5ece7]">
                  {session?.user?.avatar_url
                    ? <img src={session.user.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full grid place-items-center font-bold text-[#380208]">{session?.user?.username?.[0]?.toUpperCase() ?? 'C'}</div>
                  }
                </div>
                <div className="flex-1 flex flex-col gap-3">
                  <textarea
                    className="w-full border-none outline-none resize-none text-base text-[#1e1b18] bg-transparent leading-relaxed placeholder:text-[#544342]"
                    placeholder="Share a look, ask for advice, or post a new acquisition..."
                    value={postText}
                    onChange={e => setPostText(e.target.value)}
                    rows={2}
                  />
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <button className="w-8 h-8 rounded-md grid place-items-center text-[#544342] hover:bg-[#f5ece7] hover:text-[#380208] transition-colors"><Image size={18} /></button>
                      <button className="w-8 h-8 rounded-md grid place-items-center text-[#544342] hover:bg-[#f5ece7] hover:text-[#380208] transition-colors"><User size={18} /></button>
                    </div>
                    <button className="px-5 py-2 bg-[#380208] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">Post</button>
                  </div>
                </div>
              </div>

              {/* Posts */}
              {shares.map((share, i) => (
                <motion.div
                  key={share.id}
                  className="bg-white rounded-xl border border-[#e1d8d4] overflow-hidden flex flex-col gap-4 p-5"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0">
                        <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&q=80" alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-xs font-bold tracking-wider text-[#1e1b18]">{share.user_email?.split('@')[0]?.toUpperCase() ?? 'ELARA VANCE'}</p>
                        <p className="text-xs text-[#544342] mt-0.5">2 hours ago · Public</p>
                      </div>
                    </div>
                    <button className="text-[#544342]"><MoreHorizontal size={18} /></button>
                  </div>

                  <div className="relative rounded-lg overflow-hidden aspect-[4/5] -mx-1">
                    <img src={FEED_IMAGES[i % FEED_IMAGES.length]} alt="Look" className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 pt-10">
                      <span className="serif text-lg font-bold text-white">Autumn Transition</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex gap-4">
                      <button className="flex items-center gap-1.5 text-sm text-[#544342] hover:text-[#380208] transition-colors"><Heart size={16} /> <span>{share.vote_breakdown?.upvotes ?? 24}</span></button>
                      <button className="flex items-center gap-1.5 text-sm text-[#544342] hover:text-[#380208] transition-colors"><MessageSquare size={16} /> <span>{share.comment_count ?? 8}</span></button>
                    </div>
                    <button className="text-[#544342] hover:text-[#380208] transition-colors"><Bookmark size={16} /></button>
                  </div>

                  <p className="text-sm leading-relaxed text-[#1e1b18]">
                    {share.caption || 'Testing out the new Toteme trench. The drape is incredible, though considering tailoring the sleeves slightly. Layered over vintage silk.'}
                  </p>

                  <div className="flex gap-2 flex-wrap">
                    {['OUTERWEAR', 'NEUTRALS'].map(tag => (
                      <span key={tag} className="px-3 py-1 rounded-full border border-[#d9c1c0] text-[11px] font-semibold tracking-wider text-[#544342]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Sidebar */}
            <div className="sticky top-6">
              <div className="bg-white rounded-xl p-5 border border-[#e1d8d4] flex flex-col gap-4">
                <h3 className="text-[11px] uppercase tracking-wider font-semibold text-[#544342]">Featured Curators</h3>
                {CURATORS.map(c => (
                  <div key={c.name} className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                      <img src={c.avatar} alt={c.name} className="w-full h-full object-cover" />
                    </div>
                    <span className="flex-1 text-xs font-bold tracking-wider text-[#1e1b18]">{c.name}</span>
                    <button className="px-3.5 py-1.5 rounded-full border border-[#d9c1c0] text-xs font-medium hover:border-[#380208] hover:bg-[#380208]/5 transition-all">
                      Follow
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </AppShell>
    </AuthGuard>
  );
}
