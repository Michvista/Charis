import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import { AuthScreen } from './components/layout/AuthScreen';
import { AppShell } from './components/layout/AppShell';
import { Button } from './components/ui/Button';
import { Card } from './components/ui/Card';
import { Badge } from './components/ui/Badge';
import { CategoryChart } from './components/charts/CategoryChart';
import { WearFrequencyChart } from './components/charts/WearFrequencyChart';
import { ColorChart } from './components/charts/ColorChart';
import { CostPerWearChart } from './components/charts/CostPerWearChart';
import { login, logout, fetchProfile } from './api/auth.api';
import { fetchAnalyticsOverview } from './api/analytics.api';
import { listWardrobeItems, listWearLogs } from './api/wardrobe.api';
import { listSocialFeed, listFriendships } from './api/social.api';
import { listTrips, generatePackingList } from './api/tripplanner.api';
import { listOccasions, generateCombos, fetchVerdict, completeStyleAdvisor, createOccasion } from './api/styling.api';
import { getStoredSession, clearSession } from './api/client';
import {
  demoAnalytics,
  demoOccasions,
  demoShares,
  demoSuggestions,
  demoTrips,
  demoWardrobe,
} from './data/demo';
import type {
  AnalyticsOverview,
  AuthSession,
  Occasion,
  PageId,
  PackingList,
  OutfitShare,
  Friendship,
  Trip,
  WardrobeItem,
  WearLog,
  StyleAdvisorSuggestion,
  VerdictResponse,
  StylingItem,
} from './lib/types';
import {
  AnalyticsPage,
  AdvisorPage,
  SocialPage,
  StylingPage,
  TripsPage,
  WardrobePage,
} from './features';

type Notice = {
  tone: 'success' | 'error' | 'info';
  message: string;
};

type AppState = {
  session: AuthSession | null;
  profileLoading: boolean;
  activePage: PageId;
  notice: Notice | null;
  wardrobeItems: WardrobeItem[];
  wearLogs: WearLog[];
  analytics: AnalyticsOverview;
  trips: Trip[];
  shares: OutfitShare[];
  friendships: Friendship[];
  occasions: Occasion[];
  suggestions: StyleAdvisorSuggestion[];
  verdict: VerdictResponse | null;
  verdictLoading: boolean;
  selectedItemId: string | null;
};

const initialSession = getStoredSession();

