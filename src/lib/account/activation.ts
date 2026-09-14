import type { KycStatus } from '@/types/domain';
import type { FunnelServiceKey } from '@/lib/analytics/funnel';

export type EducationActivationState = 'loading' | 'ready' | 'error';

export type EducationActivationSummary = {
  state: EducationActivationState;
  activeEntitlements: number;
  activeLearning: number;
  pendingOrders: number;
  topLearning: {
    title: string;
    progressPercent: number;
    continuePath: string;
  } | null;
};

export type AccountActivationInput = {
  hasProfile: boolean;
  hasCompleteProfile: boolean;
  kycStatus: KycStatus;
  walletReady: boolean;
  transactionCount: number;
  investmentAllocationCount: number;
  education: EducationActivationSummary;
};

export type AccountActivationAction = {
  key: 'profile' | 'identity' | 'wallet' | 'education' | 'investment' | 'activity' | 'discover';
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  serviceKey: FunnelServiceKey | null;
};

export type AccountActivationPlan = {
  phase: 'setup' | 'activate' | 'engage' | 'return';
  headline: string;
  summary: string;
  primary: AccountActivationAction;
  secondary: AccountActivationAction[];
  completedMilestones: number;
  totalMilestones: number;
  progressPercent: number;
};

const action = (
  key: AccountActivationAction['key'],
  eyebrow: string,
  title: string,
  description: string,
  href: string,
  cta: string,
  serviceKey: FunnelServiceKey | null,
): AccountActivationAction => ({ key, eyebrow, title, description, href, cta, serviceKey });

const PROFILE_ACTION = action(
  'profile',
  'Completa la base',
  'Termina de configurar tu identidad CTG One',
  'Completa los datos básicos de tu cuenta antes de activar otras capacidades.',
  '/dashboard/kyc',
  'Completar perfil',
  'identity',
);

const IDENTITY_ACTION = action(
  'identity',
  'Siguiente paso recomendado',
  'Verifica tu identidad',
  'La verificación conecta tu cuenta con las capacidades que requieren una identidad confiable.',
  '/dashboard/kyc',
  'Verificar identidad',
  'identity',
);

const IDENTITY_REVIEW_ACTION = action(
  'identity',
  'Requiere atención',
  'Revisa tu verificación de identidad',
  'Tu verificación necesita una corrección antes de continuar con capacidades protegidas.',
  '/dashboard/kyc',
  'Revisar identidad',
  'identity',
);

const IDENTITY_PENDING_ACTION = action(
  'identity',
  'Verificación en curso',
  'Tu identidad está siendo revisada',
  'Mientras finaliza la revisión puedes explorar capacidades que no requieren una nueva validación financiera.',
  '/dashboard/educacion',
  'Explorar educación',
  'education_library',
);

const WALLET_ACTION = action(
  'wallet',
  'Activa tu centro financiero',
  'Abre tu Wallet CTG One',
  'Centraliza saldo y actividad habilitada bajo la misma identidad que ya verificaste.',
  '/dashboard/wallet',
  'Abrir Wallet',
  'wallet',
);

const EDUCATION_DISCOVERY_ACTION = action(
  'education',
  'Primera experiencia de valor',
  'Explora tu espacio educativo',
  'Puedes comenzar por cursos, recursos y experiencias educativas sin convertir el dashboard en una lista genérica de productos.',
  '/dashboard/educacion',
  'Abrir Education OS',
  'education_library',
);

const INVESTMENT_ACTION = action(
  'investment',
  'Tu capital está activo',
  'Revisa tus participaciones',
  'Consulta el estado de tus participaciones y el seguimiento operativo asociado a tu cuenta.',
  '/inversion/app',
  'Ver inversiones',
  'investment',
);

const ACTIVITY_ACTION = action(
  'activity',
  'Tu cuenta ya está en uso',
  'Revisa tu actividad reciente',
  'Vuelve sobre movimientos y acciones recientes para mantener el control de tu cuenta.',
  '/dashboard/wallet',
  'Ver actividad',
  'wallet',
);

const DISCOVER_ACTION = action(
  'discover',
  'Cuenta activada',
  'Elige tu próxima experiencia CTG One',
  'Tu configuración esencial está completa. Explora únicamente productos y servicios disponibles para seguir generando valor.',
  '/products',
  'Explorar experiencias',
  null,
);

