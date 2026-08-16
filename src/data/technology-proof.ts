export type ProofStatus = 'LIVE' | 'PARTIAL' | 'IN DEVELOPMENT' | 'ROADMAP';

export type ProofItem = {
  id: string;
  area: string;
  capability: string;
  status: ProofStatus;
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
    status: 'LIVE',
    evidence: ['Production batches', 'Allocations', 'Inventory', 'Ledger', 'Settlements', 'Participant/admin surfaces'],
    publicPath: '/products',
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
    evidence: ['/api/health', 'Structured JSON logger', 'Sensitive-field redaction'],
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
      'No general production model/RAG/agent runtime claimed',
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
] as const;
