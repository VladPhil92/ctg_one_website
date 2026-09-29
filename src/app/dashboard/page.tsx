import DashboardNotificationBoundary from '@/components/dashboard/DashboardNotificationBoundary';
import InvestorDashboard from '@/components/dashboard/InvestorDashboard';
import PersonalOSDashboardV2 from '@/components/dashboard/PersonalOSDashboardV2';

// Canonical account-dashboard identity: TU ECOSISTEMA CTG ONE.
// PersonalOSDashboardV2 remains the state/activation contract while the
// investor-first surface is now the canonical visual experience.
void PersonalOSDashboardV2;

export default function DashboardPage() {
  return (
    <DashboardNotificationBoundary>
      <InvestorDashboard />
    </DashboardNotificationBoundary>
  );
}
