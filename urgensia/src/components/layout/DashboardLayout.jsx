import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useApp } from '../../context/AppContext';

export function DashboardLayout({ children, role = 'agent', user, title }) {
  const { sidebarOpen } = useApp();

  return (
    <div className="flex h-screen bg-bg-main overflow-hidden">
      <Sidebar role={role} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header user={user} title={title} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
