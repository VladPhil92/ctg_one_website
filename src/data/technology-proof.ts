export type ProofStatus = 'LIVE' | 'PARTIAL' | 'IN DEVELOPMENT' | 'ROADMAP';
export type PublicProofStatus = ProofStatus | 'BETA';

export const PUBLIC_PROOF_STATUSES: PublicProofStatus[] = ['LIVE', 'BETA', 'PARTIAL', 'IN DEVELOPMENT', 'ROADMAP'];

export type ProofItem = {
  id: string;
  area: string;
  capability: string;
  status: ProofStatus;
  publicStatus?: PublicProofStatus;
  evidence: string[];
  publicPath?: string;
};

export const TECHNOLOGY_PROOF: ProofItem[] = [
  {
    id: 'identity-auth',
    area: 'Identity',
    capability: 'Authentication, sessions and protected account flows',
    status: 'LIVE',
    evidence: ['Supabase Auth integration', 'Protected dashboard routes', 'Server-side session handling'],
    publicPath: '/registro',
  },
  {
    id: 'data-security',
    area: 'Data & Security',
    capability: 'PostgreSQL transactional data with Row Level Security',
    status: 'LIVE',
    evidence: ['Supabase/PostgreSQL', 'RLS policies', 'Server-side authorization', 'Input validation'],
    publicPath: '/services',
  },
  {
    id: 'investment-platform',
    area: 'Products',
    capability: 'CTG Craft Beer Investment operating model',
    status: 'PARTIAL',
    publicStatus: 'BETA',
    evidence: [
      'Closed-beta participant and admin surfaces implemented',
      'Order, allocation, inventory, ledger and settlement schema/RPCs implemented',
      'Production batch state machine and serialization implemented',
      'Participant withdrawal and server-priced reinvestment request loop implemented with shared spend and target-lot capacity reservations',
      'Finance reinvestment queue exposes bounded review evidence and canonical approve/reject actions without allowing quantity or capital overrides',
      'Operational Golden Journey reconstructs funding, payment, production, inventory, sale/return, settlement and post-settlement liquidity evidence per lot',
      'A clean-database transactional journey certifies sale return, settlement credit, reinvestment and confirmed payout as one conserved economic loop',
      'New external funding is server-gated by authenticated identity, VERIFIED investment KYC, explicit per-lot FUNDING_OPEN state and remaining PostgreSQL capacity; no separate global funding feature flag is claimed',
      'Clean-database migration and Golden Path contracts run in CI',
    ],
    publicPath: '/inversion',
  },
  {
    id: 'delivery-platform',
    area: 'Infrastructure',
    capability: 'Versioned delivery pipeline',
    status: 'LIVE',
    evidence: ['GitHub', 'Pull requests', 'GitHub Actions', 'Critical safety tests', 'Typecheck', 'Next.js production build', 'Render deployment'],
    publicPath: '/technology/status',
  },
  {
    id: 'observability-baseline',
    area: 'Reliability',
    capability: 'Health and structured logging baseline',
    status: 'PARTIAL',
    evidence: ['/api/health', 'Structured JSON logger', 'Sensitive-field redaction', 'Schema compatibility probe'],
    publicPath: '/technology/status',
  },
  {
    id: 'ai-layer',
    area: 'Artificial Intelligence',
    capability: 'Governed AI architecture, RAG design, agent runtime and evaluation model',
    status: 'IN DEVELOPMENT',
    evidence: [
      'Public AI architecture surface',
      'AI governance and human-in-the-loop requirements',
      'Citation-First RAG architecture defined',
      'Agent runtime contract defined',
      'AI evaluation and security models documented',
      'No general-purpose production agent runtime claimed',
    ],
    publicPath: '/ai',
  },
  {
    id: 'ctg-knowledge-v01',
    area: 'Artificial Intelligence',
    capability: 'CTG Knowledge v0.1 authenticated source-grounded RAG pilot',
    status: 'PARTIAL',
    publicStatus: 'BETA',
    evidence: [
      'pgvector migration and RLS policies implemented',
      'Admin-only curated text ingestion endpoint',
      'Authenticated semantic retrieval endpoint',
      'Server-side OpenAI embeddings and Responses integration',
      'Citation metadata returned independently of generated text',
      'Deterministic post-generation citation integrity gate fails closed on missing or fabricated source references',
      'Reproducible evaluation harness implemented; authorized semantic and operating evidence still required for LIVE promotion',
      'Versioned first-party public evaluation corpus and dataset are Git-blob pinned with fail-closed drift validation',
      'Controlled isolated-environment seeding, run capture, human-review, and finalization tooling implemented; first authorized human-reviewed run still pending',
    ],
    publicPath: '/ai',
  },
  {
    id: 'web3',
    area: 'Web3',
    capability: 'CTGO on-chain production utility',
    status: 'ROADMAP',
    evidence: ['Web3 libraries present', 'No verified production contract/network evidence published'],
    publicPath: '/token',
  },
];

