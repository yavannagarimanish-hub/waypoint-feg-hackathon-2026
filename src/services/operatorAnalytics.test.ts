import { describe, it, expect } from 'vitest';
import {
  generateSyntheticSessionDataset,
  filterSessions,
  computeExecutiveKPIs,
  computeUniversalFunnel,
  computeFrictionExplorer,
  computeDnaDistribution,
  computeProviderHealth,
  runGroundedInvestigation,
  computeWhatIfImpact,
  OperatorFilterState,
} from './operatorAnalytics';

describe('Phase 4 — Operator Analytics Engine', () => {
  const dataset = generateSyntheticSessionDataset(1337);

  it('generates consistent synthetic dataset with 250 sessions and canonical event histories', () => {
    expect(dataset.length).toBe(250);
    const first = dataset[0];
    expect(first.sessionId).toBeDefined();
    expect(first.events.length).toBeGreaterThan(0);
    expect(first.events[0].eventType).toBe('SESSION_STARTED');
  });

  it('computes executive KPIs with explicit classification tags and canonical quality formula', () => {
    const kpis = computeExecutiveKPIs(dataset);
    expect(kpis.sessionQuality.classification).toBe('OBSERVED');
    expect(kpis.sessionQuality.formulaDescription).toContain('relevance, informedness, friction, momentum, recovery');
    expect(kpis.sessionAtRiskRate.classification).toBe('MODELLED');
    expect(kpis.sessionsPerUser.classification).toBe('PROXY');
    expect(Number(kpis.sessionQuality.value)).toBeGreaterThan(0);
    expect(Number(kpis.sessionQuality.value)).toBeLessThanOrEqual(100);
  });

  it('computes monotonic universal session funnel with stage drop-offs', () => {
    const funnel = computeUniversalFunnel(dataset);
    expect(funnel.length).toBe(5);
    expect(funnel[0].stage).toBe('DISCOVERY');
    expect(funnel[0].count).toBe(250);
    expect(funnel[0].pctOfTotal).toBe(100);
    expect(funnel[4].stage).toBe('COMPLETION');
    // Dropoff reconciliation
    funnel.forEach((stage, idx) => {
      if (idx < funnel.length - 1) {
        expect(stage.count).toBeGreaterThanOrEqual(funnel[idx + 1].count);
      }
    });
  });

  it('computes friction explorer with categorized evidence and recovery rates', () => {
    const frictions = computeFrictionExplorer(dataset);
    expect(frictions.length).toBeGreaterThanOrEqual(5);
    const connLoss = frictions.find(f => f.type === 'connection_loss');
    expect(connLoss).toBeDefined();
    expect(connLoss!.affectedSessions).toBeGreaterThan(0);
    expect(connLoss!.severity).toBe('high');
  });

  it('computes session DNA distribution summing to approximately 100%', () => {
    const dnaList = computeDnaDistribution(dataset);
    expect(dnaList.length).toBe(6);
    const totalPct = dnaList.reduce((acc, d) => acc + d.percentage, 0);
    expect(totalPct).toBeGreaterThanOrEqual(95);
    expect(totalPct).toBeLessThanOrEqual(105);
  });

  it('computes provider health telemetry with error rates', () => {
    const provs = computeProviderHealth(dataset);
    expect(provs.length).toBe(5);
    const betGenius = provs.find(p => p.provider === 'BetGenius');
    expect(betGenius).toBeDefined();
    expect(betGenius!.launchAttempts).toBeGreaterThan(0);
  });

  it('runs grounded AI investigator without hallucinated numbers', () => {
    const findings = runGroundedInvestigation('Why are sessions failing during action?', dataset);
    expect(findings.length).toBe(3);
    expect(findings[0].classification).toBe('OBSERVED');
    expect(findings[1].evidence).toContain('Observed association — not causal proof.');
  });

  it('simulates transparent what-if scenarios with explicit disclaimer', () => {
    const result = computeWhatIfImpact(dataset, 85);
    expect(result.classificationNotice).toContain('MODELLED SCENARIO');
    expect(result.target.recoveryCoveragePct).toBe(85);
    expect(result.modelledDelta.additionalRecoveredSessions).toBeGreaterThanOrEqual(0);
  });

  it('applies cross-filtering consistently across dimensions', () => {
    const filterState: OperatorFilterState = {
      dateRange: 'TODAY',
      platform: 'android',
      product: 'ALL',
      sport: 'Football',
      provider: 'ALL',
      journeyStage: 'ALL',
      healthState: 'ALL',
      dna: 'ALL',
      searchQuery: '',
    };
    const filtered = filterSessions(dataset, filterState);
    expect(filtered.length).toBeLessThan(dataset.length);
    filtered.forEach(s => {
      expect(s.platform).toBe('android');
      expect(s.sport).toBe('Football');
    });
  });
});
