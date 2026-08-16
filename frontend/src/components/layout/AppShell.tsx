import { motion } from 'framer-motion';
import { BarChart3, Box, CalendarDays, Layers3, Shirt, Sparkles, Users, LogOut } from 'lucide-react';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import type { PageId, UserProfile } from '../../lib/types';
import { Button } from '../ui/Button';

const NAV_ITEMS: Array<{ id: PageId; label: string; icon: ReactNode }> = [
  { id: 'wardrobe', label: 'Wardrobe', icon: <Shirt size={20} /> },
  { id: 'styling', label: 'Styling', icon: <Sparkles size={20} /> },
  { id: 'trips', label: 'Trips', icon: <CalendarDays size={20} /> },
  { id: 'social', label: 'Social', icon: <Users size={20} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={20} /> },
  { id: 'advisor', label: 'Advisor', icon: <Layers3 size={20} /> },
];

type Props = {
  page: PageId;
  onPageChange: (page: PageId) => void;
  profile: UserProfile | null;
  onLogout: () => void;
  children: ReactNode;
};

export function AppShell({ page, onPageChange, profile, onLogout, children }: Props) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span>C.</span>
        </div>
        <div className="sidebar-avatar">
          {profile?.avatar_url ? <img src={profile.avatar_url} alt={profile.username} /> : <div>{profile?.username?.charAt(0) ?? 'C'}</div>}
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={clsx('sidebar-nav-item', page === item.id && 'active')}
              onClick={() => onPageChange(item.id)}
            >
              {item.icon}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Button variant="primary" className="sidebar-plus" onClick={onLogout} title="Log out">
            <LogOut size={18} />
          </Button>
        </div>
      </aside>

      <div className="shell-main">
        <header className="shell-topbar">
          <div className="shell-wordmark">CHARIS</div>
          <div className="shell-tabs">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={clsx(page === item.id && 'active')}
                onClick={() => onPageChange(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="shell-profile">
            <span>{profile?.email ?? 'editor@example.com'}</span>
            <div>{profile?.username?.slice(0, 1).toUpperCase() ?? 'C'}</div>
          </div>
        </header>

        <motion.section
          key={page}
          className="shell-content"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -18 }}
          transition={{ duration: 0.25 }}
        >
          {children}
        </motion.section>
      </div>
    </div>
  );
}
