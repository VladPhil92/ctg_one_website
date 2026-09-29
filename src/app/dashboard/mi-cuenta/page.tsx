import DashboardNotificationBoundary from '@/components/dashboard/DashboardNotificationBoundary';
import InvestorDashboard from '@/components/dashboard/InvestorDashboard';

// Explicit personal-account surface. Administrative identities are redirected
// from /dashboard to Admin OS, but can still inspect their own participant view
// from the Admin OS navigation through this route.
export default function PersonalAccountDashboardPage() {
  return (
    <DashboardNotificationBoundary>
      <InvestorDashboard />
    </DashboardNotificationBoundary>
  );
}
