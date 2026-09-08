import React from 'react';
import { useSession } from '../../context/SessionContext';
import {
  Activity,
  ShieldCheck,
  Wifi,
  WifiOff,
  AlertTriangle,
  Flame,
  Users,
  Compass,
  Zap,
  RotateCcw,
  Plus,
  LogIn,
  User,
} from 'lucide-react';

interface CommandBarProps {
  onOpenCreateRoom?: () => void;
  onOpenJoinRoom?: () => void;
  onOpenProfile?: () => void;
  onOpenLogin?: () => void;
}

export const CommandBar: React.FC<CommandBarProps> = ({
  onOpenCreateRoom,
  onOpenJoinRoom,
  onOpenProfile,
  onOpenLogin,
}) => {
  const {
    state,
    user,
    riskAssessment,
    betslip,
    setBetslipOpen,
    navigateToScreen,
    triggerChaosNetworkLoss,
    triggerChaosOddsDrift,
    triggerChaosLatencySpike,
    resetSession,
  } = useSession();

  return (
    <header className="h-12 bg-[#1752bf] px-3 md:px-4 flex items-center justify-between sticky top-0 z-50 select-none shadow-md text-white">
      {/* Brand & Context Switcher */}
      <div className="flex items-center gap-4 lg:gap-6">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigateToScreen('home')}
        >
          <img
            src="/psk-logo.svg"
            alt="PSK"
            className="h-7 w-[100px] object-contain shrink-0"
            onError={(e) => {
              // Fallback if svg fails
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
          <span className="hidden sm:inline-block font-black text-xs uppercase tracking-wider bg-[#1447a6] px-1.5 py-0.5 rounded text-blue-200">
            Waypoint
          </span>
        </div>

        {/* View Switcher Navigation matching PSK product tabs */}
        <nav className="hidden md:flex items-center gap-0.5 text-xs font-bold uppercase tracking-wide">
          <button
            onClick={() => navigateToScreen('home')}
            className={
              'px-3 py-2 rounded transition ' +
              (state.currentScreen === 'home' || state.currentScreen === 'sports'
                ? 'bg-[#1447a6] text-white shadow-inner'
                : 'text-blue-100 hover:bg-[#1447a6]/60 hover:text-white')
            }
          >
            Sport
          </button>
          <button
            onClick={() => navigateToScreen('room')}
            className={
              'px-3 py-2 rounded flex items-center gap-1.5 transition ' +
              (state.currentScreen === 'room'
                ? 'bg-[#1447a6] text-white shadow-inner'
                : 'text-blue-100 hover:bg-[#1447a6]/60 hover:text-white')
            }
          >
            <Users className="w-3.5 h-3.5 text-blue-200" />
            Live Rooms
            {state.socialRoomContext.activeUsersCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </button>
          {onOpenCreateRoom && (
            <button
              onClick={onOpenCreateRoom}
              className="px-2.5 py-1 rounded bg-[#103a8a] hover:bg-[#0d2f70] text-amber-300 hover:text-amber-200 text-xs font-bold flex items-center gap-1 transition border border-blue-400/30"
              title="Create your own Live Match Room"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Room</span>
            </button>
          )}
          {onOpenJoinRoom && (
            <button
              onClick={onOpenJoinRoom}
              className="px-2.5 py-1 rounded bg-[#103a8a] hover:bg-[#0d2f70] text-blue-200 hover:text-white text-xs font-bold flex items-center gap-1 transition border border-blue-400/30"
              title="Join a room with code"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Join Room</span>
            </button>
          )}
        </nav>
      </div>

      {/* SESSION GPS & Chaos Controls */}
      <div className="flex items-center gap-3">
        {/* Session GPS Breadcrumb */}
        <div className="hidden xl:flex items-center gap-2 bg-[#1447a6] border border-blue-400/30 px-3 py-1 rounded text-xs shadow-inner">
          <Compass className="w-3.5 h-3.5 text-blue-200" />
          <span className="text-blue-300 font-semibold">GPS:</span>
          <span className="text-white font-medium">{state.currentSport?.name || 'Sport'}</span>
          <span className="text-blue-300">→</span>
          <span className="text-blue-100 font-medium truncate max-w-[130px]">
            {state.currentEvent?.name || 'All'}
          </span>
          <span className="text-blue-400">|</span>
          <span className="text-blue-300">Stage:</span>
          <span className="text-white font-bold">{state.journeyStage}</span>
          <span className="text-blue-400">|</span>
          <span
            className={
              'font-bold flex items-center gap-1 ' +
              (state.healthState === 'HEALTHY'
                ? 'text-emerald-300'
                : state.healthState === 'FRICTION'
                ? 'text-amber-300'
                : 'text-rose-200')
            }
          >
            {state.healthState === 'HEALTHY' ? (
              <ShieldCheck className="w-3.5 h-3.5" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 animate-bounce" />
            )}
            {state.healthState}
          </span>
        </div>

        {/* Chaos Injection Controls */}
        <div className="flex items-center gap-1 bg-[#1447a6]/90 p-1 rounded border border-blue-400/30 text-white">
          <span className="text-[10px] text-blue-200 font-bold px-1 hidden sm:flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-300" /> CHAOS:
          </span>
          <button
            onClick={() => triggerChaosNetworkLoss()}
            title="Simulate connection drop while active"
            className={
              'px-2 py-0.5 rounded text-[11px] font-mono transition flex items-center gap-1 font-bold ' +
              (state.recoveryState.isRecovering
                ? 'bg-red-600 text-white shadow'
                : 'bg-[#1752bf] text-blue-100 hover:bg-white hover:text-[#1752bf]')
            }
          >
            {state.recoveryState.isRecovering ? (
              <WifiOff className="w-3 h-3 animate-pulse" />
            ) : (
              <Wifi className="w-3 h-3" />
            )}
            Cut Net
          </button>
          <button
            onClick={triggerChaosOddsDrift}
            title="Simulate real-time odds fluctuation"
            className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#1752bf] text-blue-100 hover:bg-white hover:text-[#1752bf] transition flex items-center gap-1 font-bold"
          >
            <Flame className="w-3 h-3 text-amber-300" />
            Drift
          </button>
          <button
            onClick={triggerChaosLatencySpike}
            title="Simulate 2800ms API lag spike"
            className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#1752bf] text-blue-100 hover:bg-white hover:text-[#1752bf] transition font-bold"
          >
            Lag
          </button>
          <button
            onClick={resetSession}
            title="Reset to clean baseline starting state for judging"
            className="px-2 py-0.5 rounded text-[11px] font-mono bg-amber-400 text-slate-950 hover:bg-amber-300 transition flex items-center gap-1 font-black ml-1 shadow"
          >
            <RotateCcw className="w-3 h-3 text-slate-950" />
            Reset Demo
          </button>
        </div>

        {/* User Identity / Profile Button */}
        {user ? (
          <button
            onClick={onOpenProfile}
            title="View Profile, Streak & Achievements"
            className="flex items-center gap-1.5 bg-[#1447a6] hover:bg-[#113a88] border border-blue-400/40 px-2 py-1 rounded text-xs transition"
          >
            <span className="w-5 h-5 rounded-full bg-[#1e1e2d] border border-[#ffd000] flex items-center justify-center text-xs overflow-hidden">
              {user.avatar.startsWith('data:') || user.avatar.startsWith('/') ? (
                <img src={user.avatar} alt={user.displayName} className="w-full h-full object-cover" />
              ) : (
                user.avatar
              )}
            </span>
            <span className="font-bold text-white text-xs max-w-[80px] truncate hidden lg:inline">
              {user.displayName}
            </span>
            <span className="text-[10px] font-bold text-[#ffd000] bg-amber-950/60 px-1 rounded flex items-center">
              🔥 {user.loginStreak.currentStreak}d
            </span>
          </button>
        ) : (
          <button
            onClick={onOpenLogin}
            title="Sign in or create prototype account"
            className="flex items-center gap-1 bg-[#1447a6] hover:bg-[#113a88] border border-blue-400/40 px-2.5 py-1 rounded text-xs font-bold text-blue-100 hover:text-white transition"
          >
            <User className="w-3.5 h-3.5 text-[#ffd000]" />
            <span>Sign In</span>
          </button>
        )}

        {/* Betslip Toggle Button (especially for mobile) */}
        <button
          onClick={() => setBetslipOpen(true)}
          className="relative px-3 py-1.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow transition"
        >
          <span className="uppercase tracking-wider">Betslip</span>
          {betslip.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center">
              {betslip.length}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
