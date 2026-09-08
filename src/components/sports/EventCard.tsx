import React from 'react';
import { useSession } from '../../context/SessionContext';
import { SportsEvent } from '../../types/canonical';
import { Users, TrendingUp, TrendingDown, Clock, PlusCircle } from 'lucide-react';

export const EventCard: React.FC<{
  event: SportsEvent;
  onJoinRoom: () => void;
  onCreateRoom?: (event: SportsEvent) => void;
}> = ({
  event,
  onJoinRoom,
  onCreateRoom,
}) => {
  const { betslip, toggleSelection, selectEvent, selectMarket } = useSession();

  const isSelected = (selectionId: string) =>
    betslip.some(item => item.selectionId === selectionId);

  return (
    <div className="bg-[#15151c] border border-[#242430] hover:border-[#353545] rounded transition flex flex-col overflow-hidden shadow">
      {/* Tournament Header Bar */}
      <div className="bg-[#1c1c25] px-3 py-1.5 flex items-center justify-between border-b border-[#242430] text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-zinc-200 tracking-wide">{event.tournament}</span>
          <span className="text-zinc-500">•</span>
          <span className="text-zinc-400">{event.category}</span>
        </div>

        <div className="flex items-center gap-2">
          {event.isLive ? (
            <span className="flex items-center gap-1.5 text-white font-black bg-[#d01111] px-2 py-0.5 rounded text-[11px] uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              LIVE {event.clock}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-zinc-400 font-medium text-[11px]">
              <Clock className="w-3 h-3 text-zinc-500" />
              {event.clock}
            </span>
          )}

          {onCreateRoom && (
            <button
              onClick={() => onCreateRoom(event)}
              title="Create a custom live room with friends for this match"
              className="flex items-center gap-1 bg-[#1a1a24] border border-[#303040] hover:border-blue-400 hover:text-white text-zinc-300 px-2 py-0.5 rounded text-[11px] font-bold transition"
            >
              <PlusCircle className="w-3 h-3 text-[#ffd000]" />
              Create Room
            </button>
          )}

          {event.hasLiveRoom && (
            <button
              onClick={onJoinRoom}
              className="flex items-center gap-1 bg-[#1752bf]/20 border border-[#1752bf]/50 hover:bg-[#1752bf] text-blue-300 hover:text-white px-2 py-0.5 rounded text-[11px] font-bold transition"
            >
              <Users className="w-3 h-3" />
              Room ({event.activeRoomParticipants})
            </button>
          )}
        </div>
      </div>

      {/* Match Body */}
      <div className="p-3 flex flex-col gap-3">
        <div
          onClick={() => selectEvent(event)}
          className="flex items-center justify-between cursor-pointer group"
          title={`View ${event.homeTeam} vs ${event.awayTeam}`}
        >
          <div className="flex flex-col gap-1 flex-1">
            <div className="flex items-center justify-between pr-4">
              <div className="flex items-center gap-2">
                <img
                  src="/assets/sports/team_home.png"
                  alt=""
                  className="w-3.5 h-3.5 object-contain shrink-0 opacity-90"
                  onError={e => (e.currentTarget.style.display = 'none')}
                />
                <span className="font-semibold text-sm text-white group-hover:text-blue-400 transition">{event.homeTeam}</span>
              </div>
              {event.score && (
                <span className="font-mono font-bold text-sm text-[#ffd000]">{event.score.home}</span>
              )}
            </div>
            <div className="flex items-center justify-between pr-4">
              <div className="flex items-center gap-2">
                <img
                  src="/assets/sports/team_away.png"
                  alt=""
                  className="w-3.5 h-3.5 object-contain shrink-0 opacity-90"
                  onError={e => (e.currentTarget.style.display = 'none')}
                />
                <span className="font-semibold text-sm text-white group-hover:text-blue-400 transition">{event.awayTeam}</span>
              </div>
              {event.score && (
                <span className="font-mono font-bold text-sm text-[#ffd000]">{event.score.away}</span>
              )}
            </div>
          </div>

          {event.stats && (
            <div className="hidden sm:flex flex-col text-[10px] text-zinc-400 bg-[#101015] px-2.5 py-1 rounded border border-[#23232f]">
              <span className="flex justify-between gap-3">
                <span className="text-zinc-500">Attacks:</span>
                <span className="font-mono font-bold text-zinc-300">{event.stats.attacks}</span>
              </span>
              <span className="flex justify-between gap-3">
                <span className="text-zinc-500">Possession:</span>
                <span className="font-mono font-bold text-zinc-300">{event.stats.possession}%</span>
              </span>
            </div>
          )}
        </div>

        {/* Odds Row with authentic rectangular buttons */}
        <div className="flex flex-col gap-2 pt-2 border-t border-[#20202a]">
          {event.markets.map(market => (
            <div key={market.id} className="flex items-center justify-between gap-2">
              <span
                onClick={() => {
                  selectEvent(event);
                  selectMarket(market.id, market.name);
                }}
                className="text-xs text-zinc-400 hover:text-white font-bold uppercase tracking-wider w-24 truncate cursor-pointer transition"
                title={`Select market: ${market.name}`}
              >
                {market.name}
              </span>
              <div className="flex items-center gap-1.5 flex-1 justify-end">
                {market.selections.map(sel => {
                  const selected = isSelected(sel.id);
                  return (
                    <button
                      key={sel.id}
                      onClick={() => toggleSelection(event, market.id, sel.id)}
                      className={
                        'flex-1 max-w-[110px] h-8 rounded px-2 flex items-center justify-between text-xs font-bold transition border ' +
                        (selected
                          ? 'bg-[#1752bf] border-blue-400 text-white shadow-sm'
                          : 'bg-[#20202a] border-[#2d2d3a] text-zinc-200 hover:bg-[#282836] hover:border-[#404055]') +
                        (sel.trend === 'UP' ? ' animate-drift-up' : sel.trend === 'DOWN' ? ' animate-drift-down' : '')
                      }
                    >
                      <span className="text-[11px] font-medium text-zinc-400 truncate mr-1">
                        {sel.name}
                      </span>
                      <span className="flex items-center font-mono font-bold text-zinc-100">
                        {sel.odds.toFixed(2)}
                        {sel.trend === 'UP' && (
                          <TrendingUp className="w-3 h-3 ml-0.5 text-emerald-400" />
                        )}
                        {sel.trend === 'DOWN' && (
                          <TrendingDown className="w-3 h-3 ml-0.5 text-[#d01111]" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
