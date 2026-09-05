/* The canonical fixture graph. One fictional credit-union tenant whose people
   data flows in from the HR systems of record (UKG, Xperience) and is
   provisioned out to three learning platforms (Docebo, LinkedIn Learning,
   Axonify); course completions flow back in and out to analytics (Tableau).
   Everything is generated relative to the anchor time so the cockpit is
   coherent on any day it is opened. All names, people, and hosts are fictional. */

import { daysBefore, hoursBefore, minutesBefore, nowIso } from './clock.js';

export const TENANT_ID = 'tenant_harborline';
export const OTHER_TENANT_ID = 'tenant_other';
export const SEED_VERSION = 4;

const EMPLOYEE_TYPE = 'corporate.employee.v1';
const COURSE_TYPE = 'learning.course.v1';
const TICKET_TYPE = 'corporate.ticket.v1';
const MESSAGE_TYPE = 'corporate.message.v1';

function keyed(items) {
  return Object.fromEntries(items.map((item) => [item.id, item]));
}

/* Deterministic PRNG so the generated history is identical on every boot. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const PROVIDER_DEFINITIONS = [
  { id: 'provider_ukg', name: 'UKG Pro', category: 'HRIS', domain: 'corporate', entityTypes: [EMPLOYEE_TYPE], authType: 'oauth2', host: 'ukg.harborline.example', description: 'Human resources system of record for workers, positions, and terminations.' },
  { id: 'provider_xperience', name: 'Xperience', category: 'HRIS', domain: 'corporate', entityTypes: [EMPLOYEE_TYPE], authType: 'api_key', host: 'xperience.harborline.example', description: 'People and position data for branch and contact-centre staff.' },
  { id: 'provider_docebo', name: 'Docebo', category: 'Learning', domain: 'learning', entityTypes: [EMPLOYEE_TYPE, COURSE_TYPE], authType: 'oauth2', host: 'learn.harborline.example', description: 'Primary learning management system: enrolments, compliance curricula, completions.' },
  { id: 'provider_linkedin_learning', name: 'LinkedIn Learning', category: 'Learning', domain: 'learning', entityTypes: [EMPLOYEE_TYPE, COURSE_TYPE], authType: 'oauth2', host: 'lil.harborline.example', description: 'Professional-development library; learner provisioning and completion reporting.' },
  { id: 'provider_axonify', name: 'Axonify', category: 'Learning', domain: 'learning', entityTypes: [EMPLOYEE_TYPE, COURSE_TYPE], authType: 'api_key', host: 'axonify.harborline.example', description: 'Frontline microlearning for tellers and member-service staff.' },
  { id: 'provider_tableau', name: 'Tableau', category: 'Analytics', domain: 'analytics', entityTypes: [COURSE_TYPE, EMPLOYEE_TYPE], authType: 'basic', host: 'insight.harborline.example', description: 'Training-completion and readiness dashboards for leadership.' },
  { id: 'provider_slack', name: 'Slack', category: 'Chat', domain: 'corporate', entityTypes: [MESSAGE_TYPE], authType: 'oauth2', host: 'slack.harborline.example', description: 'Operational notifications to the learning-operations channel.' },
  { id: 'provider_jira', name: 'Jira Service Management', category: 'Tickets', domain: 'corporate', entityTypes: [TICKET_TYPE], authType: 'api_key', host: 'jira.harborline.example', description: 'Access-request and onboarding tickets raised by provisioning events.' },
  /* Catalog-only providers (available in "Add integration", not yet connected). */
  { id: 'provider_workday', name: 'Workday', category: 'HRIS', domain: 'corporate', entityTypes: [EMPLOYEE_TYPE], authType: 'oauth2', host: 'workday.example', description: 'HCM system of record.' },
  { id: 'provider_successfactors', name: 'SAP SuccessFactors', category: 'HRIS', domain: 'corporate', entityTypes: [EMPLOYEE_TYPE], authType: 'oauth2', host: 'successfactors.example', description: 'HCM and learning suite.' },
  { id: 'provider_cornerstone', name: 'Cornerstone', category: 'Learning', domain: 'learning', entityTypes: [EMPLOYEE_TYPE, COURSE_TYPE], authType: 'oauth2', host: 'cornerstone.example', description: 'Enterprise learning platform.' },
  { id: 'provider_salesforce', name: 'Salesforce', category: 'CRM', domain: 'crm', entityTypes: ['crm.contact.v1'], authType: 'oauth2', host: 'salesforce.example', description: 'Member relationship management.' },
  { id: 'provider_servicenow', name: 'ServiceNow', category: 'Tickets', domain: 'corporate', entityTypes: [TICKET_TYPE], authType: 'oauth2', host: 'servicenow.example', description: 'IT service management.' },
  { id: 'provider_teams', name: 'Microsoft Teams', category: 'Chat', domain: 'corporate', entityTypes: [MESSAGE_TYPE], authType: 'oauth2', host: 'teams.example', description: 'Collaboration notifications.' },
  { id: 'provider_snowflake', name: 'Snowflake', category: 'Analytics', domain: 'analytics', entityTypes: [COURSE_TYPE, EMPLOYEE_TYPE], authType: 'basic', host: 'snowflake.example', description: 'Warehouse extracts.' },
  { id: 'provider_okta', name: 'Okta', category: 'Identity', domain: 'corporate', entityTypes: [EMPLOYEE_TYPE], authType: 'saml', host: 'okta.example', description: 'Identity provider and SCIM source.' },
];

