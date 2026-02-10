import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Map as MapIcon,
  LogOut,
  Settings,
  Package,
  TrendingUp,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Globe
} from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { authService } from '../services/auth';

const Sidebar = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const dir = i18n.dir();

    const menuItems = [
        { icon: LayoutDashboard, label: t('common.dashboard'), path: '/dashboard' },
        { icon: MapIcon, label: t('common.live_map'), path: '/dashboard/map' },
        { icon: Users, label: t('common.users'), path: '/dashboard/users' },
        { icon: LayoutDashboard, label: t('common.technicians'), path: '/dashboard/technicians' },
        { icon: Settings, label: t('common.service_requests'), path: '/dashboard/requests' },
        { icon: ClipboardList, label: t('common.installation_requests'), path: '/dashboard/requests/installation' },
        { icon: Package, label: t('common.inventory'), path: '/dashboard/inventory' },
        { icon: TrendingUp, label: t('common.reports'), path: '/dashboard/reports' },
        { icon: Settings, label: t('common.settings'), path: '/dashboard/settings' },
    ];

    const toggleLanguage = () => {
        const newLang = i18n.language === 'ar' ? 'en' : 'ar';
        i18n.changeLanguage(newLang);
        document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = newLang;
    };

    return (
        <aside
            className={clsx(
                "bg-white border-l border-r border-slate-200 flex flex-col transition-all duration-300 relative z-20 shadow-xl",
                collapsed ? "w-20" : "w-72"
            )}
        >
            {/* Collapse Toggle */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="absolute -left-3 top-8 bg-white border border-slate-200 rounded-full p-1 shadow-md hover:bg-slate-50 transition-colors z-30"
                style={dir === 'ltr' ? { left: 'auto', right: '-12px' } : {}}
            >
                {dir === 'rtl' ? (
                     collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />
                ) : (
                     collapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />
                )}

            </button>

            {/* Logo Area */}
            <div className="p-6 flex items-center justify-between">
                <div className={clsx("flex items-center gap-3 transition-opacity duration-300", collapsed && "justify-center w-full")}>
                    <div className="bg-linear-to-r from-blue-900/50 to-indigo-900/50 rounded-lg p-3 border border-white/10 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
                        S
                    </div>
                    {!collapsed && (
                        <div className="flex flex-col">
                            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{t('branding.app_name')}</h1>
                            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{t('branding.tagline')}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 mt-4 px-3 space-y-1 overflow-y-auto no-scrollbar">
                {menuItems.map((item) => {
                    const active = location.pathname === item.path;
                    return (
                        <div
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            title={collapsed ? item.label : ''}
                            className={clsx(
                                "flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-all rounded-xl relative group mx-1",
                                active
                                    ? "bg-linear-to-r from-slate-900 to-slate-800 text-white shadow-lg shadow-slate-900/20"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                                collapsed && "justify-center px-2"
                            )}
                        >
                            <item.icon size={22} className={clsx("transition-transform duration-300", active && "scale-110")} />

                            {!collapsed && (
                                <span className={clsx("font-medium text-[15px] transition-all duration-300")}>{item.label}</span>
                            )}

                            {/* Active Indicator Strip */}
                            {active && !collapsed && (
                                <div className={clsx("absolute w-1 h-6 bg-blue-500 rounded-full top-1/2 -translate-y-1/2", dir === 'rtl' ? "left-2" : "right-2")}></div>
                            )}

                            {/* Tooltip for Collapsed State */}
                            {collapsed && (
                                <div className={clsx(
                                    "absolute top-1/2 -translate-y-1/2 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none",
                                    dir === 'rtl' ? "right-full mr-3" : "left-full ml-3"
                                )}>
                                    {item.label}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-100 space-y-2">

                {/* Language Switcher */}
                 <button
                    onClick={toggleLanguage}
                    className={clsx(
                        "flex items-center gap-3 px-4 py-3 w-full text-slate-600 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200",
                         collapsed && "justify-center px-0"
                    )}
                    title={t('common.language')}
                >
                    <Globe size={20} className="text-blue-600" />
                    {!collapsed && <span className="font-medium text-sm">{i18n.language === 'ar' ? 'English' : 'العربية'}</span>}
                </button>

                {/* Logout */}
                <button
                    onClick={() => authService.logout()}
                    className={clsx(
                        "flex items-center gap-3 px-4 py-3 w-full text-red-500 hover:bg-red-50 rounded-xl transition-colors",
                         collapsed && "justify-center px-0"
                    )}
                    title={t('common.logout')}
                >
                    <LogOut size={20} />
                    {!collapsed && <span className="font-medium text-sm">{t('common.logout')}</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
