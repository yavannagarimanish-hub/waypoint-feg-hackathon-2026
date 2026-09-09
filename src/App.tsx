import React, { useState, useEffect, useRef } from 'react';
import { SessionProvider, useSession } from './context/SessionContext';
import { CommandBar } from './components/common/CommandBar';
import { EventCard } from './components/sports/EventCard';
import { SmartStart } from './components/sports/SmartStart';
import { ContinuePlaying } from './components/sports/ContinuePlaying';
import { RecentlyViewed } from './components/sports/RecentlyViewed';
import { MyLiveRooms } from './components/sports/MyLiveRooms';
import { SessionActivity } from './components/sports/SessionActivity';
import { BetslipTray } from './components/betslip/BetslipTray';
import { LiveRoom } from './components/social/LiveRoom';
import { CreateRoomModal, JoinRoomModal } from './components/social/RoomModals';
import { ProfileModal, LoginModal } from './components/social/UserModals';
import { CustomerLoginPortal } from './components/auth/CustomerLoginPortal';
import { OperatorDashboard } from './components/operator/OperatorDashboard';
import { SportsEvent } from './types/canonical';
import { parseRoomUrl, resolveRoomDeepLink } from './services/roomDeepLink';
import { AlertTriangle, Home } from 'lucide-react';

/**
 * Deterministic Portal Route Resolver
 * Guarantees strict separation between Customer User Portal (/ or /user)
 * and Operator Admin Portal (/admin).
 */
export function resolvePortalRoute(pathname: string, hash: string): 'user' | 'admin' {
  const path = (pathname || '').toLowerCase();
  const h = (hash || '').toLowerCase();
  if (path.startsWith('/admin') || h.startsWith('#admin') || h === '#/admin') {
    return 'admin';
  }
  return 'user';
}

