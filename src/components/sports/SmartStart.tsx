import React from 'react';
import { useSession } from '../../context/SessionContext';
import { Sparkles, ChevronRight, Users } from 'lucide-react';

export const SmartStart: React.FC<{ onJoinFeaturedRoom: () => void }> = ({ onJoinFeaturedRoom }) => {
  const { state, events, selectEvent } = useSession();

  // DYNAMIC SELECTION RULES based on active session context:
  // 1. If user filtered or selected a specific sport, find highest engagement live event in that sport.
  // 2. Else if user is in SOCIAL intent, recommend match with highest active room participants.
  // 3. Else default to top live match with active markets.
  const activeSportId = state.currentSport?.id;
  
  let recommendedEvent = events[0];
  let reason = 'High In-Play Volume & Free Micro-Polls';

  if (activeSportId && activeSportId !== '00') {
    const sportMatch = events.find(e => e.sportId === activeSportId);
    if (sportMatch) {
      recommendedEvent = sportMatch;
      reason = `Matching your active interest in ${state.currentSport?.name}`;
    }
  } else if (state.sessionDna === 'SOCIAL') {
    // Sort by active room participants
    const highestSocial = [...events].sort((a, b) => (b.activeRoomParticipants || 0) - (a.activeRoomParticipants || 0))[0];
    if (highestSocial) {
      recommendedEvent = highestSocial;
      reason = `Most active Social Live Room (${highestSocial.activeRoomParticipants} online)`;
    }
  } else if (state.journeyStage === 'DECISION' && state.currentEvent) {
    const matched = events.find(e => e.id === state.currentEvent?.id);
    if (matched) {
      recommendedEvent = matched;
      reason = 'Unfinished selections in progress';
    }
  }

  return (
    <div className="bg-[#15151c] border border-[#242430] border-l-4 border-l-[#1752bf] rounded p-4 shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-blue-400 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-[#ffd000]" />
          <span className="text-white uppercase tracking-wider text-[11px] font-black bg-[#1752bf] px-1.5 py-0.5 rounded">
            PSK Featured
          </span>
          <span className="text-zinc-500">•</span>
          <span className="text-zinc-400 font-normal text-xs">
            Waypoint Intel: {reason}
          </span>
        </div>

        <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2 mt-0.5">
          <img
            src="/assets/sports/football.png"
            alt=""
            className="w-4 h-4 object-contain shrink-0"
          />
          <span>{recommendedEvent.tournament}:</span>
          <span className="flex items-center gap-1">
            <img
              src="/assets/sports/team_home.png"
              alt=""
              className="w-3.5 h-3.5 object-contain shrink-0"
              onError={e => (e.currentTarget.style.display = 'none')}
            />
            {recommendedEvent.homeTeam}
          </span>
          <span className="text-zinc-500 font-normal">vs</span>
          <span className="flex items-center gap-1">
            <img
              src="/assets/sports/team_away.png"
              alt=""
              className="w-3.5 h-3.5 object-contain shrink-0"
              onError={e => (e.currentTarget.style.display = 'none')}
            />
            {recommendedEvent.awayTeam}
          </span>
          {recommendedEvent.isLive ? (
            <span className="px-1.5 py-0.5 rounded bg-[#d01111] text-white text-[10px] font-black uppercase">
              LIVE {recommendedEvent.clock}
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded bg-[#242430] text-zinc-300 text-[10px] font-medium">
              {recommendedEvent.clock}
            </span>
          )}
        </h1>

        <p className="text-xs text-zinc-400 mt-1 max-w-xl">
          {recommendedEvent.isLive && recommendedEvent.score
            ? `Score: ${recommendedEvent.score.home}-${recommendedEvent.score.away} • `
            : ''}
          {recommendedEvent.activeRoomParticipants} fans in room • Session protection and zero duplicate action shield active.
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => {
            selectEvent(recommendedEvent);
            onJoinFeaturedRoom();
          }}
          className="px-3.5 py-2 rounded bg-[#1752bf] hover:bg-[#1447a6] text-white font-bold text-xs shadow flex items-center gap-1.5 transition"
        >
          <Users className="w-3.5 h-3.5 text-blue-200" />
          Enter Live Room ({recommendedEvent.activeRoomParticipants})
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
