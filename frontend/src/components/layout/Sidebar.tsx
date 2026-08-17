'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Shirt, Luggage, Users, BarChart2, Sparkles, BookMarked, Home } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';

const NAV_ITEMS = [
  { id: 'home', icon: Home, label: 'Home', path: '/' },
  { id: 'wardrobe', icon: BookMarked, label: 'Library', path: '/wardrobe' },
  { id: 'styling', icon: Shirt, label: 'Styling', path: '/styling' },
  { id: 'trips', icon: Luggage, label: 'Trips', path: '/trips' },
  { id: 'social', icon: Users, label: 'Lookbook', path: '/social' },
  { id: 'analytics', icon: BarChart2, label: 'Analytics', path: '/analytics' },
  { id: 'advisor', icon: Sparkles, label: 'Advisor', path: '/advisor' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useAuth();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[64px] flex flex-col items-center py-5 bg-[#fff8f5]/90 border-r border-[#d9c1c0] backdrop-blur-xl z-50 gap-3">
      <div
        className="serif text-[28px] font-bold text-[#380208] cursor-pointer leading-none tracking-tight py-1"
        onClick={() => router.push('/')}
      >
        C.
      </div>

      {session?.user?.avatar_url ? (
        <img src={session.user.avatar_url} alt="avatar" className="w-10 h-10 rounded-xl object-cover" />
      ) : (
        <div className="w-10 h-10 rounded-xl bg-[#380208]/10 text-[#380208] font-bold text-base grid place-items-center">
          {session?.user?.username?.[0]?.toUpperCase() ?? 'C'}
        </div>
      )}

      <nav className="flex flex-col gap-1 flex-1 mt-2 w-full px-2">
        {NAV_ITEMS.map(({ id, icon: Icon, label, path }) => {
          const isActive = pathname === path || (path !== '/' && pathname.startsWith(path));
          return (
            <button
              key={id}
              className={`w-full h-12 rounded-xl grid place-items-center transition-all duration-200 ${
                isActive
                  ? 'bg-[#380208]/10 text-[#380208] shadow-[inset_3px_0_0_#380208]'
                  : 'text-[#544342] hover:bg-[#380208]/5 hover:text-[#380208] hover:-translate-y-0.5'
              }`}
              onClick={() => router.push(path)}
              title={label}
            >
              <Icon size={22} strokeWidth={1.5} />
            </button>
          );
        })}
      </nav>

      <div className="px-2 w-full flex justify-center">
        <button
          className="w-11 h-11 rounded-2xl bg-[#380208] text-white text-2xl grid place-items-center font-light transition-all hover:-translate-y-0.5 shadow-lg shadow-[#380208]/30"
          onClick={() => router.push('/wardrobe')}
          title="Add Item"
        >
          +
        </button>
      </div>
    </aside>
  );
}
