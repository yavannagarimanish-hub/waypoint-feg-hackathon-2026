import React, { useState } from 'react';
import { useSession } from '../../context/SessionContext';
import {
  X,
  Trash2,
  ShieldCheck,
  AlertCircle,
  WifiOff,
  Sparkles,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export const BetslipTray: React.FC<{ isDesktopMode?: boolean }> = ({ isDesktopMode = false }) => {
  const {
    betslip,
    isBetslipOpen,
    setBetslipOpen,
    removeSelection,
    clearBetslip,
    submitBet,
    state,
    dismissRecoveryLifeboat,
    receipts,
  } = useSession();

  const [stake, setStake] = useState<number>(10);

  if (!isDesktopMode && !isBetslipOpen) return null;

  const totalOdds = betslip.reduce((acc, curr) => acc * curr.odds, 1);
  const tax = +(stake * 0.05).toFixed(2);
  const bonus = betslip.length > 2 ? +(stake * 0.1).toFixed(2) : 0;
  const potentialReturn = betslip.length > 0 ? +((stake - tax) * totalOdds + bonus).toFixed(2) : 0;

  const handlePlaceBet = async () => {
    await submitBet(stake);
  };

  const containerClasses = isDesktopMode
    ? 'w-full bg-[#15151c] border border-[#242430] rounded flex flex-col shadow overflow-hidden'
    : 'fixed inset-y-0 right-0 w-full sm:w-[360px] bg-[#15151c] border-l border-[#242430] z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200';

  return (
    <div className={containerClasses}>
      {/* Header matching PSK ticket arena */}
      <div className="h-10 border-b border-[#242430] px-3 flex items-center justify-between bg-[#1c1c25]">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs uppercase tracking-wider text-white">Betslip</span>
          <span className="px-1.5 py-0.2 rounded bg-[#1752bf] text-white font-mono text-[11px] font-bold">
            {betslip.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {betslip.length > 0 && (
            <button
              onClick={clearBetslip}
              className="text-zinc-400 hover:text-red-400 p-1 rounded transition text-xs flex items-center gap-1"
              title="Clear All"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {!isDesktopMode && (
            <button
              onClick={() => setBetslipOpen(false)}
              className="text-zinc-400 hover:text-white p-1 rounded transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Selections Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {/* SESSION LIFEBOAT RECOVERY BANNER */}
        {state.recoveryState.isRecovering && (
          <div className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-500/50 text-xs text-amber-200 flex flex-col gap-2 shadow-xl animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>CONNECTION INTERRUPTED</span>
            </div>
            <p className="text-zinc-300 text-[11px] leading-relaxed">
              We're checking the status of your previous action.
            </p>
            <div className="space-y-1 text-[11px] text-zinc-400 font-mono bg-[#16161f] p-2 rounded border border-[#2b2b3b]">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Your session is protected
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400">
                <Lock className="w-3.5 h-3.5" />
                We won't create a duplicate action
              </div>
            </div>
            <button
              onClick={dismissRecoveryLifeboat}
              className="mt-1 py-1 px-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-[11px] font-semibold transition self-end"
            >
              Check Status
            </button>
          </div>
        )}

        {/* RECENT RECOVERED RECEIPT NOTICE */}
        {receipts.length > 0 && !state.pendingAction.inFlight && (
          <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-200 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-emerald-300">Action Confirmed</span>
              Ticket {receipts[0].ticketId} confirmed safely with zero duplicate charges.
            </div>
          </div>
        )}

        {betslip.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-zinc-500 gap-3">
            <div className="w-12 h-12 rounded-full bg-[#1e1e28] flex items-center justify-center text-zinc-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-400">Your ticket is empty</p>
              <p className="text-xs text-zinc-600 mt-1">
                Select any odds button to add a pick with zero friction.
              </p>
            </div>
          </div>
        ) : (
          betslip.map(item => (
            <div
              key={item.selectionId}
              className="bg-[#1c1c24] border border-[#272735] rounded p-2.5 flex flex-col gap-1 relative group"
            >
              <button
                onClick={() => removeSelection(item.selectionId)}
                className="absolute top-2 right-2 text-zinc-500 hover:text-[#d01111] transition p-1"
                title="Remove"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <span className="text-[11px] text-zinc-400 font-medium truncate pr-5">
                {item.eventName}
              </span>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{item.selectionName}</span>
                <span className="font-mono font-black text-sm text-[#ffd000]">
                  {item.odds.toFixed(2)}
                </span>
              </div>
              <span className="text-[10px] text-zinc-500">{item.marketName}</span>

              {item.driftWarning && (
                <div className="flex items-center gap-1 text-[11px] text-[#ffd000] bg-amber-950/30 px-2 py-0.5 rounded mt-1 border border-amber-800/30 font-mono">
                  <AlertCircle className="w-3 h-3" />
                  Odds updated: {item.previousOdds?.toFixed(2)} → {item.odds.toFixed(2)}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Stake & Submission Area */}
      {betslip.length > 0 && (
        <div className="border-t border-[#242430] p-3 bg-[#181822] flex flex-col gap-2.5">
          <div>
            <div className="flex justify-between text-xs text-zinc-400 mb-1">
              <span className="font-semibold">Stake (EUR)</span>
              <span className="font-mono text-zinc-200 font-bold">€{stake}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[5, 10, 20, 50].map(val => (
                <button
                  key={val}
                  onClick={() => setStake(val)}
                  className={
                    'py-1 rounded text-xs font-bold font-mono border transition ' +
                    (stake === val
                      ? 'bg-[#1752bf] border-blue-400 text-white'
                      : 'bg-[#20202a] border-[#2c2c3b] text-zinc-300 hover:bg-[#282836]')
                  }
                >
                  €{val}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1 text-xs text-zinc-400 pt-2 border-t border-[#232330]">
            <div className="flex justify-between">
              <span>Total Odds:</span>
              <span className="font-mono text-white font-bold">{totalOdds.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (5%):</span>
              <span className="font-mono text-zinc-400">-€{tax}</span>
            </div>
            {bonus > 0 && (
              <div className="flex justify-between text-emerald-400 font-semibold">
                <span>Bonus (+10%):</span>
                <span className="font-mono">+€{bonus}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-white pt-1 border-t border-[#252533]">
              <span>Potential Return:</span>
              <span className="font-mono text-[#ffd000] font-black">€{potentialReturn}</span>
            </div>
          </div>

          {/* Action Shield Place Bet Button */}
          <button
            onClick={handlePlaceBet}
            disabled={state.pendingAction.inFlight || betslip.length === 0}
            className={
              'w-full py-2.5 rounded font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow transition ' +
              (state.recoveryState.isRecovering
                ? 'bg-[#d01111] text-white hover:bg-red-700'
                : 'bg-[#1752bf] text-white hover:bg-[#1447a6]')
            }
          >
            {state.pendingAction.inFlight ? (
              <span className="flex items-center gap-2 font-mono">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ACTION PENDING (PROTECTED)
              </span>
            ) : state.recoveryState.isRecovering ? (
              <span className="flex items-center gap-2">
                <WifiOff className="w-4 h-4" />
                ACTION PROTECTED (QUEUED)
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                PLACE SIMULATED BET
              </span>
            )}
          </button>
        </div>
      )}
      </div>
    );
};
