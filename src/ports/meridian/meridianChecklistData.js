export const MERIDIAN_SECTIONS = [
  {
    id: 's1',
    num: 1,
    title: 'Smoke Setup',
    short: 'Setup',
    items: [
      { id: 'p1', text: 'Smoke environment or Vercel preview URL is open and recorded in Smoke Session.' },
      { id: 'p2', text: 'Hybrid trial access is detected for the scoped tester: `state.hybridAccessConfirmed === true` is visible via widget console log or monitor panel header.' },
      { id: 'p3', text: 'Broad non-hybrid bookmarklet remains manual-first; passive case-start remains off.' },
      { id: 'p4', text: 'Monitor panel loads without error - no red banners, no uncaught exceptions in browser console.' },
      { id: 'p5', text: 'Precision panel correctly handles an RPC failure - does NOT show a false empty-state; error state is visually distinct from genuine no-data.' },
    ],
  },
  {
    id: 's2',
    num: 2,
    title: 'Resolved Case Smoke',
    short: 'Resolved',
    items: [
      { id: 'r1', text: 'Manually start and track a case in Meridian (manual `case_start` only - passive case-start remains off).' },
      { id: 'r2', text: 'Resolve the same case in Salesforce (case status -> Resolved).' },
      { id: 'r3', text: 'Meridian silently closes the tracked case - no agent action required.' },
      { id: 'r4', text: 'No toast, card, banner, or extra UI appears in the widget during or after auto-close.' },
      { id: 'r5', text: 'Supabase check: `case_events` row exists with `type = "resolved"` for the test case.' },
      { id: 'r6', text: 'Supabase check: same `case_events` row has `source = "passive_auto"`.' },
      { id: 'r7', text: 'Linked row in `case_outcome_observations` reflects the passive auto-close: observation is linked to the passive `case_events` row for the same test case.' },
      { id: 'r8', text: 'Monitor panel reflects the passive close - event appears in monitor log and/or count updates correctly.' },
    ],
  },
  {
    id: 's3',
    num: 3,
    title: 'Reclassified Case Smoke',
    short: 'Reclass',
    items: [
      { id: 'rc1', text: 'Manually start and track a different case in Meridian.' },
      { id: 'rc2', text: 'Reclassify the same case in Salesforce (type/subtype change that triggers the reclassification detection path).' },
      { id: 'rc3', text: 'Meridian silently closes the tracked case via passive detection - no agent action required.' },
      { id: 'rc4', text: 'Supabase check: `case_events` row exists with `type = "reclassified"` for the test case.' },
      { id: 'rc5', text: 'Supabase check: same `case_events` row has `source = "passive_auto"`.' },
      { id: 'rc6', text: 'Linked row in `case_outcome_observations` reflects the passive auto-close: observation is linked to the passive `case_events` row for the same test case.' },
      { id: 'rc7', text: 'Monitor panel reflects the passive close for the reclassified case.' },
    ],
  },
  {
    id: 's4',
    num: 4,
    title: 'Complete-during-reclassification Guard',
    short: 'Complete guard',
    items: [
      { id: 'cg1', text: 'Manually start and track a case that can hit Complete while reclassification handling is in progress.' },
      { id: 'cg2', text: 'Trigger the Complete-during-reclassification path using the live widget/Salesforce workflow or the approved smoke repro path.' },
      { id: 'cg3', text: '`reclass_in_progress_at_complete` guard blocks unsafe passive auto-close while reclassification is still in progress.' },
      { id: 'cg4', text: 'No duplicate or incorrect production `case_events` close row is created during the guarded window.' },
      { id: 'cg5', text: 'Widget and monitor state remain coherent after the reclassification path settles.' },
    ],
  },
  {
    id: 's5',
    num: 5,
    title: 'Low-confidence / Shadow-only Smoke',
    short: 'Shadow',
    items: [
      { id: 'lc1', text: 'Trigger or observe a low-confidence or non-promoted candidate (confidence below promotion threshold).' },
      { id: 'lc2', text: 'Shadow outcome row may be recorded in `case_outcome_observations`, but the observation is not linked to a passive `case_events` close row.' },
      { id: 'lc3', text: 'No production close happens for this candidate - no `case_events` row written with `source = "passive_auto"`.' },
      { id: 'lc4', text: 'Tracked case remains open in Meridian - low-confidence signal did NOT trigger an auto-close.' },
    ],
  },
  {
    id: 's6',
    num: 6,
    title: 'No-tracked-case Safety Smoke',
    short: 'Safety',
    items: [
      { id: 'nt1', text: 'Observe passive detection firing for a case that is NOT currently in `state.cases` (not tracked in this session).' },
      { id: 'nt2', text: 'No production close happens - no `case_events` write, no session state change for the untracked case.' },
      { id: 'nt3', text: 'Safety invariant confirmed: passive detection can only close a case that is actively tracked. No tracked case -> close nothing.' },
    ],
  },
  {
    id: 's7',
    num: 7,
    title: 'Regression Checks',
    short: 'Regression',
    items: [
      { id: 'rg1', text: 'Manual Resolve still works end-to-end - agent-triggered resolve logs a `case_events` row correctly; no regression from PR #7.' },
      { id: 'rg2', text: 'Manual Reclassify still works end-to-end - agent-triggered reclassification logs correctly.' },
      { id: 'rg3', text: 'Passive case-start remains off - manual case-start is still the only mechanism that adds a case to `state.cases`.' },
      { id: 'rg4', text: 'A non-hybrid or out-of-trial user does NOT auto-close: `PASSIVE_CLOSE_LIVE = false` and the `hybridAccessConfirmed` gate both block non-trial users.' },
      { id: 'rg5', text: 'Monitor / error UI correctly distinguishes RPC failure from genuine no-data - different error states render differently; no false positives.' },
    ],
  },
];

