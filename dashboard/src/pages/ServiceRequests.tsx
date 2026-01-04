import { useEffect, useState } from 'react';
import api from '../services/auth';
import { Calendar, User, Settings, AlertCircle, CheckCircle, Clock, Eye, X } from 'lucide-react';
import clsx from 'clsx';

export default function ServiceRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [assignModal, setAssignModal] = useState<{show: boolean, requestId: number | null}>({show: false, requestId: null});
  const [viewModal, setViewModal] = useState<{show: boolean, request: any | null}>({show: false, request: null});
  const [selectedTech, setSelectedTech] = useState('');

  useEffect(() => {
    loadRequests();
    loadTechnicians();
  }, []);

  const loadRequests = async () => {
    try {
      const res = await api.get('/requests');
      if (res.data.success) {
        setRequests(res.data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadTechnicians = async () => {
    try {
        const res = await api.get('/admin/users?role=technician');
        if (res.data.success) {
            setTechnicians(res.data.data);
        }
    } catch (error) {
        console.error("Failed to load techs", error);
    }
  };

  const handleAssign = async () => {
    if (!selectedTech || !assignModal.requestId) return;

    try {
        const res = await api.post(`/admin/requests/${assignModal.requestId}/assign`, {
            technician_id: selectedTech
        });
        if (res.data.success) {
            alert('تم إسناد الطلب بنجاح');
            setAssignModal({show: false, requestId: null});
            setSelectedTech('');
            loadRequests();
        }
    } catch (error) {
        alert('حدث خطأ أثناء الإسناد');
    }
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">طلبات الصيانة</h1>
          <p className="text-slate-500">متابعة وإدارة طلبات العملاء</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
            <table className="w-full text-right">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium text-sm">
                    <tr>
                        <th className="px-6 py-4">رقم الطلب</th>
                        <th className="px-6 py-4">العميل</th>
                        <th className="px-6 py-4">نوع الخدمة</th>
                        <th className="px-6 py-4">العنوان</th>
                        <th className="px-6 py-4">الموعد</th>
                        <th className="px-6 py-4">الحالة</th>
                        <th className="px-6 py-4">الفني المسؤول</th>
                        <th className="px-6 py-4">إجراءات</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading ? (
                        <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-500">جاري التحميل...</td></tr>
                    ) : requests.length === 0 ? (
                        <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-500">لا يوجد طلبات حالياً</td></tr>
                    ) : (
                        requests.map(req => (
                            <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-mono text-slate-500">#{req.id}</td>
                                <td className="px-6 py-4 font-medium text-slate-900">{req.user?.name}</td>
                                <td className="px-6 py-4 text-slate-600">
                                    {req.service_type === 'installation' ? 'تركيب جديد' : 'صيانة دورية'}
                                </td>
                                <td className="px-6 py-4 text-slate-500 truncate max-w-xs" title={req.address}>{req.address}</td>
                                <td className="px-6 py-4 text-slate-600">
                                    <div className="flex items-center gap-1.5 text-xs bg-slate-100 px-2 py-1 rounded w-fit">
                                        <Calendar size={14} />
                                        <span dir="ltr">{new Date(req.scheduled_at).toLocaleDateString()}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4"><StatusBadge status={req.status} /></td>
                                <td className="px-6 py-4 text-slate-600">
                                    {req.technician ? (
                                        <span className="flex items-center gap-1">
                                            <User size={14} className="text-blue-500" />
                                            {req.technician.name}
                                        </span>
                                    ) : (
                                        <span className="text-slate-400 text-xs italic">غير مسند</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => window.location.href = `/dashboard/requests/${req.id}`}
                                        className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                                        title="عرض التفاصيل"
                                    >
                                        <Eye size={18} />
                                    </button>
                                    {req.status === 'pending' && (
                                        <button
                                            onClick={() => setAssignModal({show: true, requestId: req.id})}
                                            className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded hover:bg-slate-800 transition-colors"
                                        >
                                            إسناد للفني
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
      </div>
    </div>

      {/* View Details Modal */}
      {viewModal.show && viewModal.request && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">تفاصيل الطلب #{viewModal.request.id}</h2>
                        <span className="text-sm text-slate-500">تم الإنشاء: {new Date(viewModal.request.created_at).toLocaleDateString()}</span>
                    </div>
                    <button onClick={() => setViewModal({show: false, request: null})} className="text-slate-400 hover:text-red-500">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Status & Service Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-slate-500 mb-1">بيانات العميل</h3>
                                <div className="font-semibold text-slate-900 flex items-center gap-2">
                                    <User size={16} className="text-blue-500" />
                                    {viewModal.request.user?.name}
                                </div>
                                <div className="text-sm text-slate-600 mt-1" dir="ltr">{viewModal.request.user?.phone}</div>
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-slate-500 mb-1">نوع الخدمة</h3>
                                <div className="font-semibold text-slate-900">{viewModal.request.service_type}</div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-slate-500 mb-1">حالة الطلب</h3>
                                <StatusBadge status={viewModal.request.status} />
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-slate-500 mb-1">الموعد المحدد</h3>
                                <div className="flex items-center gap-2 text-slate-900 font-semibold">
                                    <Calendar size={16} className="text-indigo-500" />
                                    <span dir="ltr">
                                        {new Date(viewModal.request.scheduled_at).toLocaleDateString()} -
                                        {new Date(viewModal.request.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Location & Description */}
                    <div className="bg-slate-50 p-4 rounded-xl space-y-4">
                        <div>
                            <h3 className="text-sm font-medium text-slate-500 mb-1">العنوان</h3>
                            <p className="text-slate-900">{viewModal.request.address}</p>
                            {viewModal.request.latitude && (
                                <a
                                    href={`https://www.google.com/maps?q=${viewModal.request.latitude},${viewModal.request.longitude}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                                >
                                    عرض الموقع على الخريطة ↗
                                </a>
                            )}
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-slate-500 mb-1">وصف المشكلة</h3>
                            <p className="text-slate-700 leading-relaxed">{viewModal.request.description}</p>
                        </div>
                    </div>

                    {/* Images Gallery */}
                    <div>
                        <h3 className="text-sm font-medium text-slate-500 mb-3">المرفقات والصور</h3>
                        {viewModal.request.attachments && viewModal.request.attachments.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {viewModal.request.attachments.map((img: any) => (
                                    <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group">
                                        <img
                                            src={`${import.meta.env.VITE_API_BASE_URL.replace('/api', '')}/storage/${img.file_path}`}
                                            alt="Request Attachment"
                                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                        />
                                        <a
                                            href={`${import.meta.env.VITE_API_BASE_URL.replace('/api', '')}/storage/${img.file_path}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm font-medium"
                                        >
                                            عرض الصورة
                                        </a>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-slate-50 rounded-lg text-slate-400 text-sm border border-dashed border-slate-200">
                                لا يوجد صور مرفقة
                            </div>
                        )}
                    </div>

                    {/* Technician Info */}
                    {viewModal.request.technician && (
                        <div className="border-t border-slate-100 pt-6">
                            <h3 className="text-sm font-medium text-slate-500 mb-2">الفني المسؤول</h3>
                            <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                                    {viewModal.request.technician.name.charAt(0)}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900">{viewModal.request.technician.name}</div>
                                    <div className="text-xs text-slate-500" dir="ltr">{viewModal.request.technician.phone}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignModal.show && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                <h2 className="text-xl font-bold mb-4">إسناد الطلب للفني</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">اختر الفني المتاح</label>
                        <select
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                            value={selectedTech}
                            onChange={e => setSelectedTech(e.target.value)}
                        >
                            <option value="">-- اختر الفني --</option>
                            {technicians.map(tech => (
                                <option key={tech.id} value={tech.id}>{tech.name} ({tech.phone})</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                        <button
                            onClick={() => setAssignModal({show: false, requestId: null})}
                            className="flex-1 py-2 text-slate-600 hover:bg-slate-50 rounded-lg"
                        >
                            إلغاء
                        </button>
                        <button
                            onClick={handleAssign}
                            disabled={!selectedTech}
                            className="flex-1 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
                        >
                            تأكيد الإسناد
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
