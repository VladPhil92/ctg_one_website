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
      'Public registration and funding remain fail-closed behind feature flags',
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
      'LIVE promotion still requires reproducible semantic evaluation and operating evidence',
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
] as const;
