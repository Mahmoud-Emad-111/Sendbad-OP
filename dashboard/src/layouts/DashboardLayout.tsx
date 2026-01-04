import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Map as MapIcon,
  LogOut,
  Settings,
  Bell
} from 'lucide-react';
import clsx from 'clsx';
import { authService } from '../services/auth';

const SidebarItem = ({ icon: Icon, label, path, active }: any) => {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(path)}
      className={clsx(
        "flex items-center gap-3 px-4 py-3 cursor-pointer transition-all rounded-lg mb-1 mx-2",
        active
          ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
          : "text-slate-500 hover:bg-slate-100"
      )}
    >
      <Icon size={20} />
      <span className="font-medium text-sm">{label}</span>
    </div>
  );
};

export default function DashboardLayout() {
  const location = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: 'لوحة التحكم', path: '/dashboard' },
    { icon: MapIcon, label: 'الخريطة الحية', path: '/dashboard/map' },
    { icon: Users, label: 'المستخدمين', path: '/dashboard/users' },
    { icon: LayoutDashboard, label: 'الفنيين', path: '/dashboard/technicians' },
    { icon: Settings, label: 'الطلبات', path: '/dashboard/requests' },
    { icon: Settings, label: 'الإعدادات', path: '/dashboard/settings' },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans" dir="rtl">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-l border-slate-200 flex flex-col">
        <div className="p-6 flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">S</div>
            <h1 className="text-xl font-bold text-slate-900">Sindbad</h1>
        </div>

        <nav className="flex-1 mt-6">
          {menuItems.map((item) => (
            <SidebarItem
              key={item.path}
              {...item}
              active={location.pathname === item.path}
            />
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button
            onClick={() => {
                authService.logout();
            }}
            className="flex items-center gap-3 px-4 py-3 w-full text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium text-sm">تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
          <h2 className="text-lg font-semibold text-slate-800">
            {menuItems.find(m => m.path === location.pathname)?.label || 'الرئيسية'}
          </h2>

          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
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
