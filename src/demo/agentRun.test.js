import { describe, expect, it } from 'vitest';
import { actorLabel } from '../features/runs/runFormat';
import { buildState } from '../test/fixture-builders';
import { createSeedState } from './seed';

/* Agents as governed actors (engine ADR 013 + 014). The fixture graph carries
   one agent-initiated provisioning run whose preview and completion are audited
   under the agent actor with the agent's run id — the demo's engine-backed row. */

function agentFixture() {
  const state = createSeedState({ now: Date.now() });
  const agent = state.members.actor_agent;
  const run = Object.values(state.runs).find((candidate) => candidate.triggeredBy === 'agent');
  const events = Object.values(state.auditEvents).filter((event) => event.actorId === 'actor_agent');
  return { state, agent, run, events };
}

describe('agent-initiated run', () => {
  it('seeds an agent actor as a first-class member kind', () => {
    const { agent } = agentFixture();
    expect(agent).toBeTruthy();
    expect(agent.kind).toBe('agent');
    expect(agent.status).toBe('active');
    expect(agent.roleId).toBe('operator');
  });

  it('seeds exactly one completed provisioning run triggered by the agent', () => {
    const { run, state } = agentFixture();
    expect(run).toBeTruthy();
    expect(run.status).toBe('success');
    expect(run.operation).toBe('provision');
    expect(run.sourceConnectorId).toBe('con_ukg');
    expect(run.targetConnectorIds).toEqual(['con_docebo', 'con_linkedin', 'con_axonify']);
    expect(run.agentRunId).toMatch(/^agent-run-/);
    expect(Object.values(state.runs).filter((candidate) => candidate.triggeredBy === 'agent')).toHaveLength(1);
    // Metered like any other successful run.
    expect(state.meteringEvents[`meter_${run.id}`]).toBeTruthy();
  });

  it('audits the preview and the completion under the agent with its run id', () => {
    const { run, events } = agentFixture();
    const byAction = Object.fromEntries(events.map((event) => [event.action, event]));
    expect(Object.keys(byAction).sort()).toEqual(['sync.completed', 'sync.previewed']);
    for (const event of events) {
      expect(event.runId).toBe(run.id);
      expect(event.requestId).toBe(run.requestId);
      expect(event.actorRunId).toBe(run.agentRunId);
    }
    expect(Date.parse(byAction['sync.previewed'].createdAt)).toBeLessThan(Date.parse(byAction['sync.completed'].createdAt));
    expect(byAction['sync.previewed'].detail).toMatch(/no writes/i);
  });

  it('labels the run actor as the agent, not the scheduler or a member', () => {
    const { state, run } = agentFixture();
    expect(actorLabel(state, run)).toBe('Provisioning agent');
  });

  it('keeps the graph coherent with the agent run present', () => {
    // buildState runs validateFixtureGraph and throws on any referential error.
    expect(() => buildState()).not.toThrow();
  });
});