function App() {
  const [state, setState] = useState<AppState>({
    session: initialSession ? { ...initialSession, user: initialSession.user } : null,
    profileLoading: Boolean(initialSession),
    activePage: 'wardrobe',
    notice: null,
    wardrobeItems: demoWardrobe,
    wearLogs: [],
    analytics: demoAnalytics,
    trips: demoTrips,
    shares: demoShares,
    friendships: [],
    occasions: demoOccasions,
    suggestions: demoSuggestions,
    verdict: null,
    verdictLoading: false,
    selectedItemId: null,
  });

  const token = state.session?.accessToken ?? null;

  useEffect(() => {
    let ignore = false;

    async function bootstrap() {
      if (!token) {
        return;
      }

      try {
        const [profile, wardrobe, wearLogs, analytics, trips, shares, friendships, occasions] = await Promise.all([
          fetchProfile(token),
          listWardrobeItems(token).catch(() => demoWardrobe),
          listWearLogs(token).catch(() => []),
          fetchAnalyticsOverview(token).catch(() => demoAnalytics),
          listTrips(token).catch(() => demoTrips),
          listSocialFeed(token).catch(() => demoShares),
          listFriendships(token).catch(() => []),
          listOccasions(token).catch(() => demoOccasions),
        ]);

        if (ignore) return;

        setState((current) => ({
          ...current,
          session: current.session ? { ...current.session, user: profile } : current.session,
          wardrobeItems: wardrobe.length ? wardrobe : demoWardrobe,
          wearLogs,
          analytics: analytics ?? demoAnalytics,
          trips: trips.length ? trips : demoTrips,
          shares: shares.length ? shares : demoShares,
          friendships,
          occasions: occasions.length ? occasions : demoOccasions,
          profileLoading: false,
        }));
      } catch {
        if (!ignore) {
          setState((current) => ({ ...current, profileLoading: false }));
        }
      }
    }

    bootstrap();
    return () => {
      ignore = true;
    };
  }, [token]);

  const selectedItem = useMemo(
    () => state.wardrobeItems.find((item) => item.id === state.selectedItemId) ?? state.wardrobeItems[0] ?? null,
    [state.selectedItemId, state.wardrobeItems],
  );

  async function handleAuthenticated(nextSession: AuthSession) {
    setState((current) => ({
      ...current,
      session: nextSession,
      profileLoading: false,
      notice: { tone: 'success', message: 'Welcome back to Charis.' },
    }));
  }

  async function handleLogout() {
    if (state.session) {
      try {
        await logout(state.session.accessToken, state.session.refreshToken);
      } catch {
        clearSession();
      }
    }

    setState((current) => ({
      ...current,
      session: null,
      notice: { tone: 'info', message: 'You have been logged out.' },
    }));
  }

  async function handleRefresh() {
    if (!token) return;

    const [wardrobe, wearLogs, analytics, trips, shares, friendships, occasions] = await Promise.all([
      listWardrobeItems(token).catch(() => demoWardrobe),
      listWearLogs(token).catch(() => []),
      fetchAnalyticsOverview(token).catch(() => demoAnalytics),
      listTrips(token).catch(() => demoTrips),
      listSocialFeed(token).catch(() => demoShares),
      listFriendships(token).catch(() => []),
      listOccasions(token).catch(() => demoOccasions),
    ]);

    setState((current) => ({
      ...current,
      wardrobeItems: wardrobe.length ? wardrobe : demoWardrobe,
      wearLogs,
      analytics: analytics ?? demoAnalytics,
      trips: trips.length ? trips : demoTrips,
      shares: shares.length ? shares : demoShares,
      friendships,
      occasions: occasions.length ? occasions : demoOccasions,
      notice: { tone: 'success', message: 'Data refreshed from the live services.' },
    }));
  }

  async function handleCreateOccasion(name: string, formalityLevel: number) {
    if (!token) return;
    const occasion = await createOccasion(token, { name, formalityLevel });
    setState((current) => ({
      ...current,
      occasions: [occasion, ...current.occasions],
      notice: { tone: 'success', message: `Occasion "${name}" saved.` },
    }));
  }

  async function handleGenerateStyling(items: StylingItem[], occasionId?: string, targetSeason?: string) {
    if (!token) return;
    setState((current) => ({ ...current, verdictLoading: true }));

    try {
      const comboResponse = await generateCombos(token, {
        occasionId,
        targetSeason,
        items,
      });

      let verdict: VerdictResponse | null = null;
      try {
        verdict = await fetchVerdict(token, comboResponse.outfitId);
      } catch {
        verdict = null;
      }

      setState((current) => ({
        ...current,
        verdictLoading: false,
        verdict: verdict ?? { outfitId: comboResponse.outfitId, status: comboResponse.status as VerdictResponse['status'] },
        activePage: 'styling',
        notice: { tone: 'success', message: 'Styling analysis completed.' },
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        verdictLoading: false,
        notice: { tone: 'error', message: error instanceof Error ? error.message : 'Styling analysis failed.' },
      }));
    }
  }

  async function handleGenerateAdvisor() {
    if (!token) return;

    try {
      const response = await completeStyleAdvisor(token, {
        occasion_description: 'Formal dinner with editorial styling constraints',
        occasion_formality: 4,
        current_item_descriptions: state.wardrobeItems.slice(0, 3).map((item) => `${item.name} (${item.category})`),
      });

      setState((current) => ({
        ...current,
        suggestions: response.suggestions.length ? response.suggestions : demoSuggestions,
        activePage: 'advisor',
        notice: { tone: 'success', message: 'Style advisor refreshed.' },
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        notice: { tone: 'error', message: error instanceof Error ? error.message : 'Advisor request failed.' },
      }));
    }
  }

  async function handleGeneratePackingList(tripId: string) {
    if (!token) return;

    try {
      const list = await generatePackingList(token, tripId);
      setState((current) => ({
        ...current,
        trips: current.trips.map((trip) => (trip.id === tripId ? { ...trip, packing_lists: [list] } : trip)),
        notice: { tone: 'success', message: 'Packing list generated.' },
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        notice: { tone: 'error', message: error instanceof Error ? error.message : 'Packing list generation failed.' },
      }));
    }
  }

  async function handleSeedSession() {
    try {
      const session = await login('editor@example.com', 'Password123!');
      await handleAuthenticated(session);
    } catch (error) {
      setState((current) => ({
        ...current,
        notice: { tone: 'error', message: error instanceof Error ? error.message : 'Demo login failed.' },
      }));
    }
  }

  if (!state.session) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="app-root">
      <AppShell
        page={state.activePage}
        onPageChange={(page) => setState((current) => ({ ...current, activePage: page }))}
        profile={state.session.user}
        onLogout={handleLogout}
      >
        <div className="page">
          <header className="hero">
            <div className="hero-copy">
              <span className="eyebrow">Charis Wardrobe OS</span>
              <h1 className="serif page-title">
                {state.activePage === 'wardrobe' && 'Wardrobe Intelligence'}
                {state.activePage === 'styling' && 'Outfit Builder'}
                {state.activePage === 'trips' && 'Trip Planning Studio'}
                {state.activePage === 'social' && 'The Lookbook'}
                {state.activePage === 'analytics' && 'Wardrobe Intelligence'}
                {state.activePage === 'advisor' && 'Styling Advisor'}
              </h1>
              <p className="page-subtitle">
                {state.activePage === 'wardrobe' && 'A curated view of your sartorial habits and collection value.'}
                {state.activePage === 'styling' && 'Compose looks from your wardrobe, score them with the live styling service, and rerank with AI when available.'}
                {state.activePage === 'trips' && 'Build travel capsules, itinerary-aware packing lists, and outfit coverage summaries.'}
                {state.activePage === 'social' && 'Share editorial looks and watch the community react in real time.'}
                {state.activePage === 'analytics' && 'Measure wear frequency, category balance, cost per wear, and color usage.'}
                {state.activePage === 'advisor' && 'Ask the backend style advisor for grounded suggestions based on occasion context.'}
              </p>
              <div className="hero-cta-row">
                <Button onClick={handleRefresh} variant="primary">
                  <RefreshCw size={16} />
                  Refresh Live Data
                </Button>
                <Button onClick={handleSeedSession} variant="outline">
                  <Sparkles size={16} />
                  Re-sync Demo Login
                </Button>
              </div>
            </div>
            <Card className="hero-panel">
              <img
                src="https://images.unsplash.com/photo-1542060748-10c28b62716f?auto=format&fit=crop&w=1400&q=80"
                alt="Editorial wardrobe rack"
              />
              <div className="hero-overlay">
                <p className="eyebrow">Today's Suggestion</p>
                <h3 className="serif">Cashmere &amp; Silk</h3>
                <p className="muted">Perfect for a 68°F evening and an elevated, neutral palette.</p>
              </div>
            </Card>
          </header>

          {state.notice && (
            <div className={`empty-state ${state.notice.tone}`}>
              <AlertCircle size={16} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} />
              {state.notice.message}
            </div>
          )}

          <AnimatePresence mode="wait">
            {state.activePage === 'wardrobe' && (
              <WardrobePage
                key="wardrobe"
                items={state.wardrobeItems}
                wearLogs={state.wearLogs}
                analytics={state.analytics}
                selectedItem={selectedItem}
                onSelectItem={(id) => setState((current) => ({ ...current, selectedItemId: id }))}
              />
            )}
            {state.activePage === 'styling' && (
              <StylingPage
                key="styling"
                wardrobeItems={state.wardrobeItems}
                occasions={state.occasions}
                verdict={state.verdict}
                loading={state.verdictLoading}
                onCreateOccasion={handleCreateOccasion}
                onGenerateStyling={handleGenerateStyling}
              />
            )}
            {state.activePage === 'trips' && (
              <TripsPage
                key="trips"
                trips={state.trips}
                wardrobeItems={state.wardrobeItems}
                onGeneratePackingList={handleGeneratePackingList}
              />
            )}
            {state.activePage === 'social' && (
              <SocialPage
                key="social"
                shares={state.shares}
                friendships={state.friendships}
              />
            )}
            {state.activePage === 'analytics' && (
              <AnalyticsPage key="analytics" analytics={state.analytics} />
            )}
            {state.activePage === 'advisor' && (
              <AdvisorPage
                key="advisor"
                suggestions={state.suggestions}
                onRefreshAdvisor={handleGenerateAdvisor}
              />
            )}
          </AnimatePresence>
        </div>
      </AppShell>
    </div>
  );
}

export default App;
