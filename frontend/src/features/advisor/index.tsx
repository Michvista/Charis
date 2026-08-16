import { motion } from 'framer-motion';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { StyleAdvisorSuggestion } from '../../lib/types';

type Props = {
  suggestions: StyleAdvisorSuggestion[];
  onRefreshAdvisor: () => Promise<void>;
};

export function AdvisorPage({ suggestions, onRefreshAdvisor }: Props) {
  return (
    <motion.section className="advisor-layout" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Card title="Style Advisor" subtitle="Grounded suggestions from the backend style-advisor service">
        <div className="stack">
          {suggestions.map((suggestion) => (
            <div key={suggestion.id} className="suggestion-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <strong>{suggestion.item_description}</strong>
                <Badge tone={suggestion.priority === 'high' ? 'accent' : 'outline'}>{suggestion.priority}</Badge>
              </div>
              <div className="muted">{suggestion.reason}</div>
            </div>
          ))}
          <Button variant="primary" onClick={onRefreshAdvisor}>Refresh advisor</Button>
        </div>
      </Card>

      <Card title="Knowledge Base" subtitle="This page is ready for RAG content and style rules uploads.">
        <div className="empty-panel">Connect your knowledge upload flow here once the RAG collection is ready.</div>
      </Card>
    </motion.section>
  );
}
