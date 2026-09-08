import React, { useState } from 'react';
import { useSession } from '../../context/SessionContext';
import { SportsEvent } from '../../types/canonical';
import { RoomParticipant } from '../../types/social';
import { ParticipantCardModal } from './UserModals';
import {
  Send,
  Users,
  HelpCircle,
  Share2,
  Copy,
  Check,
  Tag,
  Trophy,
  MessageSquare,
  Sparkles,
  Shield,
  Crown,
  Flame,
} from 'lucide-react';
import { generateRoomUrl } from '../../services/roomDeepLink';

interface ChatMessage {
  id: string;
  user: string;
  time: string;
  text: string;
  badge?: string;
  avatar?: string;
}

export const LiveRoom: React.FC<{ event: SportsEvent; onBack: () => void }> = ({
  event,
  onBack,
}) => {
  const {
    emitEvent,
    toggleSelection,
    betslip,
    activeCustomRoom,
    user,
    roomParticipants,
    roomLeaderboard,
    roomPredictions,
    makePrediction,
    resolvePrediction,
  } = useSession();

  const [activeTab, setActiveTab] = useState<'chat' | 'leaderboard' | 'predictions'>('chat');
  const [selectedParticipant, setSelectedParticipant] = useState<RoomParticipant | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      user: 'Rahul Sharma',
      avatar: '👑',
      time: '71m',
      text: 'What a counter attack! England midfield needs more structure.',
      badge: 'Rank #1',
    },
    {
      id: '2',
      user: 'Manish Kumar',
      avatar: '⚽',
      time: '73m',
      text: 'Croatia pushing hard on the right flank now.',
      badge: 'Bettor',
    },
  ]);

  const [inputVal, setInputVal] = useState<string>('');
  const [pollVoted, setPollVoted] = useState<string | null>(null);
  const [pollVotes, setPollVotes] = useState({ yes: 64, no: 36 });
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const newMsg: ChatMessage = {
      id: Math.random().toString(),
      user: user?.displayName || 'You',
      avatar: user?.avatar || '🦁',
      time: event.clock || '74m',
      text: inputVal,
      badge: user ? `Streak ${user.loginStreak.currentStreak}d` : undefined,
    };
    setMessages(prev => [...prev, newMsg]);
    emitEvent('ROOM_MESSAGE_SENT', { roomId: event.id, length: inputVal.length });
    setInputVal('');
  };

  const handleReaction = (emoji: string) => {
    emitEvent('ROOM_REACTION', { roomId: event.id, emoji });
  };

  const handleVotePoll = (option: 'yes' | 'no') => {
    if (pollVoted) return;
    setPollVoted(option);
    setPollVotes(prev => ({
      ...prev,
      [option]: prev[option] + 1,
    }));
    emitEvent('ROOM_POLL', { roomId: event.id, pollId: 'p1', option });
  };

  const roomCode = activeCustomRoom?.roomCode;
  const shareLink = activeCustomRoom
    ? generateRoomUrl(activeCustomRoom)
    : (roomCode ? `${window.location.origin}/#/room/${roomCode}` : '');

  const handleCopyCode = () => {
    if (!roomCode) return;
    navigator.clipboard?.writeText(roomCode).catch(() => {});
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!shareLink) return;
    navigator.clipboard?.writeText(shareLink).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const participantCount = activeCustomRoom
    ? activeCustomRoom.participantCount
    : (event.activeRoomParticipants || 150);

  const hostName = activeCustomRoom ? 'You' : 'Rahul Sharma';

  return (
    <div className="bg-[#15151c] border border-[#242430] rounded overflow-hidden shadow flex flex-col h-[680px]">
      {/* Top Header */}
      <div className="border-b border-[#242430] px-4 py-2.5 flex items-center justify-between bg-[#1c1c25]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-xs text-zinc-300 hover:text-white bg-[#242430] px-2.5 py-1 rounded transition font-bold"
          >
            ← Back
          </button>
          <div>
            <div className="flex items-center gap-2">
              {activeCustomRoom && (
                <span className="bg-[#1752bf] text-white text-[10px] font-black uppercase px-1.5 py-0.5 rounded">
                  {activeCustomRoom.roomName}
                </span>
              )}
              <div className="flex items-center gap-1.5 font-bold text-sm text-white">
                <img
                  src="/assets/sports/team_home.png"
                  alt=""
                  className="w-3.5 h-3.5 object-contain shrink-0"
                  onError={e => (e.currentTarget.style.display = 'none')}
                />
                <span>{event.homeTeam}</span>
                <span className="text-zinc-500 font-normal">vs</span>
                <img
                  src="/assets/sports/team_away.png"
                  alt=""
                  className="w-3.5 h-3.5 object-contain shrink-0"
                  onError={e => (e.currentTarget.style.display = 'none')}
                />
                <span>{event.awayTeam}</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-[#d01111] animate-ping" />
            </div>
            <div className="text-[11px] text-zinc-400 flex items-center gap-2">
              <span>Score: {event.score?.home ?? 0} - {event.score?.away ?? 0}</span>
              <span>•</span>
              <span className="text-[#d01111] font-bold uppercase">{event.clock}</span>
              <span>•</span>
              <span className="text-zinc-500">Host: {hostName}</span>
              {activeCustomRoom && (
                <>
                  <span>•</span>
                  <span className="text-zinc-500 font-mono">Code: {activeCustomRoom.roomCode}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {activeCustomRoom ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopyCode}
                title="Copy Room Code"
                className="hidden sm:flex items-center gap-1 text-[11px] font-mono font-bold text-[#ffd000] bg-[#252535] hover:bg-[#303045] border border-[#35354a] px-2 py-1 rounded transition"
              >
                {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Tag className="w-3 h-3 text-[#ffd000]" />}
                <span>{activeCustomRoom.roomCode}</span>
              </button>
              <button
                onClick={handleCopyLink}
                title="Copy Share Link"
                className="flex items-center gap-1 text-[11px] font-bold text-white bg-[#1752bf] hover:bg-blue-600 px-2 py-1 rounded transition shadow"
              >
                {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Share2 className="w-3 h-3" />}
                <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'Share'}</span>
              </button>
            </div>
          ) : null}

          <div className="flex items-center gap-1.5 text-xs text-white bg-[#1447a6] px-2.5 py-1 rounded font-bold border border-blue-400/20">
            <Users className="w-3.5 h-3.5 text-blue-200" />
            <span>{participantCount} online</span>
            <span className="text-[10px] text-blue-300 font-normal hidden sm:inline">(simulated)</span>
          </div>
        </div>
      </div>

      {/* Share / Host Sub-Banner */}
      {activeCustomRoom && (
        <div className="bg-[#121218] border-b border-[#242430] px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Share with friends:</span>
            <span className="font-mono font-black text-[#ffd000] bg-[#1d1d28] border border-[#2d2d3f] px-2 py-0.5 rounded text-xs tracking-wider">
              {activeCustomRoom.roomCode}
            </span>
            <button
              onClick={handleCopyCode}
              className="text-zinc-400 hover:text-white flex items-center gap-1 text-[11px] underline ml-1"
            >
              <Copy className="w-3 h-3" />
              {copiedCode ? 'Code copied!' : 'Copy Code'}
            </button>
            <span className="text-[10px] text-zinc-500 font-mono hidden md:inline">• Live room interaction prototype</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[11px] underline"
            >
              <Share2 className="w-3 h-3" />
              {copiedLink ? 'Link copied to clipboard!' : 'Copy Share Link'}
            </button>
          </div>
        </div>
      )}

      {/* Main Room Body */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Column: Match Context, Momentum, Quick Markets, Participants Preview */}
        <div className="w-full md:w-5/12 border-b md:border-b-0 md:border-r border-[#242430] p-4 flex flex-col gap-4 bg-[#101015] overflow-y-auto">
          {/* Match Momentum */}
          <div className="bg-[#181822] border border-[#242430] rounded p-3">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
              Match Momentum
            </span>
            <div className="flex justify-between items-center text-xs font-bold text-zinc-200 mb-1">
              <span>{event.homeTeam}</span>
              <span>{event.awayTeam}</span>
            </div>
            <div className="h-2 rounded bg-zinc-800 overflow-hidden flex">
              <div className="bg-[#1752bf] h-full w-[62%]" />
              <div className="bg-[#ffd000] h-full w-[38%]" />
            </div>
            <div className="flex justify-between text-[10px] text-zinc-400 mt-1 font-mono">
              <span>62% Attacks</span>
              <span>38% Attacks</span>
            </div>
          </div>

          {/* Active Participants Strip */}
          <div className="bg-[#181822] border border-[#242430] rounded p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                Participants ({roomParticipants.length})
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">Tap for profile</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {roomParticipants.map(p => (
                <button
                  key={p.userId}
                  onClick={() => setSelectedParticipant(p)}
                  className="bg-[#121218] hover:bg-[#1a1a24] border border-[#232333] hover:border-blue-500/40 p-2 rounded flex items-center gap-2 text-left transition"
                >
                  <div className="w-7 h-7 rounded-full bg-[#1e1e2c] flex items-center justify-center text-sm shrink-0 border border-zinc-700 overflow-hidden">
                    {p.avatar.startsWith('data:') || p.avatar.startsWith('/') ? (
                      <img src={p.avatar} alt={p.displayName} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      p.avatar
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <span className="text-xs font-bold text-white truncate block">
                      {p.displayName}
                    </span>
                    <span className="text-[10px] text-[#ffd000] font-mono">
                      #{p.rank} • {p.score} pts
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Fan Predictor Poll */}
          <div className="bg-[#181822] border border-[#242430] border-l-4 border-l-[#1752bf] rounded p-3 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-blue-400 text-xs font-bold uppercase tracking-wider">
              <HelpCircle className="w-3.5 h-3.5 text-[#ffd000]" />
              Fan Predictor Poll
            </div>
            <p className="text-xs text-zinc-200 font-semibold">
              Will another goal be scored in this match before the 85th minute?
            </p>
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => handleVotePoll('yes')}
                className={'flex-1 py-1.5 rounded text-xs font-bold border transition ' + (pollVoted === 'yes' ? 'bg-[#1752bf] border-blue-400 text-white' : 'bg-[#20202a] border-[#2c2c3b] text-zinc-300 hover:bg-[#282836]')}
              >
                Yes ({pollVotes.yes}%)
              </button>
              <button
                onClick={() => handleVotePoll('no')}
                className={'flex-1 py-1.5 rounded text-xs font-bold border transition ' + (pollVoted === 'no' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-[#242433] border-[#343447] text-zinc-300 hover:bg-[#2c2c3e]')}
              >
                No ({pollVotes.no}%)
              </button>
            </div>
          </div>

          {/* Quick In-Play Markets */}
          <div className="flex flex-col gap-1.5 mt-auto">
            <span className="text-xs font-semibold text-zinc-400">Quick In-Play Markets:</span>
            {event.markets[0]?.selections.map(sel => (
              <button
                key={sel.id}
                onClick={() => toggleSelection(event, event.markets[0].id, sel.id)}
                className={'p-2 rounded-lg border text-xs flex justify-between items-center transition ' + (betslip.some(i => i.selectionId === sel.id) ? 'bg-blue-600 border-blue-400 text-white font-bold' : 'bg-[#1c1c27] border-[#29293a] text-zinc-300 hover:bg-[#242433]')}
              >
                <span>{sel.name}</span>
                <span className="font-mono font-bold text-amber-400">{sel.odds.toFixed(2)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Tabbed View (Chat vs. Room Leaderboard vs. Predictions) */}
        <div className="flex-1 flex flex-col bg-[#14141a]">
          {/* Tab Navigation */}
          <div className="bg-[#181822] border-b border-[#242430] px-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setActiveTab('chat');
                  emitEvent('SCREEN_VIEWED', { screen: 'room_chat' });
                }}
                className={
                  'px-3 py-2 font-bold flex items-center gap-1.5 border-b-2 transition ' +
                  (activeTab === 'chat'
                    ? 'text-white border-[#1752bf]'
                    : 'text-zinc-400 border-transparent hover:text-white')
                }
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Live Chat
              </button>
              <button
                onClick={() => {
                  setActiveTab('leaderboard');
                  emitEvent('ROOM_LEADERBOARD_VIEWED', { roomId: event.id });
                }}
                className={
                  'px-3 py-2 font-bold flex items-center gap-1.5 border-b-2 transition ' +
                  (activeTab === 'leaderboard'
                    ? 'text-white border-[#ffd000]'
                    : 'text-zinc-400 border-transparent hover:text-white')
                }
              >
                <Trophy className="w-3.5 h-3.5 text-[#ffd000]" />
                Room Leaderboard
              </button>
              <button
                onClick={() => {
                  setActiveTab('predictions');
                  emitEvent('SCREEN_VIEWED', { screen: 'room_predictions' });
                }}
                className={
                  'px-3 py-2 font-bold flex items-center gap-1.5 border-b-2 transition ' +
                  (activeTab === 'predictions'
                    ? 'text-white border-blue-400'
                    : 'text-zinc-400 border-transparent hover:text-white')
                }
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                Match Predictions
              </button>
            </div>
            <div className="text-[11px] text-zinc-500 font-mono hidden sm:block">
              {user ? `@${user.username}` : 'Guest'}
            </div>
          </div>

          {/* TAB 1: LIVE CHAT */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
                {messages.map(msg => (
                  <div key={msg.id} className="flex flex-col text-xs">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm">{msg.avatar || '👤'}</span>
                      <span className="font-bold text-zinc-300">{msg.user}</span>
                      {msg.badge && (
                        <span className="px-1.5 py-0.2 rounded bg-blue-900/50 text-blue-300 text-[10px] font-semibold">
                          {msg.badge}
                        </span>
                      )}
                      <span className="text-zinc-600 font-mono text-[10px]">{msg.time}</span>
                    </div>
                    <p className="text-zinc-300 bg-[#1c1c26] p-2.5 rounded-lg border border-[#262635] w-fit max-w-[85%]">
                      {msg.text}
                    </p>
                  </div>
                ))}
              </div>

              <div className="px-4 py-2 border-t border-[#222230] flex items-center gap-2 bg-[#171720]">
                <span className="text-[11px] text-zinc-500 font-medium">Reactions:</span>
                {['🔥', '⚽', '👏', '😱', '🛡️'].map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className="w-7 h-7 rounded-full bg-[#20202c] hover:bg-[#2c2c3e] flex items-center justify-center text-sm transition transform active:scale-125"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSendMessage} className="p-3 border-t border-[#222230] flex gap-2 bg-[#191922]">
                <input
                  type="text"
                  placeholder="Share match thoughts with room members..."
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  className="flex-1 bg-[#121217] border border-[#2a2a3a] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition shadow"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: ROOM LEADERBOARD */}
          {activeTab === 'leaderboard' && (
            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
              <div className="bg-[#181822] border border-[#252535] p-3 rounded-lg flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-[#ffd000]" />
                    {activeCustomRoom ? activeCustomRoom.roomName : `${event.homeTeam} vs ${event.awayTeam}`} Leaderboard
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Ranked by match knowledge: +10 pts for correct predictions, +1 pt for participation.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded font-bold uppercase">
                    Non-Monetary
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Prototype participant data
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                {roomLeaderboard.map(entry => (
                  <div
                    key={entry.userId}
                    onClick={() => {
                      const matched = roomParticipants.find(p => p.userId === entry.userId);
                      if (matched) setSelectedParticipant(matched);
                    }}
                    className={
                      'p-3 rounded-lg border flex items-center justify-between transition cursor-pointer ' +
                      (entry.isCurrentUser
                        ? 'bg-[#1a233a] border-blue-500/50 shadow'
                        : 'bg-[#121218] border-[#222230] hover:bg-[#181824]')
                    }
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={
                          'w-6 text-center font-mono font-black text-sm ' +
                          (entry.rank === 1
                            ? 'text-[#ffd000]'
                            : entry.rank === 2
                            ? 'text-zinc-300'
                            : entry.rank === 3
                            ? 'text-amber-600'
                            : 'text-zinc-500')
                        }
                      >
                        {entry.rank === 1 ? '👑' : `#${entry.rank}`}
                      </span>

                      <div className="w-8 h-8 rounded-full bg-[#1c1c27] border border-zinc-700 flex items-center justify-center text-base overflow-hidden">
                        {entry.avatar.startsWith('data:') || entry.avatar.startsWith('/') ? (
                          <img src={entry.avatar} alt={entry.displayName} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          entry.avatar
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">
                            {entry.displayName}
                          </span>
                          {entry.isCurrentUser && (
                            <span className="px-1.5 py-0.2 rounded bg-blue-600 text-white text-[9px] font-bold uppercase">
                              You
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          @{entry.username} • {entry.correctPredictions}/{entry.totalPredictions} correct ({entry.accuracy}%)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {entry.topBadge && (
                        <span className="hidden sm:inline text-[10px] text-zinc-400 bg-[#1a1a24] px-2 py-0.5 rounded border border-[#2b2b3d]">
                          {entry.topBadge}
                        </span>
                      )}
                      <div className="text-right">
                        <span className="font-mono text-sm font-black text-[#ffd000] block">
                          {entry.score} pts
                        </span>
                        <span className="text-[10px] text-zinc-500">Score</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-[#101015] border border-[#20202b] p-2.5 rounded text-[11px] text-zinc-400 flex items-start gap-2 mt-auto">
                <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Integrity Rule:</strong> Leaderboard scores are derived strictly from match prediction accuracy and participation. Amount wagered or losses never influence room ranks.
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: MATCH PREDICTIONS */}
          {activeTab === 'predictions' && (
            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
              <div className="bg-[#181822] border border-[#252535] p-3 rounded-lg flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    Social Match Predictions
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Predict match events for non-monetary leaderboard points (+10 pts correct).
                  </p>
                </div>
                <span className="text-[10px] text-[#ffd000] bg-amber-950/60 border border-amber-500/30 px-2 py-1 rounded font-bold uppercase">
                  Free to Play
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {roomPredictions.map(pred => {
                  const userVote = user ? pred.userVotes?.[user.id] : undefined;
                  const isResolved = pred.status === 'RESOLVED';

                  return (
                    <div
                      key={pred.id}
                      className="bg-[#121218] border border-[#222230] p-4 rounded-lg flex flex-col gap-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{pred.question}</span>
                        <span
                          className={
                            'text-[10px] font-bold px-2 py-0.5 rounded uppercase ' +
                            (isResolved
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                              : 'bg-blue-950 text-blue-300 border border-blue-500/40')
                          }
                        >
                          {pred.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {pred.options.map(opt => {
                          const isSelected = userVote === opt.id;
                          const isCorrect = pred.correctOptionId === opt.id;

                          return (
                            <button
                              key={opt.id}
                              disabled={isResolved}
                              onClick={() => makePrediction(pred.id, opt.id)}
                              className={
                                'p-2.5 rounded text-xs font-bold border transition text-left flex flex-col gap-1 ' +
                                (isCorrect
                                  ? 'bg-emerald-900/40 border-emerald-500 text-emerald-200'
                                  : isSelected
                                  ? 'bg-[#1752bf] border-blue-400 text-white shadow'
                                  : 'bg-[#181822] border-[#29293a] text-zinc-300 hover:bg-[#20202c]')
                              }
                            >
                              <div className="flex items-center justify-between">
                                <span>{opt.text}</span>
                                {isSelected && <Check className="w-3.5 h-3.5" />}
                              </div>
                              {isCorrect && (
                                <span className="text-[10px] text-emerald-400 font-mono">
                                  ✓ Correct (+10 pts)
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Host/Demo Resolution Trigger */}
                      {!isResolved && (
                        <div className="pt-2 border-t border-[#20202b] flex items-center justify-between">
                          <span className="text-[10px] text-zinc-500">
                            {userVote ? 'Your prediction is locked' : 'Select an option to participate'}
                          </span>
                          <button
                            onClick={() => resolvePrediction(pred.id, 'opt-away')}
                            className="px-2.5 py-1 rounded bg-[#20202d] hover:bg-[#2c2c3d] text-[10px] font-bold text-amber-300 border border-[#35354d] transition"
                          >
                            Resolve as Croatia (Demo)
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Participant Profile Modal */}
      <ParticipantCardModal
        participant={selectedParticipant}
        onClose={() => setSelectedParticipant(null)}
      />
    </div>
  );
};
