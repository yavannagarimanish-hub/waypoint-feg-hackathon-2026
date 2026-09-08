import React from 'react';
import { useSession } from '../../context/SessionContext';
import { loadUserRooms } from '../../services/customerContextService';
import { Users, Radio, ArrowRight, ShieldCheck } from 'lucide-react';

export const MyLiveRooms: React.FC = () => {
  const { events, rooms, joinCustomRoom, joinRoom } = useSession();

  const userRooms = loadUserRooms(events, rooms);

  // If the user has no rooms or invalid rooms, do not show the section
  if (userRooms.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#15151c] border border-[#242430] rounded p-3 shadow flex flex-col gap-2.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <h3 className="text-xs font-black uppercase tracking-wider text-white">
            MY LIVE ROOMS
          </h3>
        </div>
        <span className="text-[10px] font-mono text-zinc-500">
          {userRooms.length} active room{userRooms.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Room cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {userRooms.map(r => {
          const matchingEvent = events.find(e => e.id === r.eventId);
          const fullRoom = rooms.find(rm => rm.roomId === r.roomId || rm.roomCode === r.roomCode);

          return (
            <div
              key={r.roomId}
              className="bg-[#1a1a24] border border-[#272738] rounded p-3 flex flex-col justify-between gap-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-white tracking-tight">
                      🔴 {r.roomName}
                    </span>
                    {r.role === 'host' && (
                      <span className="text-[9px] font-black uppercase tracking-wider bg-[#ffd000]/20 text-[#ffd000] border border-[#ffd000]/40 px-1 py-0.2 rounded">
                        Host
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-400 mt-0.5 block">
                    {matchingEvent ? `${matchingEvent.homeTeam} vs ${matchingEvent.awayTeam}` : 'Live Match'}
                  </span>
                </div>

                <span className="text-[10px] font-mono text-zinc-400 bg-[#242436] px-1.5 py-0.5 rounded shrink-0">
                  {fullRoom?.participantCount || 2} participants
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#232334]">
                <span className="text-[10px] font-mono text-zinc-500">
                  Code: <strong className="text-zinc-300 font-bold">{r.roomCode}</strong>
                </span>

                <button
                  onClick={() => {
                    if (fullRoom) {
                      joinCustomRoom(fullRoom);
                    } else if (matchingEvent) {
                      joinRoom(matchingEvent);
                    }
                  }}
                  className="px-2.5 py-1 bg-[#1752bf] hover:bg-[#1f63e0] text-white text-[11px] font-bold rounded flex items-center gap-1 transition shadow-sm"
                >
                  <span>Join Room</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