const CONNECTOR_SPECS = [
  { id: 'con_ukg', providerDefinitionId: 'provider_ukg', name: 'UKG Pro · People', role: 'system_of_record', direction: 'inbound', status: 'healthy', scheduleMinutes: 60, validatedMinutesAgo: 42, rotatedDaysAgo: 6, createdDaysAgo: 210 },
  { id: 'con_xperience', providerDefinitionId: 'provider_xperience', name: 'Xperience · Branch staff', role: 'system_of_record', direction: 'inbound', status: 'healthy', scheduleMinutes: 120, validatedMinutesAgo: 95, rotatedDaysAgo: 12, createdDaysAgo: 180 },
  { id: 'con_docebo', providerDefinitionId: 'provider_docebo', name: 'Docebo LMS', role: 'target', direction: 'bidirectional', status: 'healthy', scheduleMinutes: 30, validatedMinutesAgo: 18, rotatedDaysAgo: 3, createdDaysAgo: 200 },
  { id: 'con_linkedin', providerDefinitionId: 'provider_linkedin_learning', name: 'LinkedIn Learning', role: 'target', direction: 'bidirectional', status: 'warning', scheduleMinutes: 240, validatedMinutesAgo: 1_440, rotatedDaysAgo: 87, createdDaysAgo: 150, credentialState: 'reference_expiring' },
  { id: 'con_axonify', providerDefinitionId: 'provider_axonify', name: 'Axonify Frontline', role: 'target', direction: 'bidirectional', status: 'failed', scheduleMinutes: 60, validatedMinutesAgo: 130, rotatedDaysAgo: 9, createdDaysAgo: 120 },
  { id: 'con_tableau', providerDefinitionId: 'provider_tableau', name: 'Tableau · Readiness', role: 'analytics', direction: 'outbound', status: 'healthy', scheduleMinutes: 1_440, validatedMinutesAgo: 380, rotatedDaysAgo: 21, createdDaysAgo: 90 },
  { id: 'con_slack', providerDefinitionId: 'provider_slack', name: 'Slack · #lms-ops', role: 'notifications', direction: 'outbound', status: 'healthy', scheduleMinutes: null, validatedMinutesAgo: 610, rotatedDaysAgo: 30, createdDaysAgo: 160 },
  { id: 'con_jira', providerDefinitionId: 'provider_jira', name: 'Jira · Access requests', role: 'tickets', direction: 'bidirectional', status: 'running', scheduleMinutes: 240, validatedMinutesAgo: 34, rotatedDaysAgo: 15, createdDaysAgo: 75 },
];

const EMPLOYEES = [
  ['entity_emp_ada', 'Ada Moreno', 'Universal Banker · Riverside branch', 'Retail Banking'],
  ['entity_emp_jon', 'Jon Bell', 'Mortgage Loan Officer', 'Lending'],
  ['entity_emp_mina', 'Mina Cho', 'Member Service Representative', 'Member Services'],
  ['entity_emp_theo', 'Theo Park', 'Branch Operations Lead', 'Operations'],
  ['entity_emp_lena', 'Lena Okafor', 'BSA/AML Analyst', 'Compliance'],
  ['entity_emp_sam', 'Sam Whitfield', 'Contact Centre Agent', 'Member Services'],
  ['entity_emp_ines', 'Inés Duarte', 'Teller · Lakeshore branch', 'Retail Banking'],
  ['entity_emp_ravi', 'Ravi Menon', 'IT Support Specialist', 'Information Technology'],
  ['entity_emp_marcus', 'Marcus Hale', 'Teller · Downtown branch', 'Retail Banking'],
  ['entity_emp_yara', 'Yara Haddad', 'Consumer Lending Specialist', 'Lending'],
  ['entity_emp_owen', 'Owen Fitzgerald', 'Fraud Operations Analyst', 'Operations'],
  ['entity_emp_kai', 'Kai Nakamura', 'Learning & Development Partner', 'People'],
];

