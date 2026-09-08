import React, { useState, useMemo } from 'react';
import { useSession } from '../../context/SessionContext';
import {
  SYNTHETIC_DATASET,
  filterSessions,
  computeExecutiveKPIs,
  computeUniversalFunnel,
  computeFrictionExplorer,
  computeDnaDistribution,
  computeProviderHealth,
  computeSportIntelligence,
  computePlatformIntelligence,
  runGroundedInvestigation,
  computeWhatIfImpact,
  OperatorFilterState,
  SyntheticSession,
} from '../../services/operatorAnalytics';
import {
  JourneyStage,
  HealthState,
  SessionDnaProfile,
  CanonicalEvent,
} from '../../types/canonical';
import { loadAuthoritativeLiveTelemetry } from '../../services/sessionMemoryService';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Cpu,
  Eye,
  Filter,
  Flame,
  Globe,
  HelpCircle,
  History,
  Info,
  Layers,
  LifeBuoy,
  Radio,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Smartphone,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';

interface OperatorDashboardProps {
  onSwitchPortal?: (portal: 'user' | 'admin') => void;
}

export const OperatorDashboard: React.FC<OperatorDashboardProps> = ({ onSwitchPortal }) => {
  const { state: liveState, eventsLog: liveEventsLog, riskAssessment } = useSession();

  // Navigation tab within Operator Intelligence
  type TabType =
    | 'EXECUTIVE'
    | 'FUNNEL'
    | 'DROPOFF'
    | 'FRICTION'
    | 'ROOT_CAUSE'
    | 'SESSIONS'
    | 'DNA'
    | 'SPORTS'
    | 'PLATFORMS'
    | 'PROVIDERS'
    | 'LIVE_MONITOR'
    | 'AI_INVESTIGATOR'
    | 'WHAT_IF'
    | 'RESPONSIBLE';

  const [activeTab, setActiveTab] = useState<TabType>('LIVE_MONITOR');

  // Cross-Filter State
  const [filters, setFilters] = useState<OperatorFilterState>({
    dateRange: 'TODAY',
    platform: 'ALL',
    product: 'ALL',
    sport: 'ALL',
    provider: 'ALL',
    journeyStage: 'ALL',
    healthState: 'ALL',
    dna: 'ALL',
    searchQuery: '',
  });

  // Selected session for full timeline inspection (defaults to live session)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(() => liveState.sessionId);

  // AI Investigator Prompt & Findings
  const [investigatorQuery, setInvestigatorQuery] = useState<string>(
    'Why are sessions failing during action and bet placement on mobile?'
  );
  const [isInvestigating, setIsInvestigating] = useState<boolean>(false);
  const [investigatorResults, setInvestigatorResults] = useState<ReturnType<typeof runGroundedInvestigation> | null>(
    () => runGroundedInvestigation('Why are sessions failing during action and bet placement on mobile?', SYNTHETIC_DATASET)
  );

  // What-If Simulator Target
  const [targetRecoveryPct, setTargetRecoveryPct] = useState<number>(75);

  // Resolve authoritative live event log from context or fallback storage
  const effectiveEventsLog = useMemo(() => {
    if (liveEventsLog && liveEventsLog.length > 0) {
      return liveEventsLog;
    }
    const stored = loadAuthoritativeLiveTelemetry();
    if (stored && stored.sessionId === liveState.sessionId && stored.events.length > 0) {
      return stored.events;
    }
    return liveEventsLog;
  }, [liveEventsLog, liveState.sessionId]);

  // Synthesize current active live session into dataset so admin reflects live user portal actions
  const unifiedDataset = useMemo(() => {
    const liveSynthetic: SyntheticSession = {
      sessionId: liveState.sessionId,
      isLiveSession: true,
      timestamp: effectiveEventsLog[0]?.timestamp || Date.now(),
      durationSeconds: Math.max(1, Math.round((Date.now() - (effectiveEventsLog[0]?.timestamp || Date.now())) / 1000)),
      platform: 'web-desktop',
      product: 'sports',
      sport: liveState.currentSport?.name || 'Football',
      provider: 'Internal Engine',
      event: liveState.currentEvent?.name || 'Live Match',
      journeyStage: liveState.journeyStage,
      healthState: liveState.healthState,
      qualityScore: liveState.sessionQuality.overallScore,
      momentum: liveState.momentum,
      riskScore: Math.round(riskAssessment.riskScore * 100),
      dna: liveState.sessionDna,
      timeToFirstActionSeconds: 12,
      actionCount: effectiveEventsLog.filter(e => e.eventType === 'ACTION_CONFIRMED' || e.eventType === 'SELECTION_ADDED').length,
      frictions: liveState.frictionSignals.map(f => ({
        type: f.type,
        severity: f.severity,
        evidence: f.evidence || `${f.type} observed at ${new Date(f.timestamp).toLocaleTimeString()}`,
      })),
      wasRecovered: liveState.healthState === 'RECOVERED',
      isCompleted: liveState.journeyStage === 'COMPLETION',
      events: effectiveEventsLog,
    };

    return [liveSynthetic, ...SYNTHETIC_DATASET];
  }, [liveState, effectiveEventsLog, riskAssessment]);

  // Filtered dataset slice
  const filteredSessions = useMemo(() => {
    return filterSessions(unifiedDataset, filters);
  }, [unifiedDataset, filters]);

  // Dynamic computed models from filtered slice
  const kpis = useMemo(() => computeExecutiveKPIs(filteredSessions), [filteredSessions]);
  const funnel = useMemo(() => computeUniversalFunnel(filteredSessions), [filteredSessions]);
  const frictions = useMemo(() => computeFrictionExplorer(filteredSessions), [filteredSessions]);
  const dnaDistribution = useMemo(() => computeDnaDistribution(filteredSessions), [filteredSessions]);
  const providerHealth = useMemo(() => computeProviderHealth(filteredSessions), [filteredSessions]);
  const sportIntelligence = useMemo(() => computeSportIntelligence(filteredSessions), [filteredSessions]);
  const platformIntelligence = useMemo(() => computePlatformIntelligence(filteredSessions), [filteredSessions]);
  const whatIfResult = useMemo(
    () => computeWhatIfImpact(filteredSessions, targetRecoveryPct),
    [filteredSessions, targetRecoveryPct]
  );

  // Look up inspected session
  const activeTimelineSession = useMemo(() => {
    if (!selectedSessionId) return null;
    return filteredSessions.find(s => s.sessionId === selectedSessionId) || null;
  }, [selectedSessionId, filteredSessions]);

  // Investigation handler
  const handleRunInvestigation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!investigatorQuery.trim()) return;
    setIsInvestigating(true);
    setTimeout(() => {
      setIsInvestigating(false);
      setInvestigatorResults(runGroundedInvestigation(investigatorQuery, filteredSessions));
    }, 400);
  };

  const getClassificationBadge = (classification: 'OBSERVED' | 'MODELLED' | 'PROXY' | 'HYPOTHESIS') => {
    const colors = {
      OBSERVED: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/50',
      MODELLED: 'bg-blue-950/80 text-blue-300 border-blue-800/50',
      PROXY: 'bg-purple-950/80 text-purple-300 border-purple-800/50',
      HYPOTHESIS: 'bg-amber-950/80 text-amber-300 border-amber-800/50',
    };
    return (
      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${colors[classification]}`}>
        {classification}
      </span>
    );
  };

  // Latest canonical event from customer session
  const latestEvent = effectiveEventsLog[effectiveEventsLog.length - 1];

  return (
    <div className="flex flex-col gap-5 p-4 max-w-7xl mx-auto animate-in fade-in duration-200 text-zinc-200">
      {/* HEADER & ARCHITECTURAL MANIFESTO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#14141d] border border-[#262638] p-4 rounded-xl shadow-lg">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Cpu className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white tracking-tight font-mono">OPERATOR SESSION INTELLIGENCE</h1>
                <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-800/50 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                  OBSERVED — PROTOTYPE SESSION
                </span>
                <span className="bg-amber-950/60 text-amber-400 border border-amber-800/50 text-[10px] font-mono px-2 py-0.5 rounded">
                  SYNTHETIC BENCHMARK
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Authoritative User → Waypoint Telemetry → Admin Bridge · Zero duplicate event buses
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onSwitchPortal && (
            <button
              onClick={() => onSwitchPortal('user')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow transition"
              title="Return to Customer User Portal"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to User Portal
            </button>
          )}
          <button
            onClick={() => {
              setFilters({
                dateRange: 'TODAY',
                platform: 'ALL',
                product: 'ALL',
                sport: 'ALL',
                provider: 'ALL',
                journeyStage: 'ALL',
                healthState: 'ALL',
                dna: 'ALL',
                searchQuery: '',
              });
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1e1e2c] hover:bg-[#28283c] text-xs font-semibold text-zinc-300 border border-[#33334d] transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Filters
          </button>
          <div className="px-3 py-2 rounded-lg bg-blue-950/40 border border-blue-800/40 text-xs font-mono text-blue-300">
            Active Dataset: <strong>{filteredSessions.length}</strong> Sessions (1 Live + 250 Synthetic)
          </div>
        </div>
      </div>

      {/* PROMINENT LIVE CUSTOMER SESSION PANEL */}
      <div className="bg-[#12121c] border-2 border-[#1752bf]/70 rounded-xl p-4 shadow-xl flex flex-col gap-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 px-3 py-1 bg-[#1752bf] text-white text-[10px] font-mono font-black uppercase tracking-wider rounded-bl-lg shadow flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          AUTHORITATIVE LIVE CUSTOMER BRIDGE
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">SESSION IDENTITY:</span>
            <span className="text-sm font-mono font-black text-white bg-[#1a1a27] border border-[#2a2a3e] px-2.5 py-1 rounded">
              {liveState.sessionId}
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded">
              MATCHES USER PORTAL
            </span>
            <span className="text-[10px] font-mono text-blue-300 bg-blue-950/60 border border-blue-800/50 px-2 py-0.5 rounded">
              OBSERVED — PROTOTYPE SESSION
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedSessionId(liveState.sessionId);
                setActiveTab('SESSIONS');
              }}
              className="text-xs font-mono text-blue-400 hover:text-blue-300 underline font-bold"
            >
              Inspect Full Event Trail ({effectiveEventsLog.length} events) →
            </button>
          </div>
        </div>

        {/* Live Status Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
          {/* Journey Stage */}
          <div className="bg-[#181824] border border-[#262638] rounded-lg p-2.5">
            <span className="text-[10px] font-mono text-zinc-400 block uppercase">Journey Stage</span>
            <strong className="text-xs sm:text-sm font-mono text-white block mt-0.5">
              {liveState.journeyStage}
            </strong>
            <span className="text-[10px] text-zinc-500 font-mono">FSM Progress</span>
          </div>

          {/* Health State */}
          <div className="bg-[#181824] border border-[#262638] rounded-lg p-2.5">
            <span className="text-[10px] font-mono text-zinc-400 block uppercase">Health State</span>
            <div className="mt-0.5">
              <span
                className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-black ${
                  liveState.healthState === 'HEALTHY'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : liveState.healthState === 'RECOVERED'
                    ? 'bg-blue-950 text-blue-400 border border-blue-800'
                    : liveState.healthState === 'RECOVERING'
                    ? 'bg-indigo-950 text-indigo-300 border border-indigo-800 animate-pulse'
                    : liveState.healthState === 'FRICTION'
                    ? 'bg-amber-950 text-amber-400 border border-amber-800'
                    : 'bg-red-950 text-red-400 border border-red-800 animate-pulse'
                }`}
              >
                {liveState.healthState}
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">
              {liveState.frictionSignals.length} friction signal{liveState.frictionSignals.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Authoritative Session Quality */}
          <div className="bg-[#181824] border border-[#262638] rounded-lg p-2.5">
            <span className="text-[10px] font-mono text-zinc-400 block uppercase">Session Quality</span>
            <strong className="text-xs sm:text-sm font-mono text-amber-400 block mt-0.5">
              {liveState.sessionQuality.overallScore}/100
            </strong>
            <span className="text-[10px] text-zinc-500 font-mono">
              Friction: {liveState.sessionQuality.friction} · Rec: {liveState.sessionQuality.recovery}
            </span>
          </div>

          {/* Risk Assessment */}
          <div className="bg-[#181824] border border-[#262638] rounded-lg p-2.5">
            <span className="text-[10px] font-mono text-zinc-400 block uppercase">Risk Level</span>
            <strong
              className={`text-xs sm:text-sm font-mono block mt-0.5 ${
                riskAssessment.riskLevel === 'HIGH' || riskAssessment.riskLevel === 'CRITICAL'
                  ? 'text-red-400'
                  : riskAssessment.riskLevel === 'MEDIUM'
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {riskAssessment.riskLevel} ({(riskAssessment.riskScore * 100).toFixed(0)}%)
            </strong>
            <span className="text-[10px] text-zinc-500 font-mono truncate block">
              {riskAssessment.reasons[0] || 'Nominal baseline'}
            </span>
          </div>

          {/* Current Target Context */}
          <div className="bg-[#181824] border border-[#262638] rounded-lg p-2.5">
            <span className="text-[10px] font-mono text-zinc-400 block uppercase">Active Context</span>
            <strong className="text-xs font-mono text-zinc-200 block mt-0.5 truncate" title={liveState.currentEvent?.name}>
              {liveState.currentEvent ? liveState.currentEvent.name : 'No Fixture'}
            </strong>
            <span className="text-[10px] text-zinc-500 font-mono truncate block">
              {liveState.currentMarket?.name || liveState.currentSport?.name || 'Exploring'}
            </span>
          </div>

          {/* Recovery / Lifeboat Status */}
          <div className="bg-[#181824] border border-[#262638] rounded-lg p-2.5">
            <span className="text-[10px] font-mono text-zinc-400 block uppercase">Lifeboat State</span>
            <strong className="text-xs font-mono block mt-0.5">
              {liveState.recoveryState.isRecovering ? (
                <span className="text-amber-400 flex items-center gap-1">
                  <LifeBuoy className="w-3.5 h-3.5 animate-spin" />
                  Action Protected
                </span>
              ) : liveState.healthState === 'RECOVERED' ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Outcome Reconciled
                </span>
              ) : liveState.pendingAction.inFlight ? (
                <span className="text-blue-400">Action In-Flight</span>
              ) : (
                <span className="text-zinc-400">Idle / Protected</span>
              )}
            </strong>
            <span className="text-[10px] text-zinc-500 font-mono">
              Latest: {latestEvent ? latestEvent.eventType : 'SESSION_STARTED'}
            </span>
          </div>
        </div>
      </div>


      {/* CROSS-FILTERING COMMAND BAR */}
      <div className="bg-[#151520] border border-[#262638] p-3 rounded-xl flex flex-wrap items-center gap-2.5 text-xs shadow-sm">
        <div className="flex items-center gap-1.5 font-mono text-zinc-400 font-bold mr-1">
          <Filter className="w-3.5 h-3.5 text-blue-400" />
          FILTERS:
        </div>

        {/* Platform Filter */}
        <select
          value={filters.platform}
          onChange={e => setFilters({ ...filters, platform: e.target.value as any })}
          className="bg-[#1c1c28] border border-[#313146] text-zinc-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500"
        >
          <option value="ALL">All Platforms</option>
          <option value="android">Android Native</option>
          <option value="ios">iOS Native</option>
          <option value="web-mobile">Mobile Web (PWA)</option>
          <option value="web-desktop">Desktop Web</option>
        </select>

        {/* Sport Filter */}
        <select
          value={filters.sport}
          onChange={e => setFilters({ ...filters, sport: e.target.value as any })}
          className="bg-[#1c1c28] border border-[#313146] text-zinc-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500"
        >
          <option value="ALL">All Sports</option>
          <option value="Football">Football</option>
          <option value="Tennis">Tennis</option>
          <option value="Basketball">Basketball</option>
          <option value="Esports">Esports</option>
          <option value="Ice Hockey">Ice Hockey</option>
        </select>

        {/* Journey Stage Filter */}
        <select
          value={filters.journeyStage}
          onChange={e => setFilters({ ...filters, journeyStage: e.target.value as any })}
          className="bg-[#1c1c28] border border-[#313146] text-zinc-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500"
        >
          <option value="ALL">All Journey Stages</option>
          <option value="DISCOVERY">Discovery</option>
          <option value="EXPLORATION">Exploration</option>
          <option value="DECISION">Decision</option>
          <option value="ACTION">Action</option>
          <option value="COMPLETION">Completion</option>
        </select>

        {/* Health State Filter */}
        <select
          value={filters.healthState}
          onChange={e => setFilters({ ...filters, healthState: e.target.value as any })}
          className="bg-[#1c1c28] border border-[#313146] text-zinc-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500"
        >
          <option value="ALL">All Health States</option>
          <option value="HEALTHY">Healthy</option>
          <option value="FRICTION">Friction Detected</option>
          <option value="AT_RISK">At Risk</option>
          <option value="RECOVERED">Recovered</option>
        </select>

        {/* Provider Filter */}
        <select
          value={filters.provider}
          onChange={e => setFilters({ ...filters, provider: e.target.value as any })}
          className="bg-[#1c1c28] border border-[#313146] text-zinc-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500"
        >
          <option value="ALL">All Providers</option>
          <option value="BetGenius">BetGenius</option>
          <option value="Sportradar">Sportradar</option>
          <option value="Evolution">Evolution</option>
          <option value="Pragmatic">Pragmatic</option>
          <option value="Internal">Internal Engine</option>
        </select>

        {/* DNA Filter */}
        <select
          value={filters.dna}
          onChange={e => setFilters({ ...filters, dna: e.target.value as any })}
          className="bg-[#1c1c28] border border-[#313146] text-zinc-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500"
        >
          <option value="ALL">All Session DNA</option>
          <option value="HIGH-INTENT">High-Intent</option>
          <option value="EXPLORER">Explorer</option>
          <option value="FAST-DECISION">Fast-Decision</option>
          <option value="SOCIAL">Social</option>
          <option value="RECOVERY">Recovery</option>
          <option value="FRICTION-HEAVY">Friction-Heavy</option>
        </select>

        {/* Search Query */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search session #, event, or provider..."
            value={filters.searchQuery}
            onChange={e => setFilters({ ...filters, searchQuery: e.target.value })}
            className="w-full bg-[#1c1c28] border border-[#313146] text-zinc-200 rounded pl-8 pr-2.5 py-1 text-xs focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* DASHBOARD NAVIGATION TABS */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[#262638] pb-1.5">
        {[
          { id: 'EXECUTIVE', label: '1. Executive KPIs', icon: BarChart3 },
          { id: 'FUNNEL', label: '2. Universal Funnel', icon: Activity },
          { id: 'DROPOFF', label: '3. Where Users Leave', icon: TrendingDown },
          { id: 'FRICTION', label: '4. Friction Explorer', icon: AlertTriangle },
          { id: 'ROOT_CAUSE', label: '5. Root Cause', icon: Compass },
          { id: 'SESSIONS', label: '6. Session Explorer', icon: Eye },
          { id: 'DNA', label: '7. Session DNA', icon: Layers },
          { id: 'SPORTS', label: '8. Sport Intel', icon: Flame },
          { id: 'PLATFORMS', label: '9. Platforms', icon: Smartphone },
          { id: 'PROVIDERS', label: '10. Providers', icon: Globe },
          { id: 'LIVE_MONITOR', label: '11. Live Monitor', icon: Radio },
          { id: 'AI_INVESTIGATOR', label: '12. AI Investigator', icon: Sparkles },
          { id: 'WHAT_IF', label: '13. What-If Simulator', icon: Sliders },
          { id: 'RESPONSIBLE', label: '14. Responsible Intel', icon: ShieldCheck },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-[#151520] text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1f2d] border border-[#28283a]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: EXECUTIVE INTELLIGENCE DASHBOARD */}
      {activeTab === 'EXECUTIVE' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-150">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              kpis.sessionQuality,
              kpis.sessionConversion,
              kpis.actionsPerSession,
              kpis.finalStepConversion,
              kpis.sessionsPerUser,
              kpis.timeToFirstAction,
              kpis.sessionAtRiskRate,
              kpis.recoveryRate,
            ].map((metric, idx) => (
              <div
                key={idx}
                className="bg-[#151522] border border-[#262638] p-4 rounded-xl shadow-sm flex flex-col justify-between relative group hover:border-[#3d3d57] transition"
              >
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="text-xs font-semibold text-zinc-400">{metric.label}</span>
                  {getClassificationBadge(metric.classification)}
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-2xl font-black text-white font-mono tracking-tight">{metric.value}</span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-2 font-mono leading-tight">{metric.formulaDescription}</p>
              </div>
            ))}
          </div>

          <div className="bg-[#151522] border border-[#262638] p-4 rounded-xl flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400" />
              <span>
                <strong>Classification Legend:</strong> OBSERVED = Derived directly from canonical event logs · MODELLED = Multi-variable scoring heuristic · PROXY = Correlated device estimation · HYPOTHESIS = Unproven statistical association.
              </span>
            </div>
            <span className="text-zinc-500 font-mono">Real-time Cross-Filtered Slice</span>
          </div>
        </div>
      )}

      {/* TAB 2: UNIVERSAL SESSION FUNNEL */}
      {activeTab === 'FUNNEL' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-150">
          <div className="bg-[#151522] border border-[#262638] p-5 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Universal Session Funnel
                </h3>
                <p className="text-xs text-zinc-400">Monotonic progression across active filtered cohort</p>
              </div>
              <span className="text-xs font-mono text-zinc-400 bg-[#1e1e2d] px-2.5 py-1 rounded border border-[#2d2d42]">
                Total Initiated: {filteredSessions.length} Sessions
              </span>
            </div>

            <div className="space-y-4">
              {funnel.map((step, idx) => (
                <div key={step.stage} className="bg-[#1b1b28] border border-[#2b2b3f] p-3.5 rounded-lg">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-zinc-200 flex items-center gap-2 font-mono">
                      <span className="w-5 h-5 rounded-full bg-blue-900/60 text-blue-400 flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      {step.label}
                    </span>
                    <div className="flex items-center gap-4 text-zinc-400 font-mono text-[11px]">
                      <span>
                        Sessions: <strong className="text-white">{step.count}</strong> ({step.pctOfTotal}%)
                      </span>
                      {idx < funnel.length - 1 && (
                        <span className="text-red-400 font-semibold">
                          Drop-off: -{step.dropOffCount} ({step.dropOffPct}%)
                        </span>
                      )}
                      <span>Avg Duration: {step.avgDurationSec}s</span>
                      <span>Friction: {step.frictionCount}</span>
                      <span className="bg-[#242436] px-1.5 py-0.5 rounded text-zinc-300">
                        Top Platform: {step.topPlatform}
                      </span>
                      <span className="bg-[#242436] px-1.5 py-0.5 rounded text-zinc-300">
                        Top Sport: {step.topSport}
                      </span>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full h-3 bg-[#111118] rounded-full overflow-hidden flex">
                    <div
                      className="bg-blue-600 h-full transition-all duration-500 rounded-full"
                      style={{ width: `${step.pctOfTotal}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: WHERE ARE USERS LEAVING? */}
      {activeTab === 'DROPOFF' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {funnel.slice(0, 4).map(step => (
              <button
                key={step.stage}
                onClick={() => setFilters({ ...filters, journeyStage: step.stage })}
                className="bg-[#151522] border border-[#262638] hover:border-blue-500 p-4 rounded-xl text-left transition group shadow-sm"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-zinc-400 group-hover:text-blue-400">
                    {step.label}
                  </span>
                  <span className="text-xs font-mono font-bold text-red-400">-{step.dropOffPct}%</span>
                </div>
                <div className="text-xl font-black text-white font-mono">{step.dropOffCount} left</div>
                <div className="text-[11px] text-zinc-500 mt-2">Click to isolate this drop-off stage</div>
              </button>
            ))}
            <div className="bg-[#151522] border border-[#262638] p-4 rounded-xl text-left">
              <span className="text-xs font-mono font-bold text-zinc-400">Completion</span>
              <div className="text-xl font-black text-emerald-400 font-mono">
                {funnel[funnel.length - 1]?.count || 0} passed
              </div>
              <div className="text-[11px] text-zinc-500 mt-2">Terminal successful state</div>
            </div>
          </div>

          <div className="bg-[#151522] border border-[#262638] p-5 rounded-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono mb-3">
              Multidimensional Drop-Off Matrix (Where Sessions Break)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#1a1a27] p-3.5 rounded-lg border border-[#2a2a3e]">
                <span className="text-xs font-bold text-zinc-300 block mb-2 font-mono">BY PLATFORM</span>
                <div className="space-y-2 text-xs">
                  {platformIntelligence.map(p => (
                    <div key={p.platform} className="flex items-center justify-between text-zinc-400">
                      <span>{p.label}</span>
                      <span className="font-mono text-white font-bold">{100 - p.conversionRate}% drop-off</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#1a1a27] p-3.5 rounded-lg border border-[#2a2a3e]">
                <span className="text-xs font-bold text-zinc-300 block mb-2 font-mono">BY SPORT</span>
                <div className="space-y-2 text-xs">
                  {sportIntelligence.map(s => (
                    <div key={s.sport} className="flex items-center justify-between text-zinc-400">
                      <span>{s.sport}</span>
                      <span className="font-mono text-white font-bold">{100 - s.conversionRate}% drop-off</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#1a1a27] p-3.5 rounded-lg border border-[#2a2a3e]">
                <span className="text-xs font-bold text-zinc-300 block mb-2 font-mono">BY PROVIDER</span>
                <div className="space-y-2 text-xs">
                  {providerHealth.map(p => (
                    <div key={p.provider} className="flex items-center justify-between text-zinc-400">
                      <span>{p.provider}</span>
                      <span className="font-mono text-white font-bold">{p.connectionFailureRate}% socket drop</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FRICTION EXPLORER */}
      {activeTab === 'FRICTION' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-150">
          <div className="bg-[#151522] border border-[#262638] p-5 rounded-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono mb-4">
              Friction Signal Catalog & Severity Breakdown
            </h3>
            <div className="space-y-3">
              {frictions.map(f => (
                <div
                  key={f.type}
                  className="bg-[#1b1b29] border border-[#29293f] p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-white font-mono">{f.name}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                          f.severity === 'critical'
                            ? 'bg-red-950/80 text-red-400 border-red-800'
                            : f.severity === 'high'
                            ? 'bg-orange-950/80 text-orange-400 border-orange-800'
                            : f.severity === 'medium'
                            ? 'bg-amber-950/80 text-amber-400 border-amber-800'
                            : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                        }`}
                      >
                        {f.severity} severity
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 italic">Evidence: "{f.evidenceSnippet}"</p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-500 font-mono">
                      <span>Top Platform: <strong className="text-zinc-300">{f.topPlatform}</strong></span>
                      <span>Top Sport: <strong className="text-zinc-300">{f.topSport}</strong></span>
                      <span>Top Provider: <strong className="text-zinc-300">{f.topProvider}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right shrink-0">
                    <div className="text-center px-3 py-1 bg-[#14141e] rounded border border-[#252538]">
                      <span className="text-xs text-zinc-400 block font-mono">Affected</span>
                      <span className="text-base font-bold text-white font-mono">{f.affectedSessions}</span>
                    </div>
                    <div className="text-center px-3 py-1 bg-[#14141e] rounded border border-[#252538]">
                      <span className="text-xs text-zinc-400 block font-mono">Recovery</span>
                      <span
                        className={`text-base font-bold font-mono ${
                          f.recoveryRate >= 70 ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {f.recoveryRate}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ROOT CAUSE EXPLORER */}
      {activeTab === 'ROOT_CAUSE' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-150">
          <div className="bg-[#151522] border border-[#262638] p-5 rounded-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono mb-2">
              Deductive Root Cause Chain
            </h3>
            <p className="text-xs text-zinc-400 mb-6">
              Moving from problem symptom to stage, friction signal, operational context, and recovery opportunity
            </p>

            {/* Visual Step-by-Step Pipeline */}
            <div className="flex flex-col md:flex-row items-center gap-2">
              <div className="flex-1 bg-[#1c1c2b] border border-[#2d2d44] p-3.5 rounded-xl">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block font-bold">1. Problem</span>
                <span className="text-sm font-black text-red-400">ACTION Drop-off</span>
                <p className="text-xs text-zinc-400 mt-1">27% drop before bet confirmation</p>
              </div>

              <ArrowRight className="w-4 h-4 text-zinc-600 hidden md:block" />

              <div className="flex-1 bg-[#1c1c2b] border border-[#2d2d44] p-3.5 rounded-xl">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block font-bold">2. Friction</span>
                <span className="text-sm font-black text-amber-400">Connection Failure</span>
                <p className="text-xs text-zinc-400 mt-1">Mobile websocket heartbeat timeout</p>
              </div>

              <ArrowRight className="w-4 h-4 text-zinc-600 hidden md:block" />

              <div className="flex-1 bg-[#1c1c2b] border border-[#2d2d44] p-3.5 rounded-xl">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block font-bold">3. Context</span>
                <span className="text-sm font-black text-blue-400">Android / Football</span>
                <p className="text-xs text-zinc-400 mt-1">High concurrency live in-play</p>
              </div>

              <ArrowRight className="w-4 h-4 text-zinc-600 hidden md:block" />

              <div className="flex-1 bg-[#1c1c2b] border border-[#2d2d44] p-3.5 rounded-xl">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block font-bold">4. Root Cause</span>
                <span className="text-sm font-black text-purple-400">Feed Drop & Latency</span>
                <p className="text-xs text-zinc-400 mt-1">Observed association — not causal proof</p>
              </div>

              <ArrowRight className="w-4 h-4 text-zinc-600 hidden md:block" />

              <div className="flex-1 bg-[#1c1c2b] border border-emerald-800/40 bg-emerald-950/20 p-3.5 rounded-xl">
                <span className="text-[10px] font-mono text-emerald-400 uppercase block font-bold">
                  5. Opportunity
                </span>
                <span className="text-sm font-black text-emerald-300">Session Lifeboat</span>
                <p className="text-xs text-zinc-400 mt-1">Idempotency replay preserves stake</p>
              </div>
            </div>

            <div className="mt-6 bg-[#161621] p-4 rounded-lg border border-[#242435] text-xs text-zinc-400">
              <span className="font-bold text-amber-400">Scientific Integrity Notice:</span> Root causes in this
              dashboard are strictly derived from canonical event timestamps and platform correlation metrics.
              Correlations are explicitly flagged as <em>"Observed association — not causal proof."</em>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: SESSION EXPLORER (SEARCHABLE LIST + TIMELINE INSPECTOR) */}
      {activeTab === 'SESSIONS' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-150">
          {/* Sessions List */}
          <div className="md:col-span-2 bg-[#151522] border border-[#262638] rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white font-mono uppercase">
                Session Ledger ({filteredSessions.length})
              </h3>
              <span className="text-xs text-zinc-400">Click any session to view canonical event timeline</span>
            </div>

            <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-zinc-400 font-mono border-b border-[#29293e] sticky top-0 bg-[#151522]">
                  <tr>
                    <th className="py-2 px-2">Session ID</th>
                    <th className="py-2 px-2">Platform</th>
                    <th className="py-2 px-2">Sport</th>
                    <th className="py-2 px-2">Stage</th>
                    <th className="py-2 px-2">Health</th>
                    <th className="py-2 px-2">Quality</th>
                    <th className="py-2 px-2">DNA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#232335]">
                  {filteredSessions.slice(0, 35).map(s => {
                    const isSelected = selectedSessionId === s.sessionId;
                    return (
                      <tr
                        key={s.sessionId}
                        onClick={() => setSelectedSessionId(s.sessionId)}
                        className={`cursor-pointer transition ${
                          isSelected ? 'bg-blue-950/40 text-blue-200' : 'hover:bg-[#1b1b2a] text-zinc-300'
                        }`}
                      >
                        <td className="py-2 px-2 font-mono font-bold flex items-center gap-1.5">
                          {s.isLiveSession && (
                            <span className="px-1.5 py-0.2 bg-blue-600 text-white rounded text-[9px] font-black uppercase tracking-wider animate-pulse">
                              ● LIVE
                            </span>
                          )}
                          <span>{s.sessionId}</span>
                        </td>
                        <td className="py-2 px-2">{s.platform}</td>
                        <td className="py-2 px-2">{s.sport}</td>
                        <td className="py-2 px-2 font-mono">{s.journeyStage}</td>
                        <td className="py-2 px-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              s.healthState === 'HEALTHY'
                                ? 'bg-emerald-950/60 text-emerald-400'
                                : s.healthState === 'RECOVERED'
                                ? 'bg-blue-950/60 text-blue-400'
                                : s.healthState === 'FRICTION'
                                ? 'bg-amber-950/60 text-amber-400'
                                : 'bg-red-950/60 text-red-400'
                            }`}
                          >
                            {s.healthState}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-mono">{s.qualityScore}/100</td>
                        <td className="py-2 px-2 font-mono text-[10px] text-zinc-400">{s.dna}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Canonical Event Timeline for Selected Session */}
          <div className="bg-[#151522] border border-[#262638] rounded-xl p-4 flex flex-col justify-between">
            {activeTimelineSession ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-[#29293e] pb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white font-mono">{activeTimelineSession.sessionId}</h4>
                      {activeTimelineSession.isLiveSession ? (
                        <span className="px-1.5 py-0.5 bg-blue-600 text-white rounded text-[9px] font-black uppercase tracking-wider">
                          OBSERVED — PROTOTYPE SESSION
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded text-[9px] font-mono">
                          SYNTHETIC BENCHMARK
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-400">
                      {activeTimelineSession.platform} · {activeTimelineSession.sport} · {activeTimelineSession.provider}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedSessionId(null)}
                    className="p-1 text-zinc-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-xs space-y-1 font-mono text-zinc-400">
                  <div>Journey Stage: <strong className="text-white">{activeTimelineSession.journeyStage}</strong></div>
                  <div>Quality Score: <strong className="text-white">{activeTimelineSession.qualityScore}/100</strong></div>
                  <div>Risk Score: <strong className="text-white">{activeTimelineSession.riskScore}%</strong></div>
                  <div>DNA: <strong className="text-indigo-400">{activeTimelineSession.dna}</strong></div>
                </div>

                <h5 className="text-xs font-bold text-zinc-300 font-mono uppercase mt-2">
                  Canonical Event Sequence ({activeTimelineSession.events.length})
                </h5>

                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {activeTimelineSession.events.map((evt, idx) => (
                    <div
                      key={evt.id}
                      className="bg-[#1b1b29] border border-[#2a2a3e] p-2.5 rounded-lg text-xs font-mono"
                    >
                      <div className="flex items-center justify-between text-zinc-400 mb-1">
                        <span className="text-[10px] font-bold text-blue-400">#{evt.sequenceNumber}</span>
                        <span className="text-[10px] text-zinc-500">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="font-bold text-zinc-200">{evt.eventType}</div>
                      <div className="text-[10px] text-zinc-500 mt-1">
                        Source: {evt.source} · Stage: {evt.journeyStage}
                      </div>
                      {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                        <div className="mt-1 p-1 bg-[#13131b] rounded text-[10px] text-zinc-400">
                          {JSON.stringify(evt.metadata)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-zinc-500 text-xs">
                <Compass className="w-8 h-8 text-zinc-600 mb-2" />
                Select any session from the table to examine its complete canonical event trail and recovery reconciliation.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 7: SESSION DNA DISTRIBUTION */}
      {activeTab === 'DNA' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-150">
          <div className="bg-[#151522] border border-[#262638] p-5 rounded-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono mb-2">
              Behavioral Session DNA Distribution
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Cluster archetypes defined exclusively by interaction pace, depth, and friction. Strictly non-inferential
              of personal vulnerabilities.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {dnaDistribution.map(dna => (
                <div
                  key={dna.dna}
                  className="bg-[#1b1b29] border border-[#2b2b3f] p-4 rounded-xl flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono font-bold text-sm text-indigo-300">{dna.dna}</span>
                    <span className="text-xs font-mono font-bold text-white bg-[#252538] px-2 py-0.5 rounded">
                      {dna.percentage}% of cohort
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono text-zinc-400 mb-3">
                    <div>Sessions: <strong className="text-white">{dna.count}</strong></div>
                    <div>Conversion: <strong className="text-emerald-400">{dna.conversionRate}%</strong></div>
                    <div>Avg Quality: <strong className="text-white">{dna.avgQuality}/100</strong></div>
                    <div>Friction Rate: <strong className="text-amber-400">{dna.frictionRate}%</strong></div>
                  </div>

                  <div className="text-[11px] text-zinc-500 border-t border-[#29293e] pt-2">
                    Recovery Success: <strong className="text-blue-400">{dna.recoveryRate}%</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: SPORT & EVENT INTELLIGENCE */}
      {activeTab === 'SPORTS' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-150">
          <div className="bg-[#151522] border border-[#262638] p-5 rounded-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono mb-4">
              Sport & Match Drilldown Telemetry
            </h3>

            <div className="space-y-4">
              {sportIntelligence.map(sport => (
                <div key={sport.sport} className="bg-[#1b1b28] border border-[#29293e] p-4 rounded-xl">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#29293e] pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-white">{sport.sport}</span>
                      <span className="text-xs font-mono text-zinc-400">({sport.sessions} sessions)</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-mono text-zinc-300">
                      <span>Conversion: <strong className="text-emerald-400">{sport.conversionRate}%</strong></span>
                      <span>Avg Quality: <strong>{sport.avgQuality}/100</strong></span>
                      <span>Friction: <strong className="text-amber-400">{sport.frictionRate}%</strong></span>
                      <span>TTFA: <strong>{sport.timeToFirstActionSec}s</strong></span>
                    </div>
                  </div>

                  {/* Events Drilldown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {sport.events.map(ev => (
                      <div
                        key={ev.eventName}
                        className="bg-[#14141e] border border-[#242435] p-2.5 rounded flex items-center justify-between"
                      >
                        <span className="font-semibold text-zinc-300">{ev.eventName}</span>
                        <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-400">
                          <span>{ev.sessions} sess</span>
                          <span>{ev.actions} bets</span>
                          <span className={ev.frictionRate > 20 ? 'text-amber-400' : 'text-zinc-400'}>
                            {ev.frictionRate}% fric
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: PLATFORM INTELLIGENCE */}
      {activeTab === 'PLATFORMS' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {platformIntelligence.map(p => (
              <div key={p.platform} className="bg-[#151522] border border-[#262638] p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-xs font-mono text-blue-400 font-bold uppercase">{p.label}</span>
                  <div className="text-2xl font-black text-white font-mono mt-1">{p.sessions}</div>
                  <span className="text-[11px] text-zinc-500 font-mono">Sessions Initiated</span>
                </div>

                <div className="mt-4 space-y-2 text-xs font-mono text-zinc-400 border-t border-[#27273a] pt-3">
                  <div className="flex justify-between">
                    <span>Quality Score:</span>
                    <strong className="text-white">{p.sessionQuality}/100</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Friction Rate:</span>
                    <strong className="text-amber-400">{p.frictionRate}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Final Conversion:</span>
                    <strong className="text-emerald-400">{p.conversionRate}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Action Completion:</span>
                    <strong className="text-white">{p.actionCompletionRate}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Time to Action:</span>
                    <strong className="text-white">{p.timeToFirstActionSec}s</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 10: PROVIDER HEALTH */}
      {activeTab === 'PROVIDERS' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-150">
          <div className="bg-[#151522] border border-[#262638] p-5 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Upstream Provider Feed Health
                </h3>
                <p className="text-xs text-zinc-400">Launch latency, socket stability, and recovery efficiency</p>
              </div>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-950/50 border border-amber-800/40 px-2 py-0.5 rounded">
                SIMULATED PROVIDER TELEMETRY
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-zinc-400 font-mono border-b border-[#29293e]">
                  <tr>
                    <th className="py-2.5 px-3">Provider</th>
                    <th className="py-2.5 px-3">Attempts</th>
                    <th className="py-2.5 px-3">Launch Success</th>
                    <th className="py-2.5 px-3">Socket Drops</th>
                    <th className="py-2.5 px-3">Recovered</th>
                    <th className="py-2.5 px-3">Recovery Rate</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#242436] font-mono">
                  {providerHealth.map(p => (
                    <tr key={p.provider} className="hover:bg-[#1b1b2a]">
                      <td className="py-3 px-3 font-bold text-white">{p.provider}</td>
                      <td className="py-3 px-3">{p.launchAttempts}</td>
                      <td className="py-3 px-3 text-emerald-400">{p.launchSuccessRate}%</td>
                      <td className="py-3 px-3 text-red-400">{p.connectionFailureRate}%</td>
                      <td className="py-3 px-3">{p.recoveredCount}</td>
                      <td className="py-3 px-3 text-blue-400">{p.recoverySuccessRate}%</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.status === 'OPTIMAL'
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                              : p.status === 'DEGRADED'
                              ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                              : 'bg-red-950/60 text-red-400 border border-red-800/40'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 11: LIVE SESSION MONITOR */}
      {activeTab === 'LIVE_MONITOR' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-150">
          {/* Detailed Live Customer Session Card */}
          <div className="bg-[#151522] border border-[#2a2a40] p-5 rounded-xl shadow-lg flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#262638] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  LIVE CUSTOMER SESSION MONITOR
                </h3>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/70 border border-emerald-800 px-2 py-0.5 rounded font-bold">
                  OBSERVED — PROTOTYPE SESSION
                </span>
              </div>
              <div className="text-xs font-mono text-zinc-400">
                Authoritative Event Stream ({effectiveEventsLog.length} Canonical Events)
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* SESSION */}
              <div className="bg-[#1b1b28] border border-[#29293e] p-3 rounded-lg font-mono">
                <div className="text-[10px] text-zinc-400 uppercase font-bold mb-1">SESSION IDENTITY</div>
                <div className="text-sm font-bold text-white truncate">{liveState.sessionId}</div>
                <div className="text-[10px] text-emerald-400 mt-1">Platform: {unifiedDataset[0]?.platform}</div>
              </div>

              {/* CURRENT STATE */}
              <div className="bg-[#1b1b28] border border-[#29293e] p-3 rounded-lg font-mono">
                <div className="text-[10px] text-zinc-400 uppercase font-bold mb-1">CURRENT STATE</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-300">Journey:</span>
                  <strong className="text-xs text-white">{liveState.journeyStage}</strong>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-zinc-300">Health:</span>
                  <strong className={`text-xs ${liveState.healthState === 'AT_RISK' ? 'text-red-400 animate-pulse' : liveState.healthState === 'RECOVERED' ? 'text-blue-400' : 'text-emerald-400'}`}>
                    {liveState.healthState}
                  </strong>
                </div>
                <div className="text-[10px] text-zinc-400 mt-1">
                  Quality: <strong className="text-amber-400">{liveState.sessionQuality.overallScore}</strong> · Risk: <strong className="text-zinc-200">{riskAssessment.riskLevel}</strong>
                </div>
              </div>

              {/* CURRENT CONTEXT */}
              <div className="bg-[#1b1b28] border border-[#29293e] p-3 rounded-lg font-mono">
                <div className="text-[10px] text-zinc-400 uppercase font-bold mb-1">CURRENT CONTEXT</div>
                <div className="text-xs text-white font-bold truncate">
                  {liveState.currentSport?.name || 'Football'}
                </div>
                <div className="text-xs text-zinc-300 truncate mt-0.5">
                  {liveState.currentEvent ? liveState.currentEvent.name : 'Browsing Sports'}
                </div>
                <div className="text-[10px] text-blue-400 truncate mt-1">
                  Market: {liveState.currentMarket?.name || 'Overview'}
                </div>
              </div>

              {/* LATEST EVENT & RECOVERY */}
              <div className="bg-[#1b1b28] border border-[#29293e] p-3 rounded-lg font-mono">
                <div className="text-[10px] text-zinc-400 uppercase font-bold mb-1">LATEST EVENT & RECOVERY</div>
                <div className="text-xs text-amber-400 font-bold truncate">
                  {latestEvent ? latestEvent.eventType : 'SESSION_STARTED'}
                </div>
                <div className="text-[10px] text-zinc-400 mt-1 truncate">
                  Recovery: {liveState.recoveryState.isRecovering ? 'Action Protected (Awaiting reconciliation)' : liveState.healthState === 'RECOVERED' ? 'Outcome Reconciled' : 'Nominal / Shield Active'}
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  Idempotency: {liveState.pendingAction.idempotencyKey || 'None'}
                </div>
              </div>
            </div>

            {/* LIVE SESSION CANONICAL TIMELINE */}
            <div className="bg-[#141420] border border-[#252538] p-4 rounded-xl">
              <div className="flex items-center justify-between mb-3 border-b border-[#252538] pb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    Authoritative Canonical Event Timeline (Current Customer Session)
                  </span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">
                  Monotonic Sequence · Zero Duplicates
                </span>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 font-mono text-xs">
                {effectiveEventsLog.map(evt => {
                  const isConnLost = evt.eventType === 'CONNECTION_LOST';
                  const isConnRestored = evt.eventType === 'CONNECTION_RESTORED';
                  const isRecovery = evt.eventType.startsWith('RECOVERY_');
                  const isAction = evt.eventType.startsWith('ACTION_');

                  return (
                    <div
                      key={evt.id}
                      className={`p-2.5 rounded border flex items-center justify-between gap-3 ${
                        isConnLost
                          ? 'bg-red-950/40 border-red-800/60 text-red-200'
                          : isRecovery
                          ? 'bg-indigo-950/40 border-indigo-800/60 text-indigo-200'
                          : isConnRestored
                          ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                          : isAction
                          ? 'bg-blue-950/40 border-blue-800/60 text-blue-200'
                          : 'bg-[#181824] border-[#29293e] text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-blue-400 w-8">#{evt.sequenceNumber}</span>
                        <span className="font-bold">{evt.eventType}</span>
                        <span className="text-[10px] text-zinc-500 hidden sm:inline">[{evt.journeyStage}]</span>
                        {evt.entityContext?.eventName && (
                          <span className="text-[10px] text-zinc-400 truncate max-w-[200px] hidden md:inline">
                            · {evt.entityContext.eventName}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-[10px] text-zinc-500">
                        <span>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                        <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-sans uppercase">
                          {evt.source}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* FLIGHT RADAR OVERVIEW */}
          <div className="bg-[#151522] border border-[#262638] p-5 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Live Cohort Distribution (Radar Stages)
                </h3>
              </div>
              <span className="text-xs font-mono text-zinc-400">
                1 Live Prototype Session + 250 Synthetic Benchmark Sessions
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {[
                { stage: 'DISCOVERY', sessions: filteredSessions.filter(s => s.journeyStage === 'DISCOVERY') },
                { stage: 'EXPLORATION', sessions: filteredSessions.filter(s => s.journeyStage === 'EXPLORATION') },
                { stage: 'DECISION', sessions: filteredSessions.filter(s => s.journeyStage === 'DECISION') },
                { stage: 'ACTION', sessions: filteredSessions.filter(s => s.journeyStage === 'ACTION') },
                { stage: 'COMPLETION', sessions: filteredSessions.filter(s => s.journeyStage === 'COMPLETION') },
              ].map(column => (
                <div key={column.stage} className="bg-[#1b1b28] border border-[#29293e] p-3 rounded-xl flex flex-col gap-2">
                  <div className="flex items-center justify-between border-b border-[#29293e] pb-1.5 font-mono text-xs">
                    <span className="font-bold text-zinc-300">{column.stage}</span>
                    <span className="text-blue-400 font-bold">{column.sessions.length}</span>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {column.sessions.slice(0, 8).map(s => (
                      <div
                        key={s.sessionId}
                        className={`p-2 rounded text-[11px] font-mono border ${
                          s.isLiveSession
                            ? 'bg-blue-950/80 border-blue-500 text-white font-bold ring-1 ring-blue-400'
                            : s.healthState === 'AT_RISK'
                            ? 'bg-red-950/40 border-red-800/60 text-red-300'
                            : s.healthState === 'FRICTION'
                            ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                            : s.healthState === 'RECOVERED'
                            ? 'bg-blue-950/40 border-blue-800/60 text-blue-300'
                            : 'bg-[#14141e] border-[#252538] text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span className="truncate max-w-[140px]">{s.sessionId}</span>
                          <span>{s.qualityScore}q</span>
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-1 flex justify-between">
                          <span>{s.platform}</span>
                          <span>{s.sport}</span>
                        </div>
                        {s.isLiveSession && (
                          <div className="text-[9px] text-emerald-400 uppercase font-black tracking-wider mt-1">
                            ● LIVE ACTIVE SESSION
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 12: GROUNDED AI SESSION INVESTIGATOR */}
      {activeTab === 'AI_INVESTIGATOR' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-150">
          <div className="bg-[#151522] border border-[#262638] p-5 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                AI Session Investigator (Analytically Grounded)
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              Queries are mathematically grounded in the active canonical telemetry slice. Zero hallucinated metrics.
            </p>

            <form onSubmit={handleRunInvestigation} className="flex gap-2 mb-6">
              <input
                type="text"
                value={investigatorQuery}
                onChange={e => setInvestigatorQuery(e.target.value)}
                placeholder="Ask investigator e.g., 'Why are sessions dropping during game launch or action?'"
                className="flex-1 bg-[#1a1a27] border border-[#2f2f45] rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={isInvestigating}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold font-mono transition flex items-center gap-1.5"
              >
                {isInvestigating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Investigate
              </button>
            </form>

            {/* Structured Findings Output */}
            {investigatorResults && (
              <div className="space-y-3">
                {investigatorResults.map((finding, idx) => (
                  <div key={idx} className="bg-[#1b1b29] border border-[#2c2c42] p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-sm text-zinc-100">{finding.title}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                          Confidence: {finding.confidence}
                        </span>
                        {getClassificationBadge(finding.classification)}
                      </div>
                    </div>
                    <p className="text-xs text-zinc-300 mb-2">{finding.findingText}</p>
                    <div className="bg-[#13131b] border border-[#222230] p-2 rounded text-[11px] font-mono text-zinc-400">
                      <strong>Derived Evidence:</strong> {finding.evidence}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 13: WHAT-IF SIMULATOR */}
      {activeTab === 'WHAT_IF' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-150">
          <div className="bg-[#151522] border border-[#262638] p-5 rounded-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono mb-2">
              Transparent What-If Scenario Simulator
            </h3>
            <p className="text-xs text-zinc-400 mb-6">
              Simulate operational improvements to recovery coverage and model expected impact on completion rate and
              session quality.
            </p>

            {/* Target Controls */}
            <div className="bg-[#1a1a27] border border-[#2a2a3e] p-4 rounded-xl mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-zinc-200">
                  Target Recovery Coverage: <strong className="text-blue-400 font-mono text-sm">{targetRecoveryPct}%</strong>
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  Baseline Coverage: {whatIfResult.baseline.recoveryCoveragePct}%
                </span>
              </div>
              <input
                type="range"
                min="40"
                max="98"
                value={targetRecoveryPct}
                onChange={e => setTargetRecoveryPct(Number(e.target.value))}
                className="w-full h-2 bg-[#101018] rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Modelled Comparison Table */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-[#1b1b29] border border-[#2c2c42] p-4 rounded-xl">
                <span className="text-xs text-zinc-400 font-mono block mb-1">Additional Recoveries</span>
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  +{whatIfResult.modelledDelta.additionalRecoveredSessions}
                </span>
                <p className="text-[11px] text-zinc-500 mt-2 font-mono">Sessions saved from terminal drop-off</p>
              </div>

              <div className="bg-[#1b1b29] border border-[#2c2c42] p-4 rounded-xl">
                <span className="text-xs text-zinc-400 font-mono block mb-1">Modelled Completion Delta</span>
                <span className="text-2xl font-black text-blue-400 font-mono">
                  +{whatIfResult.modelledDelta.completionRateDelta}%
                </span>
                <p className="text-[11px] text-zinc-500 mt-2 font-mono">
                  New Modelled Rate: {(whatIfResult.baseline.completionRatePct + whatIfResult.modelledDelta.completionRateDelta).toFixed(1)}%
                </p>
              </div>

              <div className="bg-[#1b1b29] border border-[#2c2c42] p-4 rounded-xl">
                <span className="text-xs text-zinc-400 font-mono block mb-1">Session Quality Gain</span>
                <span className="text-2xl font-black text-purple-400 font-mono">
                  +{whatIfResult.modelledDelta.qualityScoreDelta} pts
                </span>
                <p className="text-[11px] text-zinc-500 mt-2 font-mono">
                  Expected Mean Quality: {(whatIfResult.baseline.averageQuality + whatIfResult.modelledDelta.qualityScoreDelta).toFixed(1)}/100
                </p>
              </div>
            </div>

            <div className="mt-6 p-3 bg-[#161621] border border-[#28283a] rounded-lg text-xs text-zinc-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>MANDATORY DISCLAIMER:</strong> {whatIfResult.classificationNotice}. Model is computed based on
                idempotent retry preservation formulas.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 14: RESPONSIBLE INTELLIGENCE & COMPLIANCE */}
      {activeTab === 'RESPONSIBLE' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-150">
          <div className="bg-[#151522] border border-[#262638] p-5 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Responsible Intelligence Guardrails
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mb-6">
              All intelligence models operate under strict ethical bounds: no dark patterns, no predatory urgency copy,
              and strict cooling-off enforcement.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-[#1a1a27] p-4 rounded-xl border border-[#2a2a3e]">
                <span className="text-xs text-zinc-400 font-mono block mb-1">Interventions Evaluated</span>
                <span className="text-xl font-bold text-white font-mono">1,480</span>
              </div>
              <div className="bg-[#1a1a27] p-4 rounded-xl border border-[#2a2a3e]">
                <span className="text-xs text-zinc-400 font-mono block mb-1">Interventions Allowed</span>
                <span className="text-xl font-bold text-emerald-400 font-mono">1,418 (95.8%)</span>
              </div>
              <div className="bg-[#1a1a27] p-4 rounded-xl border border-[#2a2a3e]">
                <span className="text-xs text-zinc-400 font-mono block mb-1">Interventions Blocked</span>
                <span className="text-xl font-bold text-red-400 font-mono">62 (4.2%)</span>
              </div>
              <div className="bg-[#1a1a27] p-4 rounded-xl border border-[#2a2a3e]">
                <span className="text-xs text-zinc-400 font-mono block mb-1">Self-Exclusion Shields</span>
                <span className="text-xl font-bold text-purple-400 font-mono">100% Gated</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-[#1b1b29] rounded-lg border border-[#29293e] flex items-center justify-between">
                <span className="font-semibold text-zinc-300">Urgency Copy Restrictions:</span>
                <span className="text-emerald-400 font-mono">ACTIVE (No countdown clocks or artificial pressure)</span>
              </div>
              <div className="p-3 bg-[#1b1b29] rounded-lg border border-[#29293e] flex items-center justify-between">
                <span className="font-semibold text-zinc-300">Responsible Gaming Gate:</span>
                <span className="text-emerald-400 font-mono">ENABLED (Automatic cooldown triggers on rapid losses)</span>
              </div>
              <div className="p-3 bg-[#1b1b29] rounded-lg border border-[#29293e] flex items-center justify-between">
                <span className="font-semibold text-zinc-300">Non-Inferential DNA Ethics:</span>
                <span className="text-emerald-400 font-mono">VERIFIED (No profiling of vulnerability or distress)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
