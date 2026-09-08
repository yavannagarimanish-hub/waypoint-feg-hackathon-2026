import React from 'react';
import { useSession } from '../../context/SessionContext';
import { PlayCircle, ShieldAlert, X, ArrowRight, CheckCircle2, Bookmark } from 'lucide-react';

export const ContinuePlaying: React.FC = () => {
  const { sessionMemory, resumeSession, clearMemory } = useSession();

  if (!sessionMemory || !sessionMemory.resumable) {
    return null;
  }

  const {
    interrupted,
    lastFixture,
    lastSport,
    lastMarket,
    savedBetslip,
    hasProtectedAction,
    healthState,
  } = sessionMemory;

  const isInterrupted = Boolean(interrupted || hasProtectedAction || healthState === 'AT_RISK' || healthState === 'RECOVERING');
  const isRecovered = healthState === 'RECOVERED';

  return (
    <div
      className={`rounded border p-4 shadow-md transition-all duration-200 ${
        isInterrupted
          ? 'bg-[#18151f] border-[#d01111]/50 border-l-4 border-l-[#d01111]'
          : isRecovered
          ? 'bg-[#121926] border-[#1752bf]/50 border-l-4 border-l-[#1752bf]'
          : 'bg-[#15151c] border-[#2d2d3c] border-l-4 border-l-[#ffd000]'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded flex items-center justify-center shrink-0 mt-0.5 ${
              isInterrupted
                ? 'bg-[#d01111]/20 text-[#d01111]'
                : isRecovered
                ? 'bg-[#1752bf]/20 text-[#3b82f6]'
                : 'bg-[#ffd000]/10 text-[#ffd000]'
            }`}
          >
            {isInterrupted ? (
              <ShieldAlert className="w-5 h-5" />
            ) : isRecovered ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <Bookmark className="w-5 h-5" />
            )}
          </div>

          <div className="flex flex-col gap-0.5">
            {/* Headline and Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                  isInterrupted
                    ? 'bg-[#d01111] text-white'
                    : isRecovered
                    ? 'bg-[#1752bf] text-white'
                    : 'bg-[#ffd000] text-black'
                }`}
              >
                {isInterrupted
                  ? 'YOUR SESSION WAS INTERRUPTED'
                  : isRecovered
                  ? 'YOUR SESSION HAS RECOVERED'
                  : 'YOU LEFT THIS GAME'}
              </span>

              {lastSport && (
                <span className="text-[11px] font-semibold text-zinc-400">
                  {lastSport.name}
                </span>
              )}

              {lastFixture?.isLive && (
                <span className="text-[10px] font-black uppercase text-red-400 bg-red-950/40 border border-red-900/50 px-1.5 py-0.2 rounded">
                  Live
                </span>
              )}
            </div>

            {/* Match Name / Fixture Headline */}
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5">
              {lastFixture ? lastFixture.name : 'Your Ongoing Match'}
            </h2>

            {/* Subheadline and Context */}
            <div className="text-xs text-zinc-300 mt-0.5 flex flex-col gap-1">
              {isInterrupted ? (
                <p className="text-zinc-300">
                  Your previous action was protected while connection state was uncertain.
                </p>
              ) : isRecovered ? (
                <p className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Outcome Reconciled. Session state restored safely.
                </p>
              ) : (
                <p className="text-zinc-400">
                  Continue where you left off.
                </p>
              )}

              {/* Context details: viewing market, saved selections, protected state */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                {lastMarket && (
                  <span className="text-zinc-300">
                    You were viewing: <strong className="text-white font-semibold">{lastMarket.name}</strong>
                  </span>
                )}
                {savedBetslip && savedBetslip.length > 0 && (
                  <span className="text-zinc-400">
                    • <strong className="text-blue-400 font-semibold">{savedBetslip.length}</strong> saved selection{savedBetslip.length > 1 ? 's' : ''} preserved safely
                  </span>
                )}
                {hasProtectedAction && (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                    • Action Protected
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={resumeSession}
            className={`px-4 py-2 rounded text-xs font-bold shadow flex items-center gap-1.5 transition ${
              isInterrupted
                ? 'bg-[#d01111] hover:bg-[#b00e0e] text-white shadow-red-950/40'
                : 'bg-[#1752bf] hover:bg-[#1447a6] text-white shadow-blue-950/40'
            }`}
          >
            <PlayCircle className="w-4 h-4" />
            <span>
              {isInterrupted
                ? 'Resume Safely'
                : isRecovered
                ? 'Continue Session'
                : 'Continue Playing'}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={clearMemory}
            title="Dismiss memory"
            className="p-2 rounded bg-[#1e1e28] hover:bg-[#282836] text-zinc-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