const COURSES = [
  ['entity_course_bsa', 'BSA / AML Annual Refresher', 'Compliance · required annually'],
  ['entity_course_fair', 'Fair Lending Fundamentals', 'Compliance · lending staff'],
  ['entity_course_cyber', 'Cybersecurity Awareness', 'All staff · quarterly'],
  ['entity_course_cash', 'Teller Cash Handling', 'Retail · new-hire path'],
  ['entity_course_member', 'Member Service Excellence', 'Member Services · onboarding'],
  ['entity_course_mortgage', 'Mortgage Disclosure Rules', 'Lending · TRID module'],
  ['entity_course_fraud', 'Elder Financial Exploitation Signals', 'All branches · annual'],
  ['entity_course_privacy', 'Member Privacy & Data Handling', 'All staff · annual'],
];

const TICKETS = [['entity_ticket_4821', 'Access request · Docebo admin for Kai Nakamura', 'Jira · SD-4821']];
const MESSAGES = [['entity_msg_ops', 'Nightly provisioning summary', 'Slack · #lms-ops']];

const MEMBER_SPECS = [
  { id: 'actor_admin', name: 'Amalia Frost', email: 'amalia.frost@harborline.example', roleId: 'admin', kind: 'member', status: 'active', lastActiveMinutesAgo: 0 },
  { id: 'actor_operator', name: 'Theo Park', email: 'theo.park@harborline.example', roleId: 'operator', kind: 'member', status: 'active', lastActiveMinutesAgo: 12 },
  { id: 'actor_operator2', name: 'Daniel Kerr', email: 'daniel.kerr@harborline.example', roleId: 'operator', kind: 'member', status: 'active', lastActiveMinutesAgo: 190 },
  { id: 'actor_auditor', name: 'Priya Nair', email: 'priya.nair@harborline.example', roleId: 'auditor', kind: 'member', status: 'active', lastActiveMinutesAgo: 140 },
  { id: 'actor_developer', name: 'Marco Vidal', email: 'marco.vidal@harborline.example', roleId: 'developer', kind: 'member', status: 'active', lastActiveMinutesAgo: 1_500 },
  { id: 'actor_invited', name: 'Jo Tran', email: 'jo.tran@harborline.example', roleId: 'operator', kind: 'member', status: 'invited', lastActiveMinutesAgo: null },
  { id: 'actor_service', name: 'Sync worker', email: 'svc-sync@harborline.example', roleId: 'operator', kind: 'service', status: 'active', lastActiveMinutesAgo: 1 },
  { id: 'actor_scim', name: 'Okta SCIM', email: 'svc-scim@harborline.example', roleId: 'developer', kind: 'service', status: 'active', lastActiveMinutesAgo: 4 },
  /* An agent is a first-class actor (engine ADR 013): it holds a role like
     any principal, and every audit event it produces names its run. */
  { id: 'actor_agent', name: 'Provisioning agent', email: 'agent-provisioning@harborline.example', roleId: 'operator', kind: 'agent', status: 'active', lastActiveMinutesAgo: 41 },
];

/* The one agent-initiated run in the history: the provisioning agent previewed
   the write first (engine ADR 014), then ran it under its own run id. */
const AGENT_RUN = { minutesAgo: 41, durationMs: 6_400, agentRunId: 'agent-run-7f3a', source: 'con_ukg', targets: ['con_docebo', 'con_linkedin', 'con_axonify'] };

const SUBSCRIPTION_SPECS = [
  { id: 'sub_ops', name: 'Operations event stream', eventTypes: ['sync.completed', 'sync.target_failed', 'sync.retried'], status: 'active', destination: 'https://hooks.harborline.example/aether/operations', createdDaysAgo: 140 },
  { id: 'sub_hr', name: 'HR provisioning receipts', eventTypes: ['sync.completed'], status: 'active', destination: 'https://hooks.harborline.example/aether/hr-receipts', createdDaysAgo: 96 },
  { id: 'sub_slack', name: 'Slack · #lms-ops alerts', eventTypes: ['sync.target_failed', 'webhook.replayed', 'connector.credential.expiring'], status: 'active', destination: 'https://hooks.harborline.example/slack/lms-ops', createdDaysAgo: 60 },
  { id: 'sub_audit', name: 'Audit archive', eventTypes: ['*'], status: 'paused', destination: 'https://archive.harborline.example/aether/audit', createdDaysAgo: 200 },
];

