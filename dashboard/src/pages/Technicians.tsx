import React, { useEffect, useState } from 'react';
import { adminService } from '../services/auth';
import { UserPlus, Star, MapPin, Phone, Shield, Settings, Eye, EyeOff, FileText, X, CheckCircle, Clock } from 'lucide-react';
import clsx from 'clsx';
import api from '../services/auth'; // Using axios instance

export default function Technicians() {
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newTech, setNewTech] = useState({ name: '', phone: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const [historyModal, setHistoryModal] = useState<{show: boolean, tech: any | null}>({show: false, tech: null});
  const [techHistory, setTechHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    loadTechnicians();
  }, []);

  const loadTechnicians = async () => {
    try {
      setLoading(true);
      // Re-using getUsers but filtering on frontend or backend.
      // AdminController getUsers supports ?role=technician
      const res = await adminService.getUsers('technician');
      if (res.success) {
        setTechnicians(res.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
        const res = await api.post('/admin/technicians', newTech);
        if (res.data.success) {
            setShowModal(false);
            setNewTech({ name: '', phone: '', password: '' });
            loadTechnicians(); // Refresh list
            alert('تم إضافة الفني بنجاح');
        }
    } catch (error) {
        alert('حدث خطأ، ربما رقم الهاتف مكرر');
    } finally {
        setSubmitting(false);
    }
  };

  const openHistory = async (tech: any) => {
      setHistoryModal({show: true, tech});
      setHistoryLoading(true);
      try {
          const res = await api.get(`/admin/users/${tech.id}`);
          if (res.data.success) {
              setTechHistory(res.data.data.user.assigned_requests || []);
          }
      } catch (error) {
          console.error("Failed to load history", error);
      } finally {
          setHistoryLoading(false);
      }
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">إدارة الفنيين</h1>
          <p className="text-slate-500">متابعة وإضافة المناديب والفنيين</p>
        </div>
        <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
        >
            <UserPlus size={18} />
            إضافة فني جديد
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
            [1,2,3].map(i => (
                <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 animate-pulse h-40"></div>
            ))
        ) : technicians.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-500">لا يوجد فنيين حالياً</div>
        ) : (
            technicians.map(tech => (
                <div key={tech.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
                                {tech.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">{tech.name}</h3>
                                <span className={clsx("text-xs px-2 py-0.5 rounded-full", tech.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                                    {tech.is_active ? 'متاح' : 'غير نشط'}
                                </span>
                            </div>
                        </div>
                        <button className="text-slate-400 hover:text-slate-600">
                            <Settings size={18} />
                        </button>
                    </div>

                    <div className="space-y-3 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                            <Phone size={16} className="text-slate-400" />
                            <span dir="ltr">{tech.phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin size={16} className="text-slate-400" />
                            <span>الموقع الحالي: غير معروف</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Star size={16} className="text-amber-400 fill-amber-400" />
                            <span>4.8 (120 طلب)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Shield size={16} className="text-slate-400" />
                            <span>ID: {tech.id}</span>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                        <button
                            onClick={() => openHistory(tech)}
                            className="flex-1 bg-slate-50 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 flex items-center justify-center gap-2"
                        >
                            <FileText size={16} />
                            سجل الطلبات
                        </button>
                        <button className="flex-1 bg-slate-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-slate-800">
                            تتبع مباشر
                        </button>
                    </div>
                </div>
            ))
        )}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                <h2 className="text-xl font-bold mb-4">إضافة فني جديد</h2>
                <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">الاسم الكامل</label>
                        <input
                            required
                            type="text"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                            value={newTech.name}
                            onChange={e => setNewTech({...newTech, name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">رقم الهاتف</label>
                        <input
                            required
                            type="text"
                            placeholder="968xxxxxxx"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                            value={newTech.phone}
                            onChange={e => setNewTech({...newTech, phone: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">كلمة المرور</label>
                        <div className="relative">
                            <input
                                required
                                type={showPassword ? "text" : "password"}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                                value={newTech.password}
                                onChange={e => setNewTech({...newTech, password: e.target.value})}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setShowModal(false)}
                            className="flex-1 py-2 text-slate-600 hover:bg-slate-50 rounded-lg"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {submitting ? 'جاري الحفظ...' : 'حفظ البيانات'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* History Modal */}
      {historyModal.show && historyModal.tech && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">سجل طلبات {historyModal.tech.name}</h2>
                        <span className="text-sm text-slate-500">عرض كل المهام المسندة للفني</span>
                    </div>
                    <button onClick={() => setHistoryModal({show: false, tech: null})} className="text-slate-400 hover:text-red-500">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-0 overflow-y-auto flex-1">
                    {historyLoading ? (
                        <div className="p-12 text-center text-slate-500">جاري تحميل السجل...</div>
                    ) : techHistory.length === 0 ? (
                        <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                                <FileText className="text-slate-400" />
                            </div>
                            <p>لا يوجد طلبات سابقة لهذا الفني</p>
                        </div>
                    ) : (
                        <table className="w-full text-right">
                            <thead className="bg-slate-50 text-slate-600 font-medium text-sm sticky top-0">
                                <tr>
                                    <th className="px-6 py-4">رقم الطلب</th>
                                    <th className="px-6 py-4">التاريخ</th>
                                    <th className="px-6 py-4">العميل</th>
                                    <th className="px-6 py-4">النوع</th>
                                    <th className="px-6 py-4">الحالة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {techHistory.map((req: any) => (
                                    <tr key={req.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-mono text-slate-500">#{req.id}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{new Date(req.created_at).toLocaleDateString('ar-EG')}</td>
                                        <td className="px-6 py-4 font-medium">{req.user?.name || '---'}</td>
                                        <td className="px-6 py-4 text-slate-600">{req.service_type}</td>
                                        <td className="px-6 py-4">
                                            <span className={clsx(
                                                "px-2.5 py-1 rounded-full text-xs font-semibold flex items-center w-fit gap-1",
                                                req.status === 'completed' ? "bg-green-100 text-green-700" :
                                                req.status === 'pending' ? "bg-amber-100 text-amber-700" :
                                                "bg-blue-100 text-blue-700"
                                            )}>
                                                {req.status === 'completed' ? <CheckCircle size={12} /> :
                                                 req.status === 'pending' ? <Clock size={12} /> :
                                                 <Settings size={12} />}
                                                {req.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
             </div>
        </div>
      )}
    </div>
  );
}
