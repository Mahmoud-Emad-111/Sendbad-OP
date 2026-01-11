import { useEffect, useState } from 'react';
import api from '../services/auth';
import { Calendar, User, CheckCircle, Clock, Eye, AlertCircle, Settings, MapPin, Package, ClipboardList } from 'lucide-react';
import clsx from 'clsx';
import LoadingSpinner from '../components/LoadingSpinner';

export default function InstallationRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [filters, setFilters] = useState({
      search: '',
      status: 'all',
      date_from: '',
      date_to: ''
  });

  useEffect(() => {
    loadRequests();
  }, []);

  // Debounced load for search
  useEffect(() => {
    const timer = setTimeout(() => {
        loadRequests();
    }, 500);
    return () => clearTimeout(timer);
  }, [filters]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      // params.append('service_type', 'installation'); // Not needed, dedicated endpoint
      if (filters.search) params.append('search', filters.search);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);

      const res = await api.get(`/installation-requests?${params.toString()}`);
      if (res.data.success) {
        setRequests(res.data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
      setFilters(prev => ({ ...prev, [key]: value }));
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: any = {
        pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'قيد الانتظار', icon: Clock },
        assigned: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'تم الإسناد', icon: User },
        on_way: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'في الطريق', icon: Clock },
        in_progress: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'جاري العمل', icon: Settings },
        completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'مكتمل', icon: CheckCircle },
        canceled: { bg: 'bg-red-100', text: 'text-red-700', label: 'ملغي', icon: AlertCircle },
    };

    const config = styles[status] || styles.pending;
    const Icon = config.icon;

    return (
        <span className={clsx("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold", config.bg, config.text)}>
            <Icon size={14} />
            {config.label}
        </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="text-blue-600" />
            طلبات التركيب
          </h1>
          <p className="text-slate-500">إدارة ومتابعة طلبات التركيب الجديدة</p>
        </div>
        <button
            onClick={() => window.location.href = "/dashboard/requests/new"}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition-colors font-medium shadow-sm hover:shadow-md"
        >
            <span>+</span>
            طلب تركيب جديد
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
           {/* Search */}
           <div className="md:col-span-2">
               <input
                   type="text"
                   placeholder="بحث (رقم الطلب، اسم العميل)..."
                   className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                   value={filters.search}
                   onChange={(e) => handleFilterChange('search', e.target.value)}
               />
           </div>

           {/* Status */}
           <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
            >
                <option value="all">كل الحالات</option>
                <option value="pending">قيد الانتظار</option>
                <option value="assigned">تم الإسناد</option>
                <option value="completed">مكتمل</option>
            </select>

             {/* Date From */}
             <input
                type="date"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
            />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
            <table className="w-full text-right">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium text-sm">
                    <tr>
                        <th className="px-6 py-4">رقم الطلب</th>
                        <th className="px-6 py-4">المنتج</th>
                        <th className="px-6 py-4">الكمية</th>
                        <th className="px-6 py-4">الموقع</th>
                        <th className="px-6 py-4">جاهزية الموقع</th>
                        <th className="px-6 py-4">الموعد</th>
                        <th className="px-6 py-4">الحالة</th>
                        <th className="px-6 py-4">إجراءات</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading ? (
                        <tr><td colSpan={8}><LoadingSpinner /></td></tr>
                    ) : requests.length === 0 ? (
                        <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-500">لا يوجد طلبات تركيب حالياً</td></tr>
                    ) : (
                        requests.map(req => (
                            <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-mono text-slate-500">#{req.id}</td>
                                <td className="px-6 py-4 font-medium text-slate-900">
                                    <div className="flex items-center gap-2">
                                        <Package size={16} className="text-slate-400" />
                                        {req.details?.product_type || 'غير محدد'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-600 font-mono font-bold">
                                    x{req.details?.quantity || 1}
                                </td>
                                <td className="px-6 py-4 text-slate-500 truncate max-w-xs" title={req.address}>
                                    <div className="flex items-center gap-1">
                                        <MapPin size={14} />
                                        {req.address}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                     <span className={clsx("text-xs font-bold px-2 py-1 rounded", req.details?.is_site_ready ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                                        {req.details?.is_site_ready ? 'جاهز' : 'غير جاهز'}
                                     </span>
                                </td>
                                <td className="px-6 py-4 text-slate-600 text-sm">
                                    <div dir="ltr">{new Date(req.scheduled_at).toLocaleDateString()}</div>
                                </td>
                                <td className="px-6 py-4"><StatusBadge status={req.status} /></td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => window.location.href = `/dashboard/requests/installation/${req.id}`}
                                        className="text-slate-400 hover:text-blue-600 transition-colors p-2 hover:bg-blue-50 rounded-full"
                                        title="عرض التفاصيل"
                                    >
                                        <Eye size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}