/* Run recipes: what this tenant actually does, and how often. */
const RUN_RECIPES = [
  { key: 'ukg_provision', operation: 'provision', source: 'con_ukg', targets: ['con_docebo', 'con_linkedin', 'con_axonify'], entityType: EMPLOYEE_TYPE, entities: 'EMPLOYEES', direction: 'outbound', perDay: 1, hourOfDay: 2, batch: [3, 38], failRate: 0.06, triggeredBy: 'schedule' },
  { key: 'xperience_provision', operation: 'provision', source: 'con_xperience', targets: ['con_docebo', 'con_axonify'], entityType: EMPLOYEE_TYPE, entities: 'EMPLOYEES', direction: 'outbound', perDay: 1, hourOfDay: 2.5, batch: [1, 12], failRate: 0.04, triggeredBy: 'schedule' },
  { key: 'ukg_deactivate', operation: 'deactivate', source: 'con_ukg', targets: ['con_docebo', 'con_linkedin', 'con_axonify'], entityType: EMPLOYEE_TYPE, entities: 'EMPLOYEES', direction: 'outbound', perDay: 0.4, hourOfDay: 17, batch: [1, 3], failRate: 0.05, triggeredBy: 'webhook' },
  { key: 'docebo_completions', operation: 'completion', source: 'con_docebo', targets: ['con_tableau'], entityType: COURSE_TYPE, entities: 'COURSES', direction: 'inbound', perDay: 4, hourOfDay: null, batch: [12, 380], failRate: 0.03, triggeredBy: 'schedule' },
  { key: 'lil_completions', operation: 'completion', source: 'con_linkedin', targets: ['con_tableau'], entityType: COURSE_TYPE, entities: 'COURSES', direction: 'inbound', perDay: 1.5, hourOfDay: null, batch: [4, 60], failRate: 0.08, triggeredBy: 'schedule' },
  { key: 'axonify_completions', operation: 'completion', source: 'con_axonify', targets: ['con_tableau'], entityType: COURSE_TYPE, entities: 'COURSES', direction: 'inbound', perDay: 2, hourOfDay: null, batch: [20, 240], failRate: 0.1, triggeredBy: 'schedule' },
  { key: 'jira_tickets', operation: 'ticket_sync', source: 'con_jira', targets: ['con_ukg'], entityType: TICKET_TYPE, entities: 'TICKETS', direction: 'bidirectional', perDay: 1, hourOfDay: 9, batch: [1, 9], failRate: 0.02, triggeredBy: 'schedule' },
  { key: 'slack_notify', operation: 'notify', source: 'con_ukg', targets: ['con_slack'], entityType: MESSAGE_TYPE, entities: 'MESSAGES', direction: 'outbound', perDay: 1, hourOfDay: 3, batch: [1, 1], failRate: 0.01, triggeredBy: 'schedule' },
];

const RECIPE_ENTITIES = {
  EMPLOYEES: EMPLOYEES.map(([id]) => id),
  COURSES: COURSES.map(([id]) => id),
  TICKETS: TICKETS.map(([id]) => id),
  MESSAGES: MESSAGES.map(([id]) => id),
};

const HISTORY_DAYS = 30;

function pick(random, items) {
  return items[Math.floor(random() * items.length)];
}

function between(random, [low, high]) {
  return low + Math.floor(random() * (high - low + 1));
}

