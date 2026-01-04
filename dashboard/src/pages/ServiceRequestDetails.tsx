import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/auth';
import { Calendar, User, Settings, AlertCircle, CheckCircle, Clock, MapPin, ArrowRight } from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import clsx from 'clsx';

const API_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace('/api', '');

const containerStyle = {
    width: '100%',
    height: '400px',
    borderRadius: '0.75rem'
};

const mapOptions = {
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: true,
};

export default function ServiceRequestDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [request, setRequest] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [statusModal, setStatusModal] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [newStatus, setNewStatus] = useState('');
    const [sendNotification, setSendNotification] = useState(true);

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
    });

    useEffect(() => {
        loadRequest();
    }, [id]);

    const loadRequest = async () => {
        try {
            // Re-using list API but filtering for 1 (Ideally should have show endpoint)
            // For now, let's assume we fetch all and find, or if we had a show endpoint.
            // Since we don't have a show endpoint in controller yet (only index), we can use index and filter client side
            // OR better, create a show endpoint. But keeping it simple:
            const res = await api.get('/requests');
            if (res.data.success) {
                const found = res.data.data.find((r: any) => r.id === Number(id));
                setRequest(found);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center">جاري تحميل التفاصيل...</div>;
    if (!request) return <div className="p-8 text-center text-red-500">الطلب غير موجود</div>;

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
            <span className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold", config.bg, config.text)}>
                <Icon size={16} />
                {config.label}
            </span>
        );
    };

    const mapCenter = {
        lat: Number(request.latitude) || 23.5859,
        lng: Number(request.longitude) || 58.4059
    };

    const handleUpdateStatus = async () => {
        if (!newStatus) return;
        setUpdating(true);
        try {
            const res = await api.post(`/requests/${request.id}/status`, {
                status: newStatus,
                send_notification: sendNotification
            });
            if (res.data.success) {
                setRequest(res.data.data);
                setStatusModal(false);
                alert('تم تحديث الحالة بنجاح');
            }
        } catch (error) {
            alert('حدث خطأ أثناء التحديث');
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                 <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        <ArrowRight size={20} className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            تفاصيل الطلب #{request.id}
                            <StatusBadge status={request.status} />
                        </h1>
                        <div className="text-slate-500 flex items-center gap-2 text-sm mt-1">
                            <Clock size={14} />
                            تم الإنشاء: {new Date(request.created_at).toLocaleDateString()}
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => setStatusModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
                >
                    <Settings size={18} />
                    تغيير الحالة
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content (Right Side) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Map Section */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <MapPin size={20} className="text-blue-500" />
                            موقع العميل
                        </h2>
                        {request.latitude && request.longitude ? (
                             isLoaded ? (
                                <div className="rounded-xl overflow-hidden border border-slate-100">
                                    <GoogleMap
                                        mapContainerStyle={containerStyle}
                                        center={mapCenter}
                                        zoom={14}
                                        options={mapOptions}
                                    >
                                        <Marker position={mapCenter} />
                                    </GoogleMap>
                                </div>
                             ) : (
                                 <div className="h-[400px] bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                                     جاري تحميل الخريطة...
                                 </div>
                             )
                        ) : (
                            <div className="h-[200px] bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 border border-dashed border-slate-200">
                                لا يوجد موقع مسجل لهذا الطلب
                            </div>
                        )}
                        <div className="mt-4 text-slate-600 text-sm flex items-start gap-2 bg-blue-50 p-3 rounded-lg">
                            <MapPin size={16} className="text-blue-500 mt-0.5" />
                            {request.address}
                        </div>
                    </div>

                    {/* Description */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h2 className="text-lg font-bold text-slate-900 mb-4">وصف المشكلة</h2>
                        <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                            {request.description}
                        </p>
                    </div>

                    {/* Images Gallery */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h2 className="text-lg font-bold text-slate-900 mb-4">المرفقات والصور</h2>
                         {request.attachments && request.attachments.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {request.attachments.map((img: any) => (
                                    <div key={img.id} className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 group cursor-pointer">
                                        <img
                                            src={`${API_URL}/storage/${img.file_path}`}
                                            alt="Request Attachment"
                                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                        />
                                        <a
                                            href={`${API_URL}/storage/${img.file_path}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-medium"
                                        >
                                            تكبير الصورة
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
                </div>

                {/* Sidebar (Left Side) */}
                <div className="space-y-6">
                    {/* Client Info */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h2 className="text-lg font-bold text-slate-900 mb-4">بيانات العميل</h2>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xl">
                                {request.user?.name.charAt(0)}
                            </div>
                            <div>
                                <div className="font-bold text-slate-900">{request.user?.name}</div>
                                <div className="text-sm text-slate-500" dir="ltr">{request.user?.phone}</div>
                            </div>
                        </div>
                        <button className="w-full py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium">
                            عرض ملف العميل
                        </button>
                    </div>

                    {/* Schedule Info */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h2 className="text-lg font-bold text-slate-900 mb-4">تفاصيل الموعد</h2>
                        <div className="space-y-4">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                    <Settings size={20} />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500">نوع الخدمة</div>
                                    <div className="font-medium text-slate-900">{request.service_type}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500">التاريخ</div>
                                    <div className="font-medium text-slate-900" dir="ltr">
                                        {new Date(request.scheduled_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500">الوقت</div>
                                    <div className="font-medium text-slate-900" dir="ltr">
                                        {new Date(request.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Technician Info */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h2 className="text-lg font-bold text-slate-900 mb-4">الفني المسؤول</h2>
                        {request.technician ? (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center font-bold">
                                    {request.technician.name.charAt(0)}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900">{request.technician.name}</div>
                                    <div className="text-xs text-slate-500" dir="ltr">{request.technician.phone}</div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-4 text-slate-400 text-sm">
                                لم يتم تعيين فني بعد
                            </div>
                        )}
                    </div>
                </div>
            </div>

             {/* Status Update Modal */}
             {statusModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h2 className="text-xl font-bold mb-4">تحديث حالة الطلب</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">الحالة الجديدة</label>
                                <select
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                    value={newStatus}
                                    onChange={e => setNewStatus(e.target.value)}
                                >
                                    <option value="">-- اختر الحالة --</option>
                                    <option value="pending">قيد الانتظار</option>
                                    <option value="assigned">تم الإسناد</option>
                                    <option value="on_way">الفني في الطريق</option>
                                    <option value="in_progress">جاري التنفيذ</option>
                                    <option value="completed">مكتمل</option>
                                    <option value="canceled">ملغي</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <input
                                    type="checkbox"
                                    id="notifyClient"
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    checked={sendNotification}
                                    onChange={e => setSendNotification(e.target.checked)}
                                />
                                <label htmlFor="notifyClient" className="text-sm font-medium text-slate-700 select-none cursor-pointer">
                                    إرسال إشعار للعميل بالتحديث
                                </label>
                            </div>

                            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                                <button
                                    onClick={() => setStatusModal(false)}
                                    className="flex-1 py-2 text-slate-600 hover:bg-slate-50 rounded-lg"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={handleUpdateStatus}
                                    disabled={!newStatus || updating}
                                    className="flex-1 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
                                >
                                    {updating ? 'جاري التحديث...' : 'حفظ التغييرات'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
