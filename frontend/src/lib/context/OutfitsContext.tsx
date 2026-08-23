'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { listOutfits, createOutfit, deleteOutfit, type OutfitRecord, type CreateOutfitInput } from '@/api/outfits.api';
import { useAuth } from './AuthContext';

type OutfitsContextType = {
  outfits: OutfitRecord[];
  loading: boolean;
  refresh: () => Promise<void>;
  saveOutfit: (input: CreateOutfitInput) => Promise<OutfitRecord>;
  removeOutfit: (id: string) => Promise<void>;
  getSnapshot: (outfitId: string) => OutfitRecord | undefined;
  isSaved: (outfitId: string) => boolean;
};

const OutfitsContext = createContext<OutfitsContextType | null>(null);

export function OutfitsProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [outfits, setOutfits] = useState<OutfitRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!session?.accessToken) return;
    setLoading(true);
    try {
      const data = await listOutfits(session.accessToken);
      setOutfits(Array.isArray(data) ? data : []);

      // One-time migration: import outfits saved in the old localStorage key
      // (charis.saved_outfits) into the backend so they aren't lost.
      if (typeof window !== 'undefined') {
        const legacyRaw = window.localStorage.getItem('charis.saved_outfits');
        if (legacyRaw) {
          try {
            const legacy = JSON.parse(legacyRaw);
            const existingIds = new Set((Array.isArray(data) ? data : []).map((o) => o.outfit_id));
            const missing = Array.isArray(legacy)
              ? legacy.filter((o: any) => o?.outfitId && !existingIds.has(o.outfitId))
              : [];

            for (const o of missing) {
              await createOutfit(session.accessToken, {
                outfit_id: o.outfitId,
                name: o.name || `Ensemble (${o.score ?? 0}%)`,
                score: o.score ?? 0,
                verdict: o.verdict || 'works',
                visual_notes: o.visualNotes || '',
                items: (o.items || []).map((i: any) => ({
                  name: i.name,
                  image_url: i.image_url,
                  category: i.category,
                })),
              });
            }

            if (missing.length > 0) {
              const updated = await listOutfits(session.accessToken);
              setOutfits(Array.isArray(updated) ? updated : []);
            }
            // Only drop the legacy key once everything imported cleanly.
            window.localStorage.removeItem('charis.saved_outfits');
          } catch {
            // Keep the legacy key so the migration retries on the next load.
          }
        }
      }
    } catch {
      setOutfits([]);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveOutfit = useCallback(
    async (input: CreateOutfitInput) => {
      if (!session?.accessToken) throw new Error('Not authenticated');
      const record = await createOutfit(session.accessToken, input);
      setOutfits((prev) => [record, ...prev.filter((o) => o.id !== record.id)]);
      return record;
    },
    [session]
  );

  const removeOutfit = useCallback(
    async (id: string) => {
      if (!session?.accessToken) return;
      await deleteOutfit(session.accessToken, id);
      setOutfits((prev) => prev.filter((o) => o.id !== id));
    },
    [session]
  );

  const getSnapshot = useCallback(
    (outfitId: string) => outfits.find((o) => o.outfit_id === outfitId),
    [outfits]
  );

  const isSaved = useCallback(
    (outfitId: string) => outfits.some((o) => o.outfit_id === outfitId),
    [outfits]
  );

  return (
    <OutfitsContext.Provider
      value={{ outfits, loading, refresh, saveOutfit, removeOutfit, getSnapshot, isSaved }}
    >
      {children}
    </OutfitsContext.Provider>
  );
}

export function useOutfits() {
  const ctx = useContext(OutfitsContext);
  if (!ctx) throw new Error('useOutfits must be used within OutfitsProvider');
  return ctx;
}