function buildHistory(anchor, random) {
  const runs = [];
  const targetOutcomes = [];
  let sequence = 0;
  for (let day = HISTORY_DAYS - 1; day >= 0; day -= 1) {
    for (const recipe of RUN_RECIPES) {
      const occurrences = Math.floor(recipe.perDay) + (random() < recipe.perDay % 1 ? 1 : 0);
      for (let index = 0; index < occurrences; index += 1) {
        const hour = recipe.hourOfDay ?? 7 + random() * 12;
        const minutesAgo = day * 24 * 60 + Math.round((24 - hour) * 60) - Math.round(random() * 25);
        if (minutesAgo < 8) continue; // leave the most recent minutes for the live story
        sequence += 1;
        const id = `run_${String(sequence).padStart(4, '0')}`;
        const startedAt = minutesBefore(anchor, minutesAgo);
        const failed = random() < recipe.failRate;
        const entitiesProcessed = between(random, recipe.batch);
        const durationMs = 900 + entitiesProcessed * between(random, [14, 32]) + Math.round(random() * 800);
        const failedTarget = failed ? pick(random, recipe.targets) : null;
        const outcomeIds = recipe.targets.map((targetId) => {
          const outcomeId = `out_${id}_${targetId}`;
          const isFailed = targetId === failedTarget;
          targetOutcomes.push({
            id: outcomeId,
            tenantId: TENANT_ID,
            runId: id,
            connectorId: targetId,
            status: isFailed ? 'failed' : 'success',
            remoteId: isFailed ? null : `${targetId.replace('con_', '')}_${between(random, [10_000, 99_999])}`,
            errorCode: isFailed ? pick(random, ['PROVIDER_RATE_LIMIT', 'PROVIDER_TIMEOUT', 'SCHEMA_REJECTED']) : null,
            retryable: isFailed,
            retryCount: 0,
          });
          return outcomeId;
        });
        runs.push({
          id,
          tenantId: TENANT_ID,
          connectorId: recipe.source,
          sourceConnectorId: recipe.source,
          targetConnectorIds: [...recipe.targets],
          targetOutcomeIds: outcomeIds,
          canonicalEntityId: pick(random, RECIPE_ENTITIES[recipe.entities]),
          entityType: recipe.entityType,
          operation: recipe.operation,
          direction: recipe.direction,
          status: failed ? 'failed' : 'success',
          entitiesProcessed,
          durationMs,
          p95Ms: 60 + Math.round(random() * 180),
          startedAt,
          completedAt: minutesBefore(anchor, Math.max(0, minutesAgo - Math.ceil(durationMs / 60_000))),
          requestId: `req_${String(sequence).padStart(4, '0')}`,
          idempotencyKey: `idem_${recipe.key}_${String(sequence).padStart(4, '0')}`,
          stage: 'complete',
          triggeredBy: recipe.triggeredBy,
        });
      }
    }
  }

  /* A Jira ticket sync that is running right now, mid provider write. */
  sequence += 1;
  const runningId = `run_${String(sequence).padStart(4, '0')}`;
  targetOutcomes.push({ id: `out_${runningId}_con_ukg`, tenantId: TENANT_ID, runId: runningId, connectorId: 'con_ukg', status: 'running', remoteId: null, errorCode: null, retryable: false, retryCount: 0 });
  runs.push({
    id: runningId, tenantId: TENANT_ID, connectorId: 'con_jira', sourceConnectorId: 'con_jira', targetConnectorIds: ['con_ukg'], targetOutcomeIds: [`out_${runningId}_con_ukg`],
    canonicalEntityId: 'entity_ticket_4821', entityType: TICKET_TYPE, operation: 'ticket_sync', direction: 'bidirectional', status: 'running', entitiesProcessed: 4, durationMs: null, p95Ms: null,
    startedAt: minutesBefore(anchor, 3), completedAt: null, requestId: `req_${String(sequence).padStart(4, '0')}`, idempotencyKey: `idem_jira_tickets_${String(sequence).padStart(4, '0')}`, stage: 'provider_write', triggeredBy: 'schedule',
  });

  /* The agent-initiated provisioning run (previewed, then written by the agent). */
  sequence += 1;
  const agentRunId = `run_${String(sequence).padStart(4, '0')}`;
  const agentEntities = 1;
  const agentOutcomeIds = AGENT_RUN.targets.map((targetId) => {
    const outcomeId = `out_${agentRunId}_${targetId}`;
    targetOutcomes.push({ id: outcomeId, tenantId: TENANT_ID, runId: agentRunId, connectorId: targetId, status: 'success', remoteId: `${targetId.replace('con_', '')}_${between(random, [10_000, 99_999])}`, errorCode: null, retryable: false, retryCount: 0 });
    return outcomeId;
  });
  runs.push({
    id: agentRunId, tenantId: TENANT_ID, connectorId: AGENT_RUN.source, sourceConnectorId: AGENT_RUN.source, targetConnectorIds: [...AGENT_RUN.targets], targetOutcomeIds: agentOutcomeIds,
    canonicalEntityId: pick(random, RECIPE_ENTITIES.EMPLOYEES), entityType: EMPLOYEE_TYPE, operation: 'provision', direction: 'outbound', status: 'success', entitiesProcessed: agentEntities,
    durationMs: AGENT_RUN.durationMs, p95Ms: 142, startedAt: minutesBefore(anchor, AGENT_RUN.minutesAgo), completedAt: minutesBefore(anchor, AGENT_RUN.minutesAgo - 1),
    requestId: `req_${String(sequence).padStart(4, '0')}`, idempotencyKey: `idem_agent_provision_${String(sequence).padStart(4, '0')}`, stage: 'complete', triggeredBy: 'agent', agentRunId: AGENT_RUN.agentRunId,
  });

  runs.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  return { runs, targetOutcomes };
}

const GOVERNANCE_EVENTS = [
  { minutesAgo: 22, actorId: 'actor_admin', action: 'connector.validated', resourceType: 'connector', resourceId: 'con_docebo', detail: 'Credential reference re-validated' },
  { minutesAgo: 75, actorId: 'actor_scim', action: 'scim.user.deprovisioned', resourceType: 'member', resourceId: 'actor_developer', detail: 'Okta lifecycle event · contractor end date' },
  { minutesAgo: 190, actorId: 'actor_operator2', action: 'role.updated', resourceType: 'member', resourceId: 'actor_operator', detail: 'operator → operator (connector grants widened)' },
  { minutesAgo: 320, actorId: 'actor_admin', action: 'member.invited', resourceType: 'member', resourceId: 'actor_invited', detail: 'Invitation sent · role operator' },
  { minutesAgo: 410, actorId: 'actor_service', action: 'connector.credential.expiring', resourceType: 'connector', resourceId: 'con_linkedin', detail: 'Reference expires in 3 days' },
  { minutesAgo: 1_460, actorId: 'actor_auditor', action: 'audit.export.requested', resourceType: 'audit', resourceId: 'export_0091', detail: '30-day export · compliance review' },
  { minutesAgo: 2_900, actorId: 'actor_admin', action: 'connector.credential.rotated', resourceType: 'connector', resourceId: 'con_docebo', detail: 'Reference rotated · previous revoked' },
  { minutesAgo: 4_300, actorId: 'actor_admin', action: 'webhook.subscription.created', resourceType: 'subscription', resourceId: 'sub_slack', detail: 'Slack #lms-ops alerts' },
  { minutesAgo: 8_700, actorId: 'actor_operator', action: 'connector.added', resourceType: 'connector', resourceId: 'con_jira', detail: 'Jira Service Management connected' },
];

function buildAudit(anchor, runs) {
  const events = [];
  const actorForRun = (run) => (run.triggeredBy === 'operator' ? 'actor_operator' : run.triggeredBy === 'agent' ? 'actor_agent' : 'actor_service');
  for (const run of runs.filter((run) => run.status !== 'running')) {
    if (run.triggeredBy === 'agent') {
      // Preview before commit (engine ADR 014): resolved, diffed, nothing written.
      events.push({
        id: `evt_${run.id}_preview`,
        tenantId: TENANT_ID,
        actorId: 'actor_agent',
        actorRunId: run.agentRunId,
        action: 'sync.previewed',
        resourceType: 'run',
        resourceId: run.id,
        requestId: run.requestId,
        runId: run.id,
        createdAt: minutesBefore(run.startedAt, 2),
        detail: `Preview · ${run.targetConnectorIds.length} targets: 2 update, 1 create · no writes performed`,
      });
    }
    events.push({
      id: `evt_${run.id}`,
      tenantId: TENANT_ID,
      actorId: actorForRun(run),
      actorRunId: run.agentRunId ?? null,
      action: run.status === 'failed' ? 'sync.target_failed' : 'sync.completed',
      resourceType: 'run',
      resourceId: run.id,
      requestId: run.requestId,
      runId: run.id,
      createdAt: run.completedAt ?? run.startedAt,
      detail: run.status === 'failed' ? `${run.targetOutcomeIds.length} targets · 1 failed` : `${run.entitiesProcessed} ${run.entityType.split('.')[1]} records${run.agentRunId ? ` · agent run ${run.agentRunId}` : ''}`,
    });
  }
  GOVERNANCE_EVENTS.forEach((event, index) => {
    events.push({
      id: `evt_gov_${String(index + 1).padStart(2, '0')}`,
      tenantId: TENANT_ID,
      requestId: `req_gov_${String(index + 1).padStart(2, '0')}`,
      runId: null,
      createdAt: minutesBefore(anchor, event.minutesAgo),
      ...event,
    });
  });
  events.push({ id: 'evt_other_tenant', tenantId: OTHER_TENANT_ID, actorId: 'actor_other', action: 'connector.validated', resourceType: 'connector', resourceId: 'con_other', requestId: 'req_other', runId: null, createdAt: minutesBefore(anchor, 10), detail: 'Control record for tenant isolation' });
  events.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return events;
}

function buildDeliveries(anchor, auditEvents, random) {
  const subscriptions = SUBSCRIPTION_SPECS;
  const deliveries = [];
  const attempts = [];
  const deadLetters = [];
  const recent = auditEvents.filter((event) => event.tenantId === TENANT_ID && event.runId && Date.parse(event.createdAt) >= Date.parse(hoursBefore(anchor, 36)));
  recent.forEach((event, index) => {
    for (const subscription of subscriptions.filter(({ status, eventTypes }) => status === 'active' && (eventTypes.includes('*') || eventTypes.includes(event.action)))) {
      const id = `delivery_${event.runId}_${subscription.id}`;
      const exhausted = index === 4 && subscription.id === 'sub_hr';
      const retried = !exhausted && random() < 0.18;
      const attemptIds = [];
      const attemptCount = exhausted ? 3 : retried ? 2 : 1;
      for (let attempt = 1; attempt <= attemptCount; attempt += 1) {
        const attemptId = `attempt_${id}_${attempt}`;
        const lastAttempt = attempt === attemptCount;
        attempts.push({
          id: attemptId,
          tenantId: TENANT_ID,
          deliveryId: id,
          attempt,
          status: exhausted || !lastAttempt ? 'failed' : 'success',
          responseCode: exhausted ? 503 : lastAttempt ? 202 : 429,
          createdAt: minutesBefore(event.createdAt, -(attempt - 1) * 2),
        });
        attemptIds.push(attemptId);
      }
      deliveries.push({
        id,
        tenantId: TENANT_ID,
        eventId: event.id,
        runId: event.runId,
        requestId: event.requestId,
        subscriptionId: subscription.id,
        payloadId: `payload_${event.runId}_${subscription.id}`,
        status: exhausted ? 'failed' : 'success',
        attemptIds,
        createdAt: event.createdAt,
      });
      if (exhausted) {
        deadLetters.push({ id: 'dlq_hist_1', tenantId: TENANT_ID, deliveryId: id, eventId: event.id, reason: 'Attempts exhausted after upstream 503 from the HR receipts endpoint', createdAt: minutesBefore(event.createdAt, -6) });
      }
    }
  });
  return { deliveries, attempts, deadLetters };
}

