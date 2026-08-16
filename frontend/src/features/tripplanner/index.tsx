import { motion } from 'framer-motion';
import { CalendarDays, MapPin, Sparkles } from 'lucide-react';
import type { Trip, WardrobeItem } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { getTripCoverage } from './hooks';

type Props = {
  trips: Trip[];
  wardrobeItems: WardrobeItem[];
  onGeneratePackingList: (tripId: string) => Promise<void>;
};

export function TripsPage({ trips, wardrobeItems, onGeneratePackingList }: Props) {
  return (
    <motion.section className="trip-layout" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="timeline">
        {trips.map((trip) => (
          <div key={trip.id} className="timeline-item">
            <div className="timeline-dot" />
            <Card title={trip.name} subtitle={`${trip.destination} · ${trip.start_date} → ${trip.end_date}`}>
              <div className="stack">
                <p className="muted">{trip.description}</p>
                {trip.trip_events.map((event) => (
                  <div key={event.id} className="empty-state" style={{ background: 'rgba(255,255,255,0.82)' }}>
                    <strong>{event.name}</strong>
                    <div className="muted" style={{ marginTop: 4 }}>
                      <CalendarDays size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
                      {event.date} · {event.location ?? 'No location'}
                    </div>
                  </div>
                ))}
                <Button variant="primary" onClick={() => onGeneratePackingList(trip.id)}>
                  <Sparkles size={16} />
                  Generate Packing List
                </Button>
              </div>
            </Card>
          </div>
        ))}
      </div>

      <div className="stack">
        {trips.map((trip) => {
          const coverage = getTripCoverage(trip, wardrobeItems);
          const packingList = trip.packing_lists[0];

          return (
            <Card key={trip.id} title="Packing Coverage" subtitle={`${trip.packing_lists[0]?.items.length ?? 0} items total`}>
              <div className="stack">
                <div className="metric-row">
                  <h2 className="metric serif" style={{ fontSize: '2.4rem' }}>{coverage.coverage}%</h2>
                  <span className="metric-meta">events covered</span>
                </div>
                <div className="empty-state" style={{ background: 'rgba(90,7,19,0.04)' }}>
                  <MapPin size={16} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} />
                  {trip.destination}
                </div>
                <div className="packing-list">
                  {(packingList?.items ?? []).slice(0, 4).map((item) => (
                    <div key={item.id} className="packing-item">
                      <img src={wardrobeItems.find((wardrobeItem) => wardrobeItem.id === item.wardrobe_item_id)?.image_url ?? wardrobeItems[0]?.image_url} alt={item.wardrobe_item_name} />
                      <div>
                        <h4 className="serif" style={{ margin: 0 }}>{item.wardrobe_item_name}</h4>
                        <p className="muted" style={{ margin: 0 }}>{item.wardrobe_item_category}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Badge tone="outline">Wardrobe items: {wardrobeItems.length}</Badge>
              </div>
            </Card>
          );
        })}
      </div>
    </motion.section>
  );
}
