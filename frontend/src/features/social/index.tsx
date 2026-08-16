import { motion } from 'framer-motion';
import { Heart, MessageSquare, Share2, Users } from 'lucide-react';
import type { Friendship, OutfitShare } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { sortFeed } from './hooks';

type Props = {
  shares: OutfitShare[];
  friendships: Friendship[];
};

export function SocialPage({ shares, friendships }: Props) {
  const feed = sortFeed(shares);

  return (
    <motion.section className="social-layout" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="social-feed">
        <Card title="Share Composer" subtitle="Post a look, ask for advice, or show a new acquisition">
          <div className="empty-state">
            Compose and connect to the Django social endpoints once your auth session is active.
          </div>
        </Card>

        {feed.map((share) => (
          <Card key={share.id} className="feed-post">
            <div className="feed-topline">
              <div className="feed-meta">
                <div className="feed-avatar">
                  <img
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80"
                    alt={share.user_email ?? 'Curator'}
                  />
                </div>
                <div>
                  <strong>{share.user_email ?? 'Curator'}</strong>
                  <div className="muted">{share.visibility} · {new Date(share.shared_at).toLocaleDateString()}</div>
                </div>
              </div>
              <Button variant="ghost">
                <Share2 size={16} />
              </Button>
            </div>
            <div className="feed-image">
              <img
                src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1400&q=80"
                alt={share.caption}
              />
            </div>
            <div className="feed-title serif">{share.caption}</div>
            <p className="muted">{share.outfit_id}</p>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <Badge tone="outline"><Heart size={14} /> {share.vote_count}</Badge>
              <Badge tone="outline"><MessageSquare size={14} /> {share.comment_count}</Badge>
            </div>
          </Card>
        ))}
      </div>

      <div className="social-sidebar">
        <Card title="Featured Curators">
          <div className="stack">
            {friendships.length ? friendships.map((friendship) => (
              <div key={friendship.id} className="empty-state" style={{ background: 'rgba(255,255,255,0.82)' }}>
                <Users size={14} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} />
                {friendship.requester_email ?? friendship.requester}
              </div>
            )) : <div className="empty-panel">Friendships will appear here once the social graph is active.</div>}
          </div>
        </Card>
      </div>
    </motion.section>
  );
}
