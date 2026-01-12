import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18next from 'i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { adminService } from '../services/auth';
import {
    Phone, Calendar, Receipt, ArrowLeft,
    FileText, CheckCircle, AlertCircle, ShoppingBag,
    Building
} from 'lucide-react';
import clsx from 'clsx';
import LoadingSpinner from '../components/LoadingSpinner';

export default function UserDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'requests' | 'invoices'>('requests');

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            const res = await adminService.getUserDetails(Number(id));
            if (res.success) {
                setData(res.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };


    const { t } = useTranslation();

    if (loading) return <LoadingSpinner />;
    if (!data) return <div className="p-10 text-center text-red-500">{t('user_details.not_found')}</div>;

    const { user, odoo } = data;
    const totalSpent = odoo?.orders?.reduce((sum: number, o: any) => sum + o.amount_total, 0) || 0;

    const TabButton = ({ id, label, icon: Icon }: any) => (
        <button
            onClick={() => setActiveTab(id)}
            className={clsx(
                "flex items-center gap-2 px-6 py-3 border-b-2 transition-colors font-medium text-sm",
                activeTab === id
                    ? "border-blue-600 text-blue-600 bg-blue-50/50"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            )}
        >
            <Icon size={18} />
            {label}
        </button>
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top Navigation */}
            <div>
                <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-600 flex items-center gap-2 mb-4 group transition-colors">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
                    {t('user_details.back_to_list')}
                </button>

                {/* Profile Header Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-8 -mt-8 opacity-50 pointer-events-none rtl:left-0 rtl:right-auto rtl:rounded-br-full rtl:rounded-bl-none rtl:-ml-8 rtl:mr-0"></div>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-3xl font-bold shadow-lg shadow-slate-900/10">
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900">{user.name}</h1>
                                <div className="flex flex-wrap items-center gap-4 mt-2 text-slate-500 text-sm">
                                    <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                                        <Phone size={14} className="text-blue-500" />
                                        <span dir="ltr">{user.phone}</span>
                                    </span>
                                    {odoo.partner_id && (
                                        <span className="flex items-center gap-1.5 bg-green-50 px-3 py-1 rounded-full text-green-700 border border-green-100">
                                            <Building size={14} />
                                            Odoo ID: #{odoo.partner_id}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1.5">
                                        <Calendar size={14} />
                                        {t('user_details.join_date')}: {new Date(user.created_at).toLocaleDateString(i18next.language === 'ar' ? 'ar-EG' : 'en-US')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="flex gap-4">
                            <div className="px-6 py-3 bg-slate-50 rounded-xl border border-slate-100 text-center min-w-[120px]">
                                <div className="text-xs text-slate-500 font-medium mb-1">{t('user_details.total_requests')}</div>
                                <div className="text-xl font-bold text-slate-900">{user.service_requests?.length || 0}</div>
                            </div>
                            <div className="px-6 py-3 bg-blue-50 rounded-xl border border-blue-100 text-center min-w-[120px]">
                                <div className="text-xs text-blue-600 font-medium mb-1">{t('user_details.total_purchases')}</div>
                                <div className="text-xl font-bold text-blue-700" dir="ltr">{totalSpent.toFixed(3)} OMR</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Tabs */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                <div className="flex border-b border-slate-200">
                    <TabButton id="requests" label={t('user_details.backend_requests')} icon={FileText} />
                    <TabButton id="invoices" label={t('user_details.odoo_invoices')} icon={ShoppingBag} />
                </div>

                <div className="p-6">
                    {activeTab === 'requests' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                             {user.service_requests && user.service_requests.length > 0 ? (
                                <div className="overflow-hidden rounded-xl border border-slate-200">
                                    <table className="w-full text-start">
                                        <thead className="bg-slate-50 text-slate-600 text-sm font-medium">
                                            <tr>
                                                <th className="px-6 py-4 text-start">{t('user_details.request_id')}</th>
                                                <th className="px-6 py-4 text-start">{t('user_details.service_type')}</th>
                                                <th className="px-6 py-4 text-start">{t('common.description')}</th>
                                                <th className="px-6 py-4 text-start">{t('common.date')}</th>
                                                <th className="px-6 py-4 text-start">{t('common.status')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {user.service_requests.map((req: any) => (
                                                <tr
                                                    key={req.id}
                                                    onClick={() => navigate(`/dashboard/requests/${req.id}`)}
                                                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                                                >
                                                    <td className="px-6 py-4 font-mono text-slate-500 group-hover:text-blue-600 transition-colors">#{req.id}</td>
                                                    <td className="px-6 py-4 font-medium">
                                                        {t(`requests.types.${req.service_type}`) || req.service_type}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600 max-w-md truncate">{req.description}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(req.created_at).toLocaleDateString(i18next.language === 'ar' ? 'ar-EG' : 'en-US')}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={clsx(
                                                            "px-2.5 py-1 rounded-full text-xs font-semibold",
                                                            req.status === 'completed' ? "bg-green-100 text-green-700" :
                                                            req.status === 'pending' ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                                                        )}>
                                                            {t(`requests.statuses.${req.status}`) || req.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-12 flex flex-col items-center text-slate-400">
                                    <FileText size={48} className="mb-4 opacity-20" />
                                    <p>{t('user_details.no_requests')}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'invoices' && (
                         <div className="space-y-8 animate-in fade-in duration-300">
                            {odoo.partner_id ? (
                                <>
                                    <div className="flex items-center justify-between">
                                         <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 px-4 py-2 rounded-full border border-blue-100 shadow-sm">
                                            <CheckCircle size={16} />
                                            <span>{t('user_details.odoo_linked')}: <span className="font-bold underline">{odoo.partner_id}</span></span>
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {t('user_details.last_updated')}: {new Date().toLocaleTimeString(i18next.language === 'ar' ? 'ar-EG' : 'en-US')}
                                        </div>
                                    </div>

                                    {/* Financial Summary Cards (Premium) */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="group relative bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
                                            <div className="absolute right-0 top-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110 rtl:left-0 rtl:right-auto rtl:rounded-br-full rtl:rounded-bl-none rtl:-ml-4 rtl:mr-0"></div>
                                            <div className="relative z-10 flex flex-col items-center">
                                                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                    <ShoppingBag size={28} />
                                                </div>
                                                <div className="text-sm text-slate-500 font-medium mb-1">{t('user_details.total_purchases')}</div>
                                                <div className="text-3xl font-bold text-slate-900 tracking-tight" dir="ltr">
                                                    <span className="text-lg text-slate-400 font-normal mr-1">OMR</span>
                                                    {odoo.orders.reduce((sum: number, o: any) => sum + (o.amount_total || 0), 0).toFixed(3)}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="group relative bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
                                            <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110 rtl:left-0 rtl:right-auto rtl:rounded-br-full rtl:rounded-bl-none rtl:-ml-4 rtl:mr-0"></div>
                                            <div className="relative z-10 flex flex-col items-center">
                                                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 shadow-sm group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                                    <CheckCircle size={28} />
                                                </div>
                                                <div className="text-sm text-slate-500 font-medium mb-1">{t('user_details.paid_amount')}</div>
                                                <div className="text-3xl font-bold text-emerald-700 tracking-tight" dir="ltr">
                                                    <span className="text-lg text-slate-400 font-normal mr-1">OMR</span>
                                                    {(odoo.orders.reduce((sum: number, o: any) => sum + (o.amount_total || 0), 0) - odoo.orders.reduce((sum: number, o: any) => sum + (o.amount_due || o.amount_residual || 0), 0)).toFixed(3)}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="group relative bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
                                            <div className="absolute right-0 top-0 w-24 h-24 bg-red-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110 rtl:left-0 rtl:right-auto rtl:rounded-br-full rtl:rounded-bl-none rtl:-ml-4 rtl:mr-0"></div>
                                            <div className="relative z-10 flex flex-col items-center">
                                                <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4 shadow-sm group-hover:bg-red-600 group-hover:text-white transition-colors">
                                                    <AlertCircle size={28} />
                                                </div>
                                                <div className="text-sm text-slate-500 font-medium mb-1">{t('user_details.due_amount')}</div>
                                                <div className="text-3xl font-bold text-red-700 tracking-tight" dir="ltr">
                                                     <span className="text-lg text-slate-400 font-normal mr-1">OMR</span>
                                                    {odoo.orders.reduce((sum: number, o: any) => sum + (o.amount_due || o.amount_residual || 0), 0).toFixed(3)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {odoo.orders && odoo.orders.length > 0 ? (
                                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                                    <Receipt size={20} className="text-blue-600" />
                                                    {t('user_details.invoices_history')}
                                                </h3>
                                                <span className="text-xs bg-white border border-slate-200 px-2 py-1 rounded text-slate-500">
                                                    {odoo.orders.length}
                                                </span>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-start">
                                                    <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider font-semibold">
                                                        <tr>
                                                            <th className="px-6 py-4 text-start">{t('user_details.ref_number')}</th>
                                                            <th className="px-6 py-4 text-start">{t('common.date')}</th>
                                                            <th className="px-6 py-4 text-center">{t('user_details.total')}</th>
                                                            <th className="px-6 py-4 text-center">{t('user_details.paid')}</th>
                                                            <th className="px-6 py-4 text-center">{t('user_details.remaining')}</th>
                                                            <th className="px-6 py-4 text-center">{t('common.status')}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {odoo.orders.map((order: any, idx: number) => {
                                                            const total = order.amount_total || 0;
                                                            const due = order.amount_due || order.amount_residual || 0;
                                                            const paid = total - due;
                                                            const isPaid = due <= 0.001 && total > 0;

                                                            return (
                                                                <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                                                                    <td className="px-6 py-4">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center font-mono text-xs group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                                                                {idx + 1}
                                                                            </div>
                                                                            <div>
                                                                                 <span className="block font-bold text-slate-700 text-sm font-mono">{order.name}</span>
                                                                                 {/* <span className="text-xs text-slate-400">Order Ref</span> */}
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                                                            <Calendar size={14} className="text-slate-400" />
                                                                            <span dir="ltr">{order.date_order?.split(' ')[0]}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-center">
                                                                        <span className="font-mono font-bold text-slate-800 text-sm bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                                                            {total.toFixed(3)}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-center">
                                                                        <span className={clsx(
                                                                            "font-mono font-medium text-sm",
                                                                            paid > 0 ? "text-emerald-600" : "text-slate-400"
                                                                        )}>
                                                                            {paid.toFixed(3)}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-center">
                                                                         <span className={clsx(
                                                                            "font-mono font-bold text-sm",
                                                                            due > 0.001 ? "text-red-600 bg-red-50 px-2 py-1 rounded" : "text-slate-300"
                                                                        )}>
                                                                            {due > 0.001 ? due.toFixed(3) : '-'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-center">
                                                                        <span className={clsx(
                                                                            "px-3 py-1 rounded-full text-xs font-bold border shadow-sm inline-flex items-center gap-1",
                                                                            isPaid ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                                                            order.state === 'sale' ? "bg-blue-50 text-blue-700 border-blue-100" :
                                                                            "bg-slate-100 text-slate-600 border-slate-200"
                                                                        )}>
                                                                            {isPaid ? <CheckCircle size={12} /> : null}
                                                                            {isPaid ? t('user_details.fully_paid') : order.state}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-16 flex flex-col items-center text-slate-400 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                                            <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                                                <ShoppingBag size={24} className="text-slate-300" />
                                            </div>
                                            <h3 className="text-slate-900 font-medium mb-1">{t('user_details.no_financial_records')}</h3>
                                            <p className="text-sm max-w-xs mx-auto">...</p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-20 flex flex-col items-center text-slate-400 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-4 animate-pulse">
                                         <AlertCircle size={32} className="text-amber-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 mb-2">{t('user_details.user_not_linked_odoo')}</h3>
                                    <p className="max-w-md mx-auto text-slate-600 mb-6 leading-relaxed">
                                        ... <br />
                                        <span className="font-mono bg-white px-2 rounded border mx-1" dir="ltr">{user.phone}</span>
                                        <span className="font-bold text-slate-800">"{user.name}"</span>.
                                    </p>
                                    <button onClick={() => window.open(data.odoo_url || '#', '_blank')} className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline">
                                        {t('user_details.manual_search')} &rarr;
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
