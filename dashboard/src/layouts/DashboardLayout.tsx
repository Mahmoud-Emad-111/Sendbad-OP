import { useLocation, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/Sidebar';
import NotificationDropdown from '../components/NotificationDropdown';

export default function DashboardLayout() {
  const location = useLocation();
  const { t, i18n } = useTranslation();

  // We keep menuItems for the header title logic (duplicate for now, ideally centralized)
  const menuItems = [
    { label: t('common.dashboard'), path: '/dashboard' },
    { label: t('common.live_map'), path: '/dashboard/map' },
    { label: t('common.users'), path: '/dashboard/users' },
    { label: t('common.technicians'), path: '/dashboard/technicians' },
    { label: t('common.service_requests'), path: '/dashboard/requests' },
    { label: t('common.installation_requests'), path: '/dashboard/requests/installation' },
    { label: t('common.inventory'), path: '/dashboard/inventory' },
    { label: t('common.reports'), path: '/dashboard/reports' },
    { label: t('common.settings'), path: '/dashboard/settings' },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans" dir={i18n.dir()}>
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-auto transition-all duration-300">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-6 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-2">
             <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                {/* Dynamically get label from path, or fallback. Ideally we map again using i18n keys */}
                {i18n.language === 'ar' ?
                  (menuItems.find(m => m.path === location.pathname)?.label || t('common.dashboard')) :
                  (menuItems.find(m => m.path === location.pathname)?.label || t('common.dashboard')) // Simplified for now, real label logic should be robust
                }
             </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Dropdown replacing static Bell */}
            <NotificationDropdown />

            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm ring-1 ring-slate-100 bg-linear-to-tr from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-bold cursor-pointer hover:shadow-md transition-shadow">
              A
            </div>
          </div>
        </header>

        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
