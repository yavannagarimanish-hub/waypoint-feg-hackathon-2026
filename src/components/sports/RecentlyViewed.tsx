import React from 'react';
import { useSession } from '../../context/SessionContext';
import { loadRecentlyViewed } from '../../services/customerContextService';
import { Clock, ArrowRight, Activity } from 'lucide-react';

export const RecentlyViewed: React.FC = () => {
  const { events, selectEvent, sessionMemory } = useSession();

  // Exclude current Continue Playing fixture if active to prevent duplicate cards
  const excludeId = sessionMemory?.resumable ? sessionMemory.lastEventId : undefined;
  const recentItems = loadRecentlyViewed(events, excludeId);

  // Requirement: If there are no valid recently viewed fixtures, render nothing.
  if (recentItems.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#15151c] border border-[#242430] rounded p-3 shadow flex flex-col gap-2.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[#ffd000]" />
          <h3 className="text-xs font-black uppercase tracking-wider text-white">
            RECENTLY VIEWED
          </h3>
        </div>
        <span className="text-[10px] font-mono text-zinc-500">
          {recentItems.length} match{recentItems.length > 1 ? 'es' : ''}
        </span>
      </div>

      {/* Fixtures list (Compact PSK sportsbook density) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {recentItems.map(item => {
          const matchingFixture = events.find(e => e.id === item.eventId);
          return (
            <button
              key={item.eventId}
              onClick={() => {
                if (matchingFixture) {
                  selectEvent(matchingFixture);
                }
              }}
              className="text-left bg-[#1a1a24] hover:bg-[#20202e] hover:border-[#1752bf]/60 border border-[#272738] rounded p-2.5 transition flex flex-col justify-between gap-1.5 group"
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <span className="text-[10px] font-semibold text-zinc-400 truncate">
                  {item.sportName || 'Football'} {item.tournament ? `· ${item.tournament}` : ''}
                </span>
                {item.isLive && (
                  <span className="text-[9px] font-black uppercase tracking-wider bg-red-950/60 text-red-400 border border-red-800/40 px-1 py-0.2 rounded shrink-0">
                    Live
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 w-full">
                <span className="text-xs font-bold text-zinc-100 group-hover:text-white truncate">
                  {item.eventName}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-[#ffd000] shrink-0 transition" />
              </div>

              {item.score && (
                <div className="text-[10px] font-mono text-zinc-400">
                  Score: <span className="text-white font-bold">{item.score.home} - {item.score.away}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