function buildMetering(runs) {
  return runs
    .filter((run) => run.status === 'success')
    .map((run) => ({
      id: `meter_${run.id}`,
      tenantId: TENANT_ID,
      sourceEventId: `evt_${run.id}`,
      connectorId: run.connectorId,
      metric: 'entities.synced',
      quantity: run.entitiesProcessed,
      createdAt: run.completedAt ?? run.startedAt,
    }));
}

export function createSeedState({ now } = {}) {
  const anchor = nowIso(now);
  const random = mulberry32(20260910);

  const tenants = [
    { id: TENANT_ID, name: 'Harborline Federal Credit Union', shortName: 'Harborline FCU', plan: 'Enterprise', entityLimit: 250_000, region: 'us-east', createdAt: daysBefore(anchor, 214) },
    { id: OTHER_TENANT_ID, name: 'Northstar Labs', shortName: 'Northstar', plan: 'Core', entityLimit: 15_000, region: 'us-west', createdAt: daysBefore(anchor, 40) },
  ];

  const connectors = CONNECTOR_SPECS.map((spec) => ({
    id: spec.id,
    tenantId: TENANT_ID,
    providerDefinitionId: spec.providerDefinitionId,
    name: spec.name,
    role: spec.role,
    status: spec.status,
    direction: spec.direction,
    enabled: true,
    credentialState: spec.credentialState ?? 'reference_valid',
    validatedAt: minutesBefore(anchor, spec.validatedMinutesAgo),
    credentialRotatedAt: daysBefore(anchor, spec.rotatedDaysAgo),
    scheduleMinutes: spec.scheduleMinutes,
    createdAt: daysBefore(anchor, spec.createdDaysAgo),
  }));
  connectors.push({ id: 'con_other', tenantId: OTHER_TENANT_ID, providerDefinitionId: 'provider_docebo', name: 'Other Tenant LMS', role: 'target', status: 'healthy', direction: 'inbound', enabled: true, credentialState: 'reference_valid', validatedAt: minutesBefore(anchor, 12), credentialRotatedAt: daysBefore(anchor, 4), scheduleMinutes: 60, createdAt: daysBefore(anchor, 30) });

  const canonicalEntities = [
    ...EMPLOYEES.map(([id, displayName, subtitle, department]) => ({ id, tenantId: TENANT_ID, type: EMPLOYEE_TYPE, displayName, subtitle, attributes: { department, employmentStatus: id === 'entity_emp_marcus' ? 'terminated' : 'active' } })),
    ...COURSES.map(([id, displayName, subtitle]) => ({ id, tenantId: TENANT_ID, type: COURSE_TYPE, displayName, subtitle, attributes: { required: subtitle.includes('required') || subtitle.includes('annual') } })),
    ...TICKETS.map(([id, displayName, subtitle]) => ({ id, tenantId: TENANT_ID, type: TICKET_TYPE, displayName, subtitle, attributes: {} })),
    ...MESSAGES.map(([id, displayName, subtitle]) => ({ id, tenantId: TENANT_ID, type: MESSAGE_TYPE, displayName, subtitle, attributes: {} })),
    { id: 'entity_emp_live', tenantId: TENANT_ID, type: EMPLOYEE_TYPE, displayName: 'Priya Raman', subtitle: 'Universal Banker · Riverside branch (new hire)', attributes: { department: 'Retail Banking', employmentStatus: 'active', startDate: daysBefore(anchor, -3) } },
  ];

  const history = buildHistory(anchor, random);
  const entityLinks = [];
  for (const employee of EMPLOYEES) {
    for (const targetId of ['con_docebo', 'con_linkedin', 'con_axonify']) {
      if (employee[0] === 'entity_emp_marcus' && targetId === 'con_axonify') continue;
      entityLinks.push({ id: `link_${employee[0]}_${targetId}`, tenantId: TENANT_ID, canonicalEntityId: employee[0], connectorId: targetId, remoteId: `${targetId.replace('con_', '')}_${employee[0].replace('entity_emp_', '')}`, matchMethod: 'deterministic_email' });
    }
    entityLinks.push({ id: `link_${employee[0]}_con_ukg`, tenantId: TENANT_ID, canonicalEntityId: employee[0], connectorId: 'con_ukg', remoteId: `ukg_${between(random, [100_000, 999_999])}`, matchMethod: 'provider_identity' });
  }

  const auditEvents = buildAudit(anchor, history.runs);
  const deliveries = buildDeliveries(anchor, auditEvents, random);
  const meteringEvents = buildMetering(history.runs);

  const dependencies = [
    { id: 'dep_postgres', tenantId: TENANT_ID, name: 'postgres', label: 'Operation journal (Postgres)', status: 'healthy', latencyMs: 4, detail: 'Sync journal, entity links, audit log' },
    { id: 'dep_temporal', tenantId: TENANT_ID, name: 'temporal', label: 'Workflow engine (Temporal)', status: 'healthy', latencyMs: 11, detail: 'Durable multi-target sync workflows' },
    { id: 'dep_kms', tenantId: TENANT_ID, name: 'kms (per-tenant)', label: 'Credential references (KMS)', status: 'healthy', latencyMs: 8, detail: 'Tenant-scoped secret references' },
    { id: 'dep_event_delivery', tenantId: TENANT_ID, name: 'nats-listener', label: 'Event delivery (NATS)', status: 'warning', latencyMs: 184, detail: 'Webhook fan-out and retry scheduling · reconnecting' },
    { id: 'dep_ratelimit', tenantId: TENANT_ID, name: 'redis-ratelimit', label: 'Provider rate limiting (Redis)', status: 'healthy', latencyMs: 2, detail: 'Per-provider token buckets' },
  ];

  const members = MEMBER_SPECS.map((spec) => ({ ...spec, tenantId: TENANT_ID, lastActiveAt: spec.lastActiveMinutesAgo == null ? null : minutesBefore(anchor, spec.lastActiveMinutesAgo), invitedAt: spec.status === 'invited' ? minutesBefore(anchor, 320) : null }));

  return {
    seedVersion: SEED_VERSION,
    anchorTime: anchor,
    activeTenantId: TENANT_ID,
    activePersonaId: 'admin',
    scenario: 'default',
    theme: 'light',
    density: 'roomy',
    autopilot: true,
    tenants: keyed(tenants),
    providerDefinitions: keyed(PROVIDER_DEFINITIONS),
    connectors: keyed(connectors),
    connectorOrder: connectors.map(({ id }) => id),
    canonicalEntities: keyed(canonicalEntities),
    entityLinks: keyed(entityLinks),
    runs: keyed(history.runs),
    runOrder: history.runs.map(({ id }) => id),
    targetOutcomes: keyed(history.targetOutcomes),
    auditEvents: keyed(auditEvents),
    auditOrder: auditEvents.map(({ id }) => id),
    webhookSubscriptions: keyed(SUBSCRIPTION_SPECS.map((spec) => ({ id: spec.id, tenantId: TENANT_ID, name: spec.name, eventTypes: spec.eventTypes, status: spec.status, secretState: 'write_only', destination: spec.destination, createdAt: daysBefore(anchor, spec.createdDaysAgo) }))),
    deliveries: keyed(deliveries.deliveries),
    deliveryOrder: deliveries.deliveries.map(({ id }) => id),
    deliveryAttempts: keyed(deliveries.attempts),
    deadLetters: keyed(deliveries.deadLetters),
    deadLetterOrder: deliveries.deadLetters.map(({ id }) => id),
    meteringEvents: keyed(meteringEvents),
    dependencies: keyed(dependencies),
    runtime: { service: 'aether-control-plane', engine: 'Pro · Temporal', region: 'us-east', startedAt: hoursBefore(anchor, 14 * 24 + 6), buildLabel: 'showcase-local' },
    members: keyed(members),
    scim: { tenantId: TENANT_ID, provider: 'Okta', endpoint: '/scim/v2/Users', tokenState: 'write_only', lastProvisionedAt: minutesBefore(anchor, 4), mappings: [['userName', 'email'], ['name.givenName', 'firstName'], ['name.familyName', 'lastName'], ['active', 'status'], ['roles[]', 'roleId']] },
    liveIds: {
      requestId: 'req_live_harborline_001',
      runId: 'run_live_harborline_001',
      eventId: 'evt_live_harborline_001',
      deliveryId: 'delivery_live_harborline_001',
      deadLetterId: 'dlq_live_harborline_001',
      payloadId: 'payload_live_harborline_001',
      idempotencyKey: 'idem_live_harborline_001',
      subscriptionId: 'sub_hr',
      canonicalEntityId: 'entity_emp_live',
      sourceConnectorId: 'con_ukg',
      targetConnectorIds: ['con_docebo', 'con_linkedin', 'con_axonify'],
      faultConnectorId: 'con_axonify',
    },
    lastDeniedPermission: null,
  };
}
