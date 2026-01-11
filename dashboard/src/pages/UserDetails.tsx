import { useEffect, useState } from 'react';
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


    if (loading) return <LoadingSpinner />;
    if (!data) return <div className="p-10 text-center text-red-500">لم يتم العثور على العميل</div>;

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
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    عودة للقائمة
                </button>

                {/* Profile Header Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-8 -mt-8 opacity-50 pointer-events-none"></div>

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
                                        {user.phone}
                                    </span>
                                    {odoo.partner_id && (
                                        <span className="flex items-center gap-1.5 bg-green-50 px-3 py-1 rounded-full text-green-700 border border-green-100">
                                            <Building size={14} />
                                            Odoo ID: #{odoo.partner_id}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1.5">
                                        <Calendar size={14} />
                                        تاريخ الانضمام: {new Date(user.created_at).toLocaleDateString('ar-EG')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="flex gap-4">
                            <div className="px-6 py-3 bg-slate-50 rounded-xl border border-slate-100 text-center min-w-[120px]">
                                <div className="text-xs text-slate-500 font-medium mb-1">إجمالي الطلبات</div>
                                <div className="text-xl font-bold text-slate-900">{user.service_requests?.length || 0}</div>
                            </div>
                            <div className="px-6 py-3 bg-blue-50 rounded-xl border border-blue-100 text-center min-w-[120px]">
                                <div className="text-xs text-blue-600 font-medium mb-1">المشتريات (Odoo)</div>
                                <div className="text-xl font-bold text-blue-700" dir="ltr">{totalSpent.toFixed(2)} OMR</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Tabs */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                <div className="flex border-b border-slate-200">
                    <TabButton id="requests" label="طلبات الصيانة (Backend)" icon={FileText} />
                    <TabButton id="invoices" label="المشتريات والفواتير (Odoo)" icon={ShoppingBag} />
                </div>

                <div className="p-6">
                    {activeTab === 'requests' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                             {user.service_requests && user.service_requests.length > 0 ? (
                                <div className="overflow-hidden rounded-xl border border-slate-200">
                                    <table className="w-full text-right">
                                        <thead className="bg-slate-50 text-slate-600 text-sm font-medium">
                                            <tr>
                                                <th className="px-6 py-4">رقم الطلب</th>
                                                <th className="px-6 py-4">نوع الخدمة</th>
                                                <th className="px-6 py-4">الوصف</th>
                                                <th className="px-6 py-4">التاريخ</th>
                                                <th className="px-6 py-4">الحالة</th>
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
                                                    <td className="px-6 py-4 font-medium">{req.service_type}</td>
                                                    <td className="px-6 py-4 text-slate-600 max-w-md truncate">{req.description}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(req.created_at).toLocaleDateString('ar-EG')}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={clsx(
                                                            "px-2.5 py-1 rounded-full text-xs font-semibold",
                                                            req.status === 'completed' ? "bg-green-100 text-green-700" :
                                                            req.status === 'pending' ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                                                        )}>
                                                            {req.status}
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
                                    <p>لا يوجد طلبات صيانة لهذا العميل</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'invoices' && (
                         <div className="space-y-4 animate-in fade-in duration-300">
                            {odoo.partner_id ? (
                                <>
                                    <div className="flex items-center gap-2 mb-4 text-sm text-blue-600 bg-blue-50 w-fit px-4 py-2 rounded-lg">
                                        <CheckCircle size={16} />
                                        <span>تم الربط مع Odoo بنجاح. يتم عرض الفواتير المربوطة برقم الهاتف.</span>
                                    </div>

                                    {odoo.orders && odoo.orders.length > 0 ? (
                                         <div className="overflow-hidden rounded-xl border border-slate-200">
                                            <table className="w-full text-right">
                                                <thead className="bg-slate-50 text-slate-600 text-sm font-medium">
                                                    <tr>
                                                        <th className="px-6 py-4">رقم الفاتورة / الطلب</th>
                                                        <th className="px-6 py-4">التاريخ</th>
                                                        <th className="px-6 py-4">الإجمالي (OMR)</th>
                                                        <th className="px-6 py-4">المستحق</th>
                                                        <th className="px-6 py-4">حالة الدفع</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {odoo.orders.map((order: any, idx: number) => (
                                                        <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                                            <td className="px-6 py-4 font-mono font-bold text-slate-700 flex items-center gap-2">
                                                                <Receipt size={16} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                                                                {order.name}
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-slate-500" dir="ltr">{order.date_order}</td>
                                                            <td className="px-6 py-4 font-mono font-medium">{order.amount_total.toFixed(3)}</td>
                                                            <td className="px-6 py-4 font-mono text-red-600">{order.amount_due?.toFixed(3) || '0.000'}</td>
                                                            <td className="px-6 py-4">
                                                                <span className={clsx(
                                                                    "px-2.5 py-1 rounded-full text-xs font-semibold uppercase",
                                                                    order.state === 'sale' ? "bg-green-100 text-green-700" :
                                                                    order.state === 'draft' ? "bg-gray-100 text-gray-700 mr-2" : "bg-blue-100 text-blue-700"
                                                                )}>
                                                                    {order.state}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 flex flex-col items-center text-slate-400">
                                            <ShoppingBag size={48} className="mb-4 opacity-20" />
                                            <p>لا يوجد فواتير أو طلبات في Odoo</p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-16 flex flex-col items-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    <AlertCircle size={48} className="mb-4 opacity-50 text-amber-500" />
                                    <h3 className="text-lg font-bold text-slate-700 mb-1">العميل غير موجود في Odoo</h3>
                                    <p className="max-w-md mx-auto">لم يتم العثور على عميل في Odoo بنفس رقم الهاتف ({user.phone}). تأكد من تسجيل العميل بنفس الرقم في النظامين.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