const MainLayout: React.FC = () => {
  const { state, events, activeEvent, selectEvent, joinRoom, joinCustomRoom, navigateToScreen, user, loginUser } = useSession();
  
  // Two clearly separated application experiences: 'user' vs 'admin'
  const [portal, setPortal] = useState<'user' | 'admin'>(() => {
    if (typeof window === 'undefined') return 'user';
    return resolvePortalRoute(window.location.pathname, window.location.hash);
  });

  // Sync portal with URL changes (popstate & hashchange)
  useEffect(() => {
    const handleUrlChange = () => {
      setPortal(resolvePortalRoute(window.location.pathname, window.location.hash));
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  const switchPortal = (target: 'user' | 'admin') => {
    setPortal(target);
    if (target === 'admin') {
      try {
        window.history.pushState(null, '', '/admin');
      } catch {
        window.location.hash = '#admin';
      }
    } else {
      try {
        window.history.pushState(null, '', '/user');
      } catch {
        window.location.hash = '#user';
      }
    }
  };

  const [timeFilter, setTimeFilter] = useState<string>('ALL');
  const [sportFilter, setSportFilter] = useState<string>('ALL');
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [isJoinRoomOpen, setIsJoinRoomOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [modalEvent, setModalEvent] = useState<SportsEvent | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);

  // Authoritative deep-link resolver on application initialization
  const deepLinkResolvedRef = useRef(false);

  useEffect(() => {
    if (deepLinkResolvedRef.current) return;
    deepLinkResolvedRef.current = true;

    // Check both hash and pathname for room links
    const hash = window.location.hash || '';
    const path = window.location.pathname || '';
    const fullLoc = hash.includes('/room/') ? hash : (path.includes('/room/') ? path + window.location.search : '');

    if (!fullLoc) return;

    const payload = parseRoomUrl(fullLoc);
    if (!payload) {
      setRoomError('The room link is invalid or the match is no longer available.');
      navigateToScreen('room');
      return;
    }

    const resolution = resolveRoomDeepLink(payload, events, state.sessionId);
    if (resolution.success && resolution.room && resolution.event) {
      setRoomError(null);
      joinCustomRoom(resolution.room);
    } else {
      setRoomError(resolution.error || 'The room link is invalid or the match is no longer available.');
      navigateToScreen('room');
    }
  }, [events, state.sessionId, joinCustomRoom, navigateToScreen]);

  const handleOpenCreateRoom = (event?: SportsEvent) => {
    setModalEvent(event || null);
    setIsCreateRoomOpen(true);
  };

  const handleOpenJoinRoom = () => {
    setIsJoinRoomOpen(true);
  };

  const filteredEvents = events.filter(e => {
    if (sportFilter !== 'ALL' && e.sportId !== sportFilter) return false;
    if (timeFilter === 'LIVE' && !e.isLive) return false;
    return true;
  });

  // RENDER ADMIN PORTAL
  if (portal === 'admin') {
    return (
      <div className="min-h-screen bg-[#0c0c12] text-zinc-200 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
        {/* Standalone Operator Top Shell */}
        <header className="h-14 bg-[#12121a] border-b border-[#242436] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-50 shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-black text-sm text-white tracking-wider font-mono">
                WAYPOINT OPERATOR INTELLIGENCE
              </span>
            </div>
            <span className="bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase hidden sm:inline-block">
              Dedicated Admin Portal (/admin)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs font-mono text-zinc-400 hidden md:flex items-center gap-2">
              <span>Telemetry:</span>
              <strong className="text-emerald-400">ACTIVE ({state.journeyStage})</strong>
              <span className="text-zinc-600">|</span>
              <span>Health:</span>
              <strong className="text-zinc-200">{state.healthState}</strong>
            </div>

            <button
              onClick={() => switchPortal('user')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a27] hover:bg-[#252538] text-xs font-bold text-zinc-200 hover:text-white border border-[#303046] transition shadow-sm"
              title="Return to Customer Sportsbook"
            >
              <span>← Return to User Portal</span>
            </button>
          </div>
        </header>

        {/* 14 Operator Intelligence Diagnostic Views */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-5">
          <OperatorDashboard onSwitchPortal={switchPortal} />
        </main>
      </div>
    );
  }

  // RENDER CUSTOMER LOGIN PORTAL IF UNAUTHENTICATED
  if (!user) {
    return (
      <CustomerLoginPortal
        onLoginSuccess={(u) => {
          loginUser(u.username, u.displayName, u.avatar);
        }}
        onSwitchToAdmin={() => switchPortal('admin')}
      />
    );
  }

  // RENDER USER PORTAL (AUTHENTICATED)
  return (
    <div className="min-h-screen bg-[#0e0e11] text-zinc-200 flex flex-col font-sans pb-8 selection:bg-[#1752bf] selection:text-white">
      {/* Top Command Bar & Session GPS */}
      <CommandBar
        onOpenCreateRoom={() => handleOpenCreateRoom()}
        onOpenJoinRoom={handleOpenJoinRoom}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenLogin={() => setIsLoginOpen(true)}
      />

      {/* Subnavigation Bar matching PSK sub-nav */}
      <div className="bg-[#14141a] border-b border-[#242430] px-4 py-1 hidden md:flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-4">
          <span className="text-white font-bold cursor-pointer hover:text-blue-400">Home</span>
          <span className="cursor-pointer hover:text-white">Live Betting</span>
          <span className="cursor-pointer hover:text-white">Results</span>
          <span className="cursor-pointer hover:text-white">Statistics</span>
          <span className="cursor-pointer hover:text-white">Lotto</span>
          <span className="cursor-pointer hover:text-white">Casino</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>System Nominal • Idempotency Shield Active</span>
        </div>
      </div>

      {/* Primary 3-Column Sportsbook IA Layout */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto p-2 sm:p-4">
        {(state.currentScreen === 'home' || state.currentScreen === 'sports') && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start">
            
            {/* COLUMN 1: LEFT NAVIGATION & SPORTS TREE (~240px / 3 cols on lg, 2 cols on xl) */}
            <aside className="hidden lg:flex lg:col-span-3 xl:col-span-2 flex-col gap-3">
              {/* Quick Filters Card */}
              <div className="bg-[#15151c] border border-[#242430] rounded p-3 flex flex-col gap-1 shadow">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Quick Filters
                </span>
                {[
                  { id: 'ALL', label: 'All Matches', count: events.length },
                  { id: 'LIVE', label: 'Live Offers', count: events.filter(e => e.isLive).length },
                  { id: '1H', label: 'Next 1 Hour', count: 3 },
                  { id: 'TODAY', label: 'Today', count: events.length },
                ].map(tf => (
                  <button
                    key={tf.id}
                    onClick={() => setTimeFilter(tf.id)}
                    className={
                      'w-full px-2.5 py-1.5 rounded text-xs font-semibold flex items-center justify-between transition ' +
                      (timeFilter === tf.id
                        ? 'bg-[#1752bf] text-white font-bold'
                        : 'text-zinc-300 hover:bg-[#20202a]')
                    }
                  >
                    <span>{tf.label}</span>
                    <span className="text-[10px] opacity-75 font-mono">({tf.count})</span>
                  </button>
                ))}
              </div>

              {/* Sports Category Tree matching PSK */}
              <div className="bg-[#15151c] border border-[#242430] rounded p-3 flex flex-col gap-1 shadow">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Sports
                </span>
                {[
                  { id: 'ALL', label: 'All Sports', icon: null, count: events.length },
                  { id: '00', label: 'Football', icon: '/assets/sports/football.png', count: events.filter(e => e.sportId === '00').length },
                  { id: '0x', label: 'Tennis', icon: '/assets/sports/tennis.png', count: events.filter(e => e.sportId === '0x').length },
                  { id: '01', label: 'Basketball', icon: '/assets/sports/basketball.png', count: 0 },
                  { id: '02', label: 'Ice Hockey', icon: '/assets/sports/icehockey.png', count: 0 },
                  { id: '03', label: 'Handball', icon: '/assets/sports/handball.png', count: 0 },
                  { id: '04', label: 'Esports', icon: '/assets/sports/esports.png', count: 0 },
                ].map(sf => (
                  <button
                    key={sf.id}
                    onClick={() => setSportFilter(sf.id)}
                    className={
                      'w-full px-2.5 py-1.5 rounded text-xs font-semibold flex items-center justify-between transition ' +
                      (sportFilter === sf.id
                        ? 'bg-[#1c1c27] text-[#ffd000] border-l-2 border-l-[#ffd000] font-bold'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1a1a24]')
                    }
                  >
                    <span className="flex items-center gap-2">
                      {sf.icon ? (
                        <img src={sf.icon} alt={sf.label} className="w-4 h-4 object-contain shrink-0 opacity-80" />
                      ) : (
                        <span className="w-4 h-4 rounded-full bg-zinc-700/50 flex items-center justify-center text-[10px]">
                          ⚡
                        </span>
                      )}
                      <span>{sf.label}</span>
                    </span>
                    <span className="text-[10px] opacity-75 font-mono">({sf.count})</span>
                  </button>
                ))}
              </div>

              {/* Casino Cross-Sell Promo matching PSK cloned sidebar */}
              <div className="bg-[#15151c] border border-[#242430] rounded p-2.5 flex flex-col gap-2 shadow">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Featured Casino
                </span>
                <div className="rounded overflow-hidden relative group cursor-pointer border border-zinc-700/30">
                  <img
                    src="/assets/casino/burning-hot.jpg"
                    alt="Burning Hot"
                    className="w-full h-20 object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                    <span className="text-xs font-black text-amber-400">Burning Hot 40</span>
                  </div>
                </div>
              </div>
            </aside>

            {/* COLUMN 2: CENTER MATCH OFFERS FEED (~500-600px / 6 cols on lg, 7 cols on xl) */}
            <section className="col-span-1 lg:col-span-6 xl:col-span-7 flex flex-col gap-3">
              {/* Continue Playing / Smart Resume Component (Phase 15.2 P0 Re-Entry) */}
              <ContinuePlaying />

              {/* High-Intent Smart Start Kickstarter */}
              <SmartStart onJoinFeaturedRoom={() => {
                const target = events.find(e => e.activeRoomParticipants && e.activeRoomParticipants > 0) || events[0];
                if (target) joinRoom(target);
              }} />

              {/* Recently Viewed (Phase 17) */}
              <RecentlyViewed />

              {/* Horizontal Sport Filter Ribbon for Small Screens */}
              <div className="flex lg:hidden overflow-x-auto gap-2 pb-1 text-xs">
                {[
                  { id: 'ALL', label: 'All' },
                  { id: '00', label: 'Football' },
                  { id: '0x', label: 'Tennis' },
                  { id: '01', label: 'Basketball' },
                ].map(sf => (
                  <button
                    key={sf.id}
                    onClick={() => setSportFilter(sf.id)}
                    className={
                      'px-3 py-1.5 rounded font-bold whitespace-nowrap ' +
                      (sportFilter === sf.id ? 'bg-[#1752bf] text-white' : 'bg-[#15151c] text-zinc-300')
                    }
                  >
                    {sf.label}
                  </button>
                ))}
              </div>

              {/* Feed Header */}
              <div className="bg-[#15151c] border border-[#242430] px-3 py-2 rounded flex items-center justify-between text-xs">
                <span className="font-bold text-white uppercase tracking-wider">
                  Match Offers ({filteredEvents.length})
                </span>
                <span className="text-zinc-500 text-[11px]">
                  Display: 1 X 2 Primary Markets
                </span>
              </div>

              {/* Dense Fixtures Feed */}
              <div className="flex flex-col gap-2">
                {filteredEvents.map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onJoinRoom={() => {
                      joinRoom(event);
                    }}
                    onCreateRoom={ev => handleOpenCreateRoom(ev)}
                  />
                ))}
              </div>

              {/* My Live Rooms (Phase 17) */}
              <MyLiveRooms />

              {/* Session Activity Timeline (Phase 17) */}
              <SessionActivity />
            </section>

            {/* COLUMN 3: RIGHT PERSISTENT BETSLIP (~3 cols on lg, 3 cols on xl) */}
            <aside className="hidden lg:block lg:col-span-3 xl:col-span-3 sticky top-14">
              <BetslipTray isDesktopMode={true} />
            </aside>
          </div>
        )}

        {/* Event-Anchored Social Live Room */}
        {state.currentScreen === 'room' && (
          <div className="max-w-5xl mx-auto p-2 sm:p-4">
            {roomError ? (
              <div className="p-8 text-center bg-[#15151c] rounded-lg border border-[#303040] shadow-xl flex flex-col items-center gap-4 max-w-lg mx-auto">
                <div className="w-12 h-12 rounded-full bg-red-950/50 border border-red-500/40 flex items-center justify-center text-[#d01111]">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-bold text-white">Room unavailable</h2>
                  <p className="text-xs text-zinc-400">
                    The room link is invalid or the match is no longer available.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setRoomError(null);
                    window.location.hash = '';
                    navigateToScreen('sports');
                  }}
                  className="px-4 py-2 bg-[#1752bf] hover:bg-blue-600 text-white rounded text-xs font-bold flex items-center gap-2 transition shadow"
                >
                  <Home className="w-4 h-4" />
                  Return Home
                </button>
              </div>
            ) : activeEvent ? (
              <LiveRoom
                event={activeEvent}
                onBack={() => {
                  window.location.hash = '';
                  navigateToScreen('sports');
                }}
              />
            ) : (
              <div className="p-8 text-center text-zinc-400 bg-[#15151c] rounded border border-[#242430]">
                No active event selected. Please select a match from the offers feed.
              </div>
            )}
          </div>
        )}
      </main>

      {/* Customer Sportsbook Footer */}
      <footer className="mt-8 border-t border-[#1a1a24] py-3 px-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-500 gap-2 max-w-[1600px] mx-auto w-full">
        <div className="flex items-center gap-2">
          <span>PSK Waypoint</span>
          <span>•</span>
          <span>Customer Sportsbook Portal</span>
        </div>
        <div className="text-zinc-600 font-mono text-[10px]">
          Session Protection Active • Idempotency Shield Nominal
        </div>
      </footer>

      {/* Create & Join Room Modals */}
      <CreateRoomModal
        isOpen={isCreateRoomOpen}
        onClose={() => setIsCreateRoomOpen(false)}
        preselectedEvent={modalEvent}
      />
      <JoinRoomModal
        isOpen={isJoinRoomOpen}
        onClose={() => setIsJoinRoomOpen(false)}
      />

      {/* Social Identity & Profile Modals */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onOpenLogin={() => setIsLoginOpen(true)}
      />
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
      />

      {/* Mobile Drawer Betslip */}
      <div className="lg:hidden">
        <BetslipTray isDesktopMode={false} />
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <SessionProvider>
      <MainLayout />
    </SessionProvider>
  );
};

export default App;
