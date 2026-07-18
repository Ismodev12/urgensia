import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { ProfileSettings } from '../../components/settings/ProfileSettings';
import { useAuth } from '../../context/AuthContext';

export default function SettingsPage() {
  const { user } = useAuth();
  return (
    <DashboardLayout role="agent" user={user} title="Paramètres">
      <ProfileSettings accent="teal" />
    </DashboardLayout>
  );
}
