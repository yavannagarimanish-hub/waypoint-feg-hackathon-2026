import React, { useState } from 'react';
import { useSession } from '../../context/SessionContext';
import { SportsEvent, LiveMatchRoom } from '../../types/canonical';
import { Users, X, Copy, Check, Lock, Globe, PlusCircle, ArrowRight, Shield } from 'lucide-react';
import { generateRoomUrl } from '../../services/roomDeepLink';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedEvent?: SportsEvent | null;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  preselectedEvent,
}) => {
  const { events, createCustomRoom, joinCustomRoom } = useSession();

  const [roomName, setRoomName] = useState('My Football Night');
  const [selectedEventId, setSelectedEventId] = useState<string>(
    preselectedEvent ? preselectedEvent.id : (events[0]?.id || '')
  );
  const [privacy, setPrivacy] = useState<'link' | 'public'>('link');

  const [createdRoom, setCreatedRoom] = useState<LiveMatchRoom | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const currentEvent = events.find(e => e.id === selectedEventId) || preselectedEvent || events[0];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEvent) return;
    const room = createCustomRoom(
      roomName.trim() || 'My Match Room',
      currentEvent,
      privacy === 'link' ? 'friends_with_link' : 'public'
    );
    setCreatedRoom(room);
  };

  const shareUrl = createdRoom
    ? generateRoomUrl(createdRoom)
    : '';

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    if (!createdRoom) return;
    navigator.clipboard?.writeText(createdRoom.roomCode).catch(() => {});
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleEnterRoom = () => {
    if (createdRoom) {
      joinCustomRoom(createdRoom);
      onClose();
      setCreatedRoom(null);
    }
  };

  const handleClose = () => {
    setCreatedRoom(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#15151c] border border-[#2d2d3d] rounded-lg shadow-2xl max-w-md w-full overflow-hidden text-zinc-200">
        {/* Header */}
        <div className="bg-[#1c1c25] px-4 py-3 border-b border-[#262635] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-[#1752bf]/30 flex items-center justify-center text-blue-400">
              <Users className="w-4 h-4 text-[#ffd000]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white leading-none">
                {createdRoom ? 'Room Created' : 'Create Live Match Room'}
              </h3>
              <span className="text-[11px] text-zinc-400">
                {createdRoom ? 'Share with friends to watch & discuss live' : 'Host a watch room anchored to a live match'}
              </span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-zinc-400 hover:text-white p-1 rounded hover:bg-[#252533] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {!createdRoom ? (
          <form onSubmit={handleCreate} className="p-4 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                Room Name
              </label>
              <input
                type="text"
                value={roomName}
                onChange={e => setRoomName(e.target.value)}
                placeholder="e.g. My Football Night"
                maxLength={40}
                required
                className="w-full bg-[#101015] border border-[#2d2d3d] focus:border-[#1752bf] rounded px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                Anchored Match
              </label>
              <select
                value={selectedEventId}
                onChange={e => setSelectedEventId(e.target.value)}
                className="w-full bg-[#101015] border border-[#2d2d3d] focus:border-[#1752bf] rounded px-3 py-2 text-xs text-white focus:outline-none"
              >
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {ev.tournament} — {ev.homeTeam} vs {ev.awayTeam} {ev.isLive ? `(LIVE ${ev.clock})` : ''}
                  </option>
                ))}
              </select>
              {currentEvent && (
                <div className="mt-1.5 px-2 py-1 bg-[#101015] rounded border border-[#20202b] text-[11px] text-zinc-400 flex items-center justify-between">
                  <span>Current: {currentEvent.homeTeam} vs {currentEvent.awayTeam}</span>
                  <span className="text-[#ffd000] font-mono font-bold">
                    {currentEvent.score ? `${currentEvent.score.home} - ${currentEvent.score.away}` : 'Upcoming'}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                Privacy
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPrivacy('link')}
                  className={
                    'px-3 py-2 rounded text-xs font-bold border flex items-center gap-2 justify-center transition ' +
                    (privacy === 'link'
                      ? 'bg-[#1752bf]/20 border-blue-400 text-white'
                      : 'bg-[#101015] border-[#2d2d3d] text-zinc-400 hover:text-white')
                  }
                >
                  <Lock className="w-3.5 h-3.5 text-[#ffd000]" />
                  Friends with link
                </button>
                <button
                  type="button"
                  onClick={() => setPrivacy('public')}
                  className={
                    'px-3 py-2 rounded text-xs font-bold border flex items-center gap-2 justify-center transition ' +
                    (privacy === 'public'
                      ? 'bg-[#1752bf]/20 border-blue-400 text-white'
                      : 'bg-[#101015] border-[#2d2d3d] text-zinc-400 hover:text-white')
                  }
                >
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  Public list
                </button>
              </div>
            </div>

            <div className="bg-[#101015] border border-[#20202b] p-2.5 rounded text-[11px] text-zinc-400 flex items-start gap-2">
              <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Responsible Fan Room:</strong> Designed for live score tracking, reaction polls, and match discussion. No betting pressure or urgency nudges.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#262635]">
              <button
                type="button"
                onClick={handleClose}
                className="px-3 py-2 rounded text-xs font-bold text-zinc-400 hover:text-white hover:bg-[#20202b] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#1752bf] hover:bg-blue-600 text-white rounded text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition shadow"
              >
                <PlusCircle className="w-3.5 h-3.5 text-[#ffd000]" />
                Create Room
              </button>
            </div>
          </form>
        ) : (
          <div className="p-4 flex flex-col gap-4">
            {/* Created Summary Card */}
            <div className="bg-[#101015] border border-blue-500/30 rounded-lg p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white">{createdRoom.roomName}</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 uppercase">
                  Ready to share
                </span>
              </div>
              <div className="text-xs text-zinc-400">
                Football • {currentEvent ? `${currentEvent.homeTeam} vs ${currentEvent.awayTeam}` : 'Anchored Match'}
              </div>
            </div>

            {/* Room Code Callout */}
            <div className="bg-[#1a1a24] border border-[#2e2e40] rounded-lg p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Room Code
                </span>
                <span className="font-mono text-xl font-black text-[#ffd000] tracking-widest">
                  {createdRoom.roomCode}
                </span>
              </div>
              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 rounded bg-[#252535] hover:bg-[#303045] border border-[#35354a] text-xs font-bold text-zinc-200 flex items-center gap-1.5 transition"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCode ? 'Copied' : 'Copy Code'}
              </button>
            </div>

            {/* Share Link */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Share Link
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-[#101015] border border-[#2d2d3d] rounded px-3 py-2 text-xs font-mono text-zinc-300 select-all focus:outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-2 rounded bg-[#1752bf] hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 transition shrink-0"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedLink ? 'Copied' : 'Copy Link'}
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-[#262635] flex justify-end gap-2">
              <button
                onClick={handleEnterRoom}
                className="w-full py-2.5 bg-[#1752bf] hover:bg-blue-600 text-white rounded text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg"
              >
                Enter Room
                <ArrowRight className="w-4 h-4 text-[#ffd000]" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({ isOpen, onClose }) => {
  const { joinRoomByCode, rooms } = useSession();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    const res = joinRoomByCode(code.trim());
    if (res.success) {
      setError(null);
      setCode('');
      onClose();
    } else {
      setError(res.error || 'Room not found. Check the room code and try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#15151c] border border-[#2d2d3d] rounded-lg shadow-2xl max-w-sm w-full overflow-hidden text-zinc-200">
        <div className="bg-[#1c1c25] px-4 py-3 border-b border-[#262635] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-[#1752bf]/30 flex items-center justify-center text-blue-400">
              <Users className="w-4 h-4 text-[#ffd000]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white leading-none">Join Live Room</h3>
              <span className="text-[11px] text-zinc-400">Enter a 6-character room code</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded hover:bg-[#252533] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleJoin} className="p-4 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
              Room Code
            </label>
            <input
              type="text"
              value={code}
              onChange={e => {
                setCode(e.target.value.toUpperCase());
                if (error) setError(null);
              }}
              placeholder="e.g. AB7KQ2"
              maxLength={10}
              autoFocus
              className="w-full bg-[#101015] border border-[#2d2d3d] focus:border-[#1752bf] rounded px-3 py-2 text-center text-lg font-mono font-black text-[#ffd000] tracking-widest placeholder-zinc-600 focus:outline-none uppercase"
            />
            {error && (
              <p className="text-xs text-[#d01111] font-semibold mt-1.5 bg-[#d01111]/10 p-2 rounded border border-[#d01111]/30">
                {error}
              </p>
            )}
          </div>

          {rooms.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Active Custom Rooms ({rooms.length})
              </span>
              <div className="max-h-28 overflow-y-auto flex flex-col gap-1">
                {rooms.map(r => (
                  <button
                    key={r.roomId}
                    type="button"
                    onClick={() => {
                      setCode(r.roomCode);
                      setError(null);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded bg-[#101015] hover:bg-[#1a1a24] border border-[#222230] text-xs flex justify-between items-center transition"
                  >
                    <span className="text-zinc-200 truncate">{r.roomName}</span>
                    <span className="font-mono text-[#ffd000] font-bold text-[11px]">{r.roomCode}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#262635]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded text-xs font-bold text-zinc-400 hover:text-white hover:bg-[#20202b] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!code.trim()}
              className="px-4 py-2 bg-[#1752bf] hover:bg-blue-600 disabled:opacity-50 text-white rounded text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition shadow"
            >
              Join Room
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
