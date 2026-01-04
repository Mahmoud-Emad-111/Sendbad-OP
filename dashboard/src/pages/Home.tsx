import { useEffect, useState } from 'react';
import api from '../services/auth';
import {
    Users, Wrench, FileText, CheckCircle, Clock, TrendingUp
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

export default function DashboardHome() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const res = await api.get('/admin/stats');
            if (res.data.success) {
                setStats(res.data.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">جاري تحميل الإحصائيات...</div>;
    if (!stats) return <div className="p-8 text-center text-red-500">فشل تحميل البيانات</div>;

    const { counts, recent_requests } = stats;

    const cards = [
        { title: 'إجمالي الطلبات', value: counts.total_requests, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
        { title: 'قيد الانتظار', value: counts.pending_requests, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
        { title: 'جاري العمل', value: counts.assigned_requests, icon: Wrench, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { title: 'مكتملة', value: counts.completed_requests, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    ];

    const chartData = [
        { name: 'قيد الانتظار', value: counts.pending_requests, fill: '#d97706' },
        { name: 'جاري العمل', value: counts.assigned_requests, fill: '#4f46e5' },
        { name: 'مكتملة', value: counts.completed_requests, fill: '#16a34a' },
    ];

    const COLORS = ['#d97706', '#4f46e5', '#16a34a'];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">لوحة التحكم</h1>
                <p className="text-slate-500">نظرة عامة على أداء النظام والطلبات</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-slate-500 text-sm font-medium mb-1">{card.title}</p>
                            <h3 className="text-2xl font-bold text-slate-900">{card.value}</h3>
                        </div>
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${card.bg} ${card.color}`}>
                            <card.icon size={24} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Charts Area */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[400px]">
                    <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <TrendingUp size={20} className="text-slate-400" />
                        حالة الطلبات
                    </h2>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ fill: '#f1f5f9' }}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={50} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Additional Stats / Pie Chart */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[400px]">
                    <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Users size={20} className="text-slate-400" />
                        المستخدمين
                    </h2>
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-slate-50 p-4 rounded-lg text-center">
                            <div className="text-3xl font-bold text-slate-900 mb-1">{counts.technicians}</div>
                            <div className="text-sm text-slate-500">فني مسجل</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg text-center">
                            <div className="text-3xl font-bold text-slate-900 mb-1">{counts.customers}</div>
                            <div className="text-sm text-slate-500">عميل</div>
                        </div>
                    </div>

                    <div className="h-[200px] w-full flex justify-center">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {chartData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Recent Requests Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-900">أحدث الطلبات</h2>
                    <a href="/dashboard/requests" className="text-sm text-blue-600 hover:text-blue-700 font-medium">عرض الكل</a>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-slate-50 text-slate-600 font-medium text-sm">
                            <tr>
                                <th className="px-6 py-4">رقم الطلب</th>
                                <th className="px-6 py-4">العميل</th>
                                <th className="px-6 py-4">الخدمة</th>
                                <th className="px-6 py-4">التاريخ</th>
                                <th className="px-6 py-4">الحالة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {recent_requests.map((req: any) => (
                                <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-slate-500">#{req.id}</td>
                                    <td className="px-6 py-4 font-medium text-slate-900">{req.user?.name}</td>
                                    <td className="px-6 py-4 text-slate-600">{req.service_type}</td>
                                    <td className="px-6 py-4 text-slate-600" dir="ltr">
                                        {new Date(req.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold
                                            ${req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                              req.status === 'completed' ? 'bg-green-100 text-green-700' :
                                              'bg-blue-100 text-blue-700'}`}>
                                            {req.status === 'pending' ? 'انتظار' : (req.status === 'completed' ? 'مكتمل' : 'جاري')}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
