export type NvetBetaActivationState =
  | 'blocked'
  | 'awaiting-authorization'
  | 'ready-to-enable'
  | 'active'
  | 'paused'
  | 'misconfigured';

export type NvetBetaAuthorizationState =
  | 'MISSING'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'REVOKED'
  | 'CONFLICTED';

export type NvetBetaGateStatus = 'PENDING' | 'VERIFIED' | 'CONFLICTED';
export type NvetBetaEvidenceStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'REVOKED'
  | 'EXPIRED'
  | 'CONFLICTED';

export interface NvetBetaEvidenceGate {
  gate: string;
  status: NvetBetaGateStatus;
  requiredEnvironment: 'production';
  approvedEvidenceCount: number;
  stagingApprovedEvidenceCount: number;
  conflictCount: number;
  expiredCount: number;
  latestApprovedEvidenceId: string | null;
}

export interface NvetBetaEvidenceSummary {
  program: string;
  ledger: 'audit_logs';
  appendOnly: boolean;
  requiredEnvironment: 'production';
  totalGates: number;
  verifiedGates: number;
  pendingGates: number;
  conflictedGates: number;
  eligibleForOperatorActivation: boolean;
  commercialLaunchAuthorized: false;
  gates: NvetBetaEvidenceGate[];
  generatedAt: string;
}

export interface NvetBetaEvidenceRecord {
  evidenceId: string;
  gate: string;
  environment: 'production' | 'staging';
  reference: string;
  referenceSha256: string;
  observedAt: string;
  expiresAt: string | null;
  note: string | null;
  status: NvetBetaEvidenceStatus;
  conflict: boolean;
  conflictReasons: string[];
  submittedAt: string;
  lastEventAt: string;
  eventCount: number;
}

export interface NvetBetaEvidenceHistory {
  program: string;
  appendOnly: boolean;
  evidence: NvetBetaEvidenceRecord[];
  total: number;
  generatedAt: string;
}

export interface NvetBetaCohortMember {
  userId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  emailVerified: boolean;
  accountActive: boolean;
  eligible: boolean;
  invitedAt: string | null;
  legalAccepted: boolean;
  legalAcceptedAt: string | null;
}

export interface NvetBetaCohortSnapshot {
  ledger: 'audit_logs';
  appendOnly: boolean;
  activeMemberships: number;
  eligibleActiveMembers: number;
  ineligibleMembers: number;
  maxInitialClients: number;
  remainingSlots: number;
  withinLimit: boolean;
  configured: boolean;
  members: NvetBetaCohortMember[];
  revokedMemberships: number;
  conflictedMemberships: number;
  generatedAt: string;
}

export interface NvetBetaAuthorizationStatus {
  state: NvetBetaAuthorizationState;
  authorizationId: string | null;
  authorizedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  conflictReasons: string[];
  appendOnly: boolean;
  historicalAuthorizations?: number;
}

export interface NvetBetaActivationPrerequisites {
  eligible: boolean;
  blockers: string[];
  evidenceEligible: boolean;
  verifiedActiveVets: number;
  minimumVerifiedVets: number;
  configuredClients: number;
  eligibleCohortMembers: number;
  ineligibleCohortMembers: number;
  maxInitialClients: number;
  supportConfigured: boolean;
  marketConfigured: boolean;
}

export interface NvetBetaActivationSnapshot {
  status: NvetBetaAuthorizationStatus;
  prerequisites: NvetBetaActivationPrerequisites;
  authorizationRequiredForBooking: true;
  commercialLaunchAuthorized: false;
}

export interface NvetBetaReadinessSnapshot {
  phase: number;
  program: string;
  market: string;
  runtime: {
    closedBetaEnabled: boolean;
    bookingEnabled: boolean;
  };
  activation: {
    state: NvetBetaActivationState;
    machineActivationReady: boolean;
    operatorActivationEligible: boolean;
    authorizationRequired: true;
    authorizationActive: boolean;
    authorizationState: NvetBetaAuthorizationState;
    authorizationExpiresAt: string | null;
    blockingReasons: string[];
    externalEvidenceRequired: true;
    commercialLaunchAuthorized: false;
  };
  promotion: NvetBetaEvidenceSummary & {
    localRuntimeReady: boolean;
    blockingGates: string[];
  };
  authorization: NvetBetaAuthorizationStatus;
  cohort: {
    configured: boolean;
    configuredClients: number;
    eligibleActiveMembers: number;
    ineligibleMembers: number;
    maxInitialClients: number;
    remainingSlots: number;
    withinLimit: boolean;
    ledger: 'audit_logs';
    appendOnly: boolean;
    membershipSource: 'admin-control-plane';
  };
  vetCoverage: {
    verifiedActiveVets: number;
    minimumRequired: number;
    satisfied: boolean;
  };
  legal: {
    termsVersion: string;
    privacyVersion: string;
    effectiveAt: string;
    explicitAcceptanceEnforcedForBooking: boolean;
  };
  support: {
    ownerConfigured: boolean;
    channelConfigured: boolean;
    configured: boolean;
    criticalIncidentTargetMinutes: number;
  };
  localActivationReady: boolean;
  generatedAt: string;
}

export interface NvetBetaOperationsSnapshot {
  readiness: NvetBetaReadinessSnapshot;
  cohort: NvetBetaCohortSnapshot;
  activation: NvetBetaActivationSnapshot;
  evidenceSummary: NvetBetaEvidenceSummary;
  evidenceHistory: NvetBetaEvidenceHistory;
}