export function getCapabilityProof(id: string): ProofItem {
  const item = TECHNOLOGY_PROOF.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Unknown technology capability: ${id}`);
  return item;
}

export function getPublicProofStatus(item: ProofItem): PublicProofStatus {
  return item.publicStatus ?? item.status;
}

export const TECHNICAL_CHANGELOG = [
  { phase: '01', title: 'Credibility hardening', detail: 'Separated verified capabilities from roadmap claims and corrected outdated deployment/security narratives.' },
  { phase: '02', title: 'CTG One OS', detail: 'Formalized the shared technology layer and maturity model across identity, data, transactions, automation, security and intelligence.' },
  { phase: '03', title: 'Products & case studies', detail: 'Introduced evidence-based product case studies with CTG Craft Beer Investment as CASE-001.' },
  { phase: '04', title: 'AI architecture & governance', detail: 'Defined AI boundaries, human-in-the-loop controls, evaluation requirements and promotion criteria.' },
  { phase: '05', title: 'Security, observability & testing', detail: 'Added health checks, structured redacted logging, critical safety invariants, dependency audit thresholds and stronger headers.' },
  { phase: '06', title: 'Ecosystem technology mapping', detail: 'Mapped each business unit to operating problems, CTG One OS modules and verified maturity states.' },
  { phase: '07', title: 'Public technical proof', detail: 'Introduced public status, Labs framework and technical changelog as verifiable evidence surfaces.' },
  { phase: '08', title: 'Production readiness', detail: 'Defined the Render deployment contract, health checks and production verification runbook.' },
  { phase: '09', title: 'AI platform architecture', detail: 'Expanded CTG One AI with Citation-First RAG, agent runtime, risk tiers, evaluation, security and CTG Knowledge product architecture while retaining IN DEVELOPMENT status.' },
  { phase: '10', title: 'CTG Knowledge v0.1', detail: 'Implemented the first authenticated RAG pilot with curated ingestion, pgvector retrieval, server-side model access, grounded answers and structured source metadata; LIVE promotion remains evidence-gated.' },
  { phase: '11', title: 'Grounding integrity hardening', detail: 'Added deterministic post-generation citation validation so CTG Knowledge fails closed when model output lacks citations or references sources that were not supplied for the request.' },
  { phase: '12', title: 'Reproducible AI evaluation', detail: 'Added a provider-independent evaluation harness, synthetic CI fixtures, regression thresholds and explicit separation between test evidence and authorized semantic/operating evidence.' },
  { phase: '13', title: 'Versioned evaluation corpus', detail: 'Added a representative first-party public evaluation corpus and dataset, pinned to exact Git blob identities with fail-closed provenance and drift validation before controlled run capture.' },
  { phase: '14', title: 'Controlled evaluation capture', detail: 'Added explicit-authorized isolated corpus seeding, real query capture, human semantic review worksheets and fail-closed conversion into authorized evaluation evidence; the first authorized human-reviewed run still pending.' },
  { phase: '15', title: 'Participant liquidity loop', detail: 'Closed the participant settlement-to-reinvestment loop with server-priced case intent, shared balance/capacity reservations, immutable participant quantity, cancellation/rejection paths and a participant reinvestment console while retaining BETA status.' },
  { phase: '16', title: 'Finance reinvestment queue', detail: 'Added a bounded Finance OS review queue for pending reinvestments with current KYC, source-credit, spendable-balance and target-lot context, while approvals remain immutable server-side commands.' },
  { phase: '17', title: 'Operational Golden Journey', detail: 'Added a bounded per-lot lifecycle reconstruction and a clean-database transactional journey proving funding, payment, production, sale/return, settlement, reinvestment and confirmed payout as one conserved operating loop.' },
] as const;
