import React, { useState } from 'react';
import { useSession } from '../../context/SessionContext';
import {
  Activity,
  Terminal,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
} from 'lucide-react';

export const IntelligenceDebugPanel: React.FC = () => {
  const { state, riskAssessment, eventsLog } = useSession();
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  return (
    <aside aria-label="Session Intelligence Diagnostic Panel" className="fixed bottom-0 left-0 right-0 z-40 bg-[#111116] border-t border-[#262638] shadow-2xl transition-all duration-200 select-none">
      {/* Drawer Toggle Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="h-9 px-4 bg-[#161622] hover:bg-[#1d1d2b] cursor-pointer flex items-center justify-between text-xs font-mono text-zinc-300 border-b border-[#242433]"
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-bold text-blue-400">
            <Terminal className="w-3.5 h-3.5" />
            INTELLIGENCE RADAR (LIVE)
          </span>
          <span className="text-zinc-600">|</span>
          <span>
            Journey: <strong className="text-blue-300">{state.journeyStage}</strong>
          </span>
          <span className="text-zinc-600">|</span>
          <span>
            Health:{' '}
            <strong
              className={
                state.healthState === 'HEALTHY'
                  ? 'text-emerald-400'
                  : state.healthState === 'FRICTION'
                  ? 'text-amber-400'
                  : 'text-red-400'
              }
            >
              {state.healthState}
            </strong>
          </span>
          <span className="text-zinc-600">|</span>
          <span>
            Quality: <strong className="text-zinc-100">{state.sessionQuality.overallScore}/100</strong>
          </span>
          <span className="text-zinc-600">|</span>
          <span>
            Risk:{' '}
            <strong
              className={
                riskAssessment.riskLevel === 'LOW'
                  ? 'text-emerald-400'
                  : riskAssessment.riskLevel === 'MEDIUM'
                  ? 'text-amber-400'
                  : 'text-red-400'
              }
            >
              {riskAssessment.riskLevel} ({(riskAssessment.riskScore * 100).toFixed(0)}%)
            </strong>
          </span>
          <span className="text-zinc-600">|</span>
          <span>
            DNA: <strong className="text-indigo-300">{state.sessionDna}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 text-zinc-500">
          <span className="text-[11px]">{eventsLog.length} events logged</span>
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </div>
      </div>

      {/* Expanded Intelligence Matrix */}
      {isExpanded && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 max-h-[220px] overflow-y-auto text-xs font-mono">
          {/* 1. Quality Dimensions */}
          <div className="bg-[#181822] border border-[#272738] p-3 rounded-lg flex flex-col justify-between">
            <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">
              5-Dimension Quality
            </span>
            <div className="flex flex-col gap-1 text-[11px]">
              <div className="flex justify-between text-zinc-300">
                <span>Relevance:</span>
                <span className="font-bold text-blue-400">{state.sessionQuality.relevance}%</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span>Informedness:</span>
                <span className="font-bold text-blue-400">{state.sessionQuality.informedness}%</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span>Friction (inverse):</span>
                <span className="font-bold text-amber-400">{state.sessionQuality.friction}%</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span>Momentum:</span>
                <span className="font-bold text-emerald-400">{state.sessionQuality.momentum}%</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span>Recovery:</span>
                <span className="font-bold text-indigo-400">{state.sessionQuality.recovery}%</span>
              </div>
            </div>
          </div>

          {/* 2. Friction Signals */}
          <div className="bg-[#181822] border border-[#272738] p-3 rounded-lg flex flex-col">
            <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider block mb-1 flex items-center justify-between">
              <span>Active Friction ({state.frictionSignals.length})</span>
              {state.frictionSignals.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </span>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {state.frictionSignals.length === 0 ? (
                <span className="text-zinc-600 text-[11px] italic block mt-2">
                  No active friction anomalies detected.
                </span>
              ) : (
                state.frictionSignals.map((f, i) => (
                  <div
                    key={i}
                    className="p-1.5 rounded bg-[#20202e] border border-amber-900/40 text-[10px] text-amber-200"
                  >
                    <span className="font-bold block uppercase">{f.type}</span>
                    <span className="text-zinc-400 text-[9px] block leading-tight">{f.evidence}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 3. Pending Action & Resilience Guard */}
          <div className="bg-[#181822] border border-[#272738] p-3 rounded-lg flex flex-col justify-between">
            <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">
              Action Shield State
            </span>
            <div className="flex flex-col gap-1 text-[11px]">
              <div className="flex justify-between text-zinc-300">
                <span>In-Flight:</span>
                <span className={state.pendingAction.inFlight ? 'text-amber-400 font-bold animate-pulse' : 'text-zinc-500'}>
                  {state.pendingAction.inFlight ? 'YES (LOCKED)' : 'IDLE'}
                </span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span>Idempotency Key:</span>
                <span className="text-zinc-400 truncate max-w-[110px]">
                  {state.pendingAction.idempotencyKey || 'None'}
                </span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span>Recovery Mode:</span>
                <span className={state.recoveryState.isRecovering ? 'text-red-400 font-bold animate-ping' : 'text-emerald-400 font-bold'}>
                  {state.recoveryState.isRecovering ? 'ACTIVE' : 'STANDBY'}
                </span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span>Momentum:</span>
                <span className="font-bold flex items-center gap-1 text-blue-300">
                  {state.momentum === 'RISING' ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-amber-400" />}
                  {state.momentum} ({state.momentumScore})
                </span>
              </div>
            </div>
          </div>

          {/* 4. Last Canonical Events */}
          <div className="bg-[#181822] border border-[#272738] p-3 rounded-lg flex flex-col">
            <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">
              Recent Telemetry Log
            </span>
            <div className="flex-1 overflow-y-auto space-y-1 text-[10px] text-zinc-400">
              {eventsLog.slice(-5).reverse().map((e, idx) => (
                <div key={idx} className="flex justify-between items-center py-0.5 border-b border-[#232330]">
                  <span className="font-bold text-zinc-300 truncate max-w-[140px]">{e.eventType}</span>
                  <span className="text-zinc-600 font-mono">#{e.sequenceNumber}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
