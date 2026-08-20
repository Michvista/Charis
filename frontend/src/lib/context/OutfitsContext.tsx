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