function continueLearningAction(education: EducationActivationSummary): AccountActivationAction | null {
  if (!education.topLearning) return null;
  return action(
    'education',
    'Continúa donde quedaste',
    education.topLearning.title,
    `Tienes un curso en progreso al ${education.topLearning.progressPercent}%. Retoma tu aprendizaje desde la última actividad registrada.`,
    education.topLearning.continuePath,
    'Continuar aprendiendo',
    'education_learning_center',
  );
}

export function buildAccountActivationPlan(input: AccountActivationInput): AccountActivationPlan {
  const educationReady = input.education.state === 'ready';
  const hasEducationValue = educationReady && (input.education.activeEntitlements > 0 || input.education.activeLearning > 0);
  const hasInvestmentValue = input.investmentAllocationCount > 0;
  const hasTransactionValue = input.transactionCount > 0;

  const milestones = [
    input.hasProfile,
    input.hasCompleteProfile,
    input.kycStatus === 'verified',
    input.walletReady,
    hasEducationValue || hasInvestmentValue || hasTransactionValue,
  ];
  const completedMilestones = milestones.filter(Boolean).length;
  const totalMilestones = milestones.length;
  const progressPercent = Math.round((completedMilestones / totalMilestones) * 100);

  let phase: AccountActivationPlan['phase'] = 'activate';
  let headline = 'Convierte tu cuenta en una experiencia útil.';
  let summary = 'Personal OS prioriza una sola acción usando el estado real de tu cuenta.';
  let primary: AccountActivationAction;

  if (!input.hasProfile || !input.hasCompleteProfile) {
    phase = 'setup';
    primary = PROFILE_ACTION;
  } else if (input.kycStatus === 'rejected') {
    phase = 'setup';
    primary = IDENTITY_REVIEW_ACTION;
  } else if (input.kycStatus === 'pending') {
    phase = 'activate';
    primary = IDENTITY_PENDING_ACTION;
  } else if (input.kycStatus !== 'verified') {
    phase = 'setup';
    primary = IDENTITY_ACTION;
  } else if (!input.walletReady) {
    phase = 'activate';
    primary = WALLET_ACTION;
  } else {
    const learning = educationReady ? continueLearningAction(input.education) : null;
    if (learning) {
      phase = 'return';
      headline = 'Retoma una experiencia que ya empezaste.';
      summary = 'Tu próxima acción se basa en actividad real, no en una recomendación publicitaria.';
      primary = learning;
    } else if (hasInvestmentValue) {
      phase = 'return';
      headline = 'Vuelve a lo que ya está generando actividad.';
      summary = 'Personal OS prioriza tus participaciones existentes antes de sugerir una nueva compra.';
      primary = INVESTMENT_ACTION;
    } else if (hasTransactionValue) {
      phase = 'return';
      headline = 'Mantén el control de tu actividad.';
      summary = 'Ya existe actividad real en tu cuenta; el siguiente paso es revisarla antes de abrir otro flujo.';
      primary = ACTIVITY_ACTION;
    } else if (educationReady && input.education.pendingOrders > 0) {
      phase = 'engage';
      primary = action(
        'education',
        'Tienes una acción pendiente',
        'Revisa tu actividad educativa',
        'Existe una orden educativa pendiente de pago o verificación asociada a tu cuenta.',
        '/dashboard/educacion',
        'Revisar Education OS',
        'education_library',
      );
    } else if (educationReady) {
      phase = 'engage';
      primary = EDUCATION_DISCOVERY_ACTION;
    } else {
      phase = 'engage';
      primary = DISCOVER_ACTION;
    }
  }

  const candidates = [
    input.kycStatus === 'verified' ? null : IDENTITY_ACTION,
    input.walletReady ? null : WALLET_ACTION,
    hasEducationValue ? action('education', 'Tu aprendizaje', 'Mi Education OS', 'Consulta cursos, accesos y progreso vinculados a tu cuenta.', '/dashboard/educacion', 'Abrir educación', 'education_library') : EDUCATION_DISCOVERY_ACTION,
    hasInvestmentValue ? INVESTMENT_ACTION : action('investment', 'Opcional', 'Explorar inversión', 'Consulta oportunidades publicadas sin asumir que invertir sea un requisito para activar tu cuenta.', '/inversion/app', 'Explorar inversión', 'investment'),
    DISCOVER_ACTION,
  ].filter((item): item is AccountActivationAction => Boolean(item) && item?.key !== primary.key);

  const secondary = candidates.slice(0, 3);

  return {
    phase,
    headline,
    summary,
    primary,
    secondary,
    completedMilestones,
    totalMilestones,
    progressPercent,
  };
}