export const MERIDIAN_DECISION_OPTS = [
  { id: 'keep', cls: 'sel-keep', label: 'Ready - Keep Scoped Trial On', desc: 'All critical paths pass. Trial continues with PR #7 live.' },
  { id: 'rollback', cls: 'sel-rollback', label: 'Roll Back Scoped Trial', desc: 'Critical failure found. Revert HYBRID_AUTO_CLOSE_LIVE to false.' },
  { id: 'fix', cls: 'sel-fix', label: 'Needs Fix Before Continuing', desc: 'Blocked or failed items require resolution first. Trial paused.' },
];

export const MERIDIAN_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'attention', label: 'Needs attention' },
  { id: 'complete', label: 'Passed' },
];

export const MERIDIAN_AUDIT_OPTS = [
  { id: 'not-run', cls: 'audit-not-run', label: 'Not run', desc: 'Fresh clone audit has not been recorded.' },
  { id: 'ready', cls: 'audit-ready', label: 'READY FOR DAVIS-ONLY SMOKE', desc: 'Fresh clone audit returned a ready verdict.' },
  { id: 'hold', cls: 'audit-hold', label: 'HOLD - BLOCKER FOUND', desc: 'Fresh clone audit found a blocker.' },
];

export const MERIDIAN_RUN_FIELDS = [
  { key: 'tester', label: 'Tester', placeholder: 'Davis / tester name' },
  { key: 'environmentUrl', label: 'Environment URL', placeholder: 'Vercel preview or deployed URL' },
];

export const MERIDIAN_ITEM_FIELD_DEFS = [
  { key: 'caseNumber', label: 'Case #', placeholder: 'CT case number' },
  { key: 'evidenceLink', label: 'Evidence link', placeholder: 'Screenshot, admin, PR, or log link' },
  { key: 'testedAt', label: 'Timestamp', placeholder: 'Auto-filled on status change' },
];

export const MERIDIAN_SMOKE_RECORD_SECTIONS = [
  {
    title: 'Containment boundary',
    items: [
      '`PASSIVE_CLOSE_LIVE = false` remains the broad passive close kill switch.',
      '`HYBRID_AUTO_CLOSE_LIVE = true` enables only the scoped hybrid trial path.',
      '`state.hybridAccessConfirmed === true` is required before production auto-close writes.',
      'Source-code, schema, migration, harness, and feature-flag verification belongs in the copied Fresh Clone Audit Prompt, not this live smoke checklist.',
    ],
  },
  {
    title: 'Critical outcome paths',
    items: [
      'Resolved case auto-close smoke.',
      'Reclassified case auto-close smoke.',
      '`reclass_in_progress_at_complete` guard for Complete-during-reclassification safety.',
      'Low-confidence shadow-only behavior.',
      'No-tracked-case close-nothing safety.',
    ],
  },
  {
    title: 'Deployment separation',
    items: [
      'Human review, PR approval, merge, deployment, and post-deploy smoke remain separate gates.',
      'Rollback sets `PASSIVE_CLOSE_LIVE = false` and `HYBRID_AUTO_CLOSE_LIVE = false`.',
      'This artifact is approved as the human smoke record, not broad passive-close readiness evidence.',
    ],
  },
];
