import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { getBaseUrl } from '../services/auth';
import { Calendar, User, Settings, AlertCircle, CheckCircle, Clock, MapPin, ArrowRight, Package, X, Image as ImageIcon, Camera, Star } from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import clsx from 'clsx';
import LoadingSpinner from '../components/LoadingSpinner';
import RequestTimeline from '../components/RequestTimeline';
import { useTranslation } from 'react-i18next';

// Fix Leaflet marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function InstallationRequestDetails() {
    const { t, i18n } = useTranslation();
    const { id } = useParams();
    const navigate = useNavigate();
    const [request, setRequest] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [newStatus, setNewStatus] = useState('');
    const [sendNotification, setSendNotification] = useState(true);

    // Assign Technician State
    const [statusModal, setStatusModal] = useState(false);
    const [assignModal, setAssignModal] = useState(false);
    const [assignDates, setAssignDates] = useState({ start: '', end: '' });
    const [technicians, setTechnicians] = useState([]);
    const [selectedTech, setSelectedTech] = useState<number | null>(null);

    // Rating State
    const [showRating, setShowRating] = useState(false);

    // Readiness Details State
    const [readinessModal, setReadinessModal] = useState(false);
    const [editReadiness, setEditReadiness] = useState<{ is_site_ready: boolean, details: string[] }>({
        is_site_ready: false,
        details: []
    });
    const productStatusOptions = ['quartz', 'appliances', 'order'];
    const orderStatusDetails = ['in_stock', 'shipping', 'production', 'on_site'];

    // Admin Rating Modal State
    const [rateModal, setRateModal] = useState(false);

    useEffect(() => {
        loadRequest();
    }, [id]);

    const loadRequest = async () => {
        try {
            const res = await api.get(`/installation-requests/${id}`);
            if (res.data.success) {
                setRequest(res.data.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <LoadingSpinner />;
    if (!request) return <div className="p-8 text-center text-red-500">{t('request_details.not_found')}</div>;

    const StatusBadge = ({ status }: { status: string }) => {
        const styles: any = {
            pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
            assigned: { bg: 'bg-blue-100', text: 'text-blue-700', icon: User },
            on_way: { bg: 'bg-purple-100', text: 'text-purple-700', icon: Clock },
            in_progress: { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: Settings },
            completed: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
            canceled: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle },
        };
        const config = styles[status] || styles.pending;
        const Icon = config.icon;
        return (
            <span className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold", config.bg, config.text)}>
                <Icon size={16} />
                {t(`status.${status}`)}
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
            const res = await api.post(`/installation-requests/${request.id}/status`, {
                status: newStatus,
                send_notification: sendNotification
            });
            if (res.data.success) {
                setRequest(res.data.data);
                setStatusModal(false);
                alert(t('request_details.update_success'));
            }
        } catch (error) {
            alert(t('request_details.update_error'));
        } finally {
            setUpdating(false);
        }
    };

    const fetchTechnicians = async (startDate?: string, endDate?: string) => {
        try {
            const sDate = startDate || request.scheduled_at;
            const eDate = endDate || request.end_date || request.scheduled_at;

            const res = await api.get('/admin/technicians/available', {
                params: {
                    start_date: sDate,
                    end_date: eDate
                }
            });
            if (res.data.success) {
                setTechnicians(res.data.data);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleOpenAssignModal = () => {
        const initialStart = request.scheduled_at ? new Date(request.scheduled_at).toISOString().split('T')[0] : '';
        const initialEnd = request.end_date ? new Date(request.end_date).toISOString().split('T')[0] : initialStart;

        setAssignDates({
            start: initialStart,
            end: initialEnd
        });

        // Initial fetch with current request dates
        fetchTechnicians(initialStart, initialEnd);
        setAssignModal(true);
    };

    const handleDateFilterChange = (key: 'start' | 'end', value: string) => {
        setAssignDates(prev => {
            const newDates = { ...prev, [key]: value };
            // If start changes and is after end, update end
            if (key === 'start' && newDates.end && value > newDates.end) {
                newDates.end = value;
            }
            fetchTechnicians(newDates.start, newDates.end);
            return newDates;
        });
    };

    const handleAssign = async () => {
        if (!selectedTech) return;
        setUpdating(true);
        try {
            const res = await api.post(`/installation-requests/${id}/assign`, {
                technician_id: selectedTech
            });
            if (res.data.success) {
                setRequest(res.data.data);
                setAssignModal(false);
                alert(t('requests.assigned_success'));
            }
        } catch (error) {
            alert(t('common.error'));
        } finally {
            setUpdating(false);
        }
    };

    const handleUpdateReadiness = async () => {
        try {
            setUpdating(true);
            const res = await api.put(`/installation-requests/${id}/readiness`, {
                is_site_ready: editReadiness.is_site_ready,
                readiness_details: editReadiness.details
            });
            if (res.data.success) {
                setRequest((prev: any) => ({
                    ...prev,
                    is_site_ready: editReadiness.is_site_ready,
                    readiness_details: editReadiness.details
                }));
                setReadinessModal(false);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setUpdating(false);
        }
    };

    const openReadinessModal = () => {
        setEditReadiness({
            is_site_ready: request.is_site_ready,
            details: request.readiness_details || []
        });
        setReadinessModal(true);
    };

    const toggleReadinessDetail = (item: string) => {
        setEditReadiness(prev => {
            const details = prev.details.includes(item)
                ? prev.details.filter(i => i !== item)
                : [...prev.details, item];
            return { ...prev, details };
        });
    };

    const tileUrl = i18n.language === 'ar'
        ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

    const attribution = i18n.language === 'ar'
        ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            {/* Header */}
            <div className="relative z-20 flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        <ArrowRight size={20} className="text-slate-600 rtl:rotate-180" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            {t('request_details.installation_title', { id: request.id })}
                            <StatusBadge status={request.status} />
                        </h1>
                        <div className="text-slate-500 flex items-center gap-2 text-sm mt-1">
                            <Clock size={14} />
                            {t('request_details.created_at')} {new Date(request.created_at).toLocaleDateString(i18n.language)}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleOpenAssignModal}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <User size={18} />
                        {t('requests.assign_technician')}
                    </button>
                    <button
                        onClick={() => setStatusModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
                    >
                        <Settings size={18} />
                        {t('request_details.change_status')}
                    </button>
                    {request.rating && (
                        <button
                            onClick={() => setRateModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors shadow-sm"
                        >
                            <Star size={18} />
                            {t('request_details.view_rating') || 'View Rating'}
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content (Right Side) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Installation Specific Details */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Package size={20} className="text-purple-500" />
                            {t('request_details.installation_data')}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <div className="text-sm text-slate-500 mb-1">{t('new_request.product_type')}</div>
                                <div className="font-semibold text-slate-900">{request.product_type}</div>
                                {request.invoice_number && (
                                    <div className="mt-1 text-xs text-blue-600 bg-blue-50 w-fit px-2 py-1 rounded">
                                        #{request.invoice_number}
                                    </div>
                                )}
                            </div>
                            <div>
                                <div className="text-sm text-slate-500 mb-1">{t('common.quantity')}</div>
                                <div className="font-semibold text-slate-900">{request.quantity}</div>
                            </div>
                            <div className="md:col-span-2">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-sm text-slate-500">{t('request_details.site_status')}</div>
                                    <button
                                        onClick={openReadinessModal}
                                        className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                    >
                                        <Settings size={14} />
                                        {t('common.edit')}
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 mb-4">
                                    <span className={clsx("px-2 py-1 rounded text-xs font-bold", request.is_site_ready ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                                        {request.is_site_ready ? t('request_details.ready') : t('request_details.not_ready')}
                                    </span>
                                </div>

                                {request.readiness_details && request.readiness_details.length > 0 && (
                                    <div className="space-y-3">
                                        {/* Filter and show Product Status */}
                                        {request.readiness_details.some((r: string) => productStatusOptions.includes(r)) && (
                                            <div>
                                                <div className="text-xs font-semibold text-slate-700 mb-1">{t('new_request.product_status_title')}</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {request.readiness_details.filter((r: string) => productStatusOptions.includes(r)).map((item: string, idx: number) => (
                                                        <span key={`prod-${idx}`} className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs border border-purple-100">
                                                            {t(`new_request.readiness_options.${item}`)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Filter and show Order Status */}
                                        {request.readiness_details.some((r: string) => orderStatusDetails.includes(r)) && (
                                            <div>
                                                <div className="text-xs font-semibold text-slate-700 mb-1">{t('new_request.order_status_title')}</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {request.readiness_details.filter((r: string) => orderStatusDetails.includes(r)).map((item: string, idx: number) => (
                                                        <span key={`ord-${idx}`} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs border border-blue-100">
                                                            {t(`new_request.readiness_options.${item}`)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            {request.notes && (
                                <div className="md:col-span-2">
                                    <div className="text-sm text-slate-500 mb-1">{t('new_request.additional_notes')}</div>
                                    <div className="text-slate-700 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                                        "{request.notes}"
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Map Section */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <MapPin size={20} className="text-blue-500" />
                            {t('request_details.client_location')}
                        </h2>
                        {request.latitude && request.longitude ? (
                            <div className="rounded-xl overflow-hidden border border-slate-100 h-[400px] relative z-0">

                                <MapContainer
                                    center={mapCenter}
                                    zoom={14}
                                    style={{ height: '100%', width: '100%' }}
                                >
                                    <TileLayer
                                        url={tileUrl}
                                        attribution={attribution}
                                    />
                                    <Marker position={mapCenter} />
                                </MapContainer>
                            </div>
                        ) : (
                            <div className="h-[200px] bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 border border-dashed border-slate-200">
                                {t('request_details.no_location')}
                            </div>
                        )}
                        <div className="mt-4 text-slate-600 text-sm flex items-start gap-2 bg-blue-50 p-3 rounded-lg">
                            <MapPin size={16} className="text-blue-500 mt-0.5" />
                            {request.address}
                        </div>
                    </div>

                    {/* Customer Signature section removed as requested */}


                    {/* Customer Rating Section - Enhanced Design */}
                    {request.rating && request.status === 'completed' && (
                        <div className="mt-8">
                            <button
                                onClick={() => setShowRating(!showRating)}
                                className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-amber-200 shadow-sm hover:bg-amber-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                                        <Star size={20} className="fill-amber-600" />
                                    </div>
                                    <div className="text-right">
                                        <h3 className="font-bold text-slate-900">{t('request_details.view_rating')}</h3>
                                        <div className="flex gap-1 mt-1">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    size={12}
                                                    className={clsx(
                                                        star <= Math.round((request.rating.product_rating + request.rating.service_rating) / 2)
                                                            ? "text-amber-400 fill-amber-400"
                                                            : "text-gray-300 fill-gray-300"
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className={clsx("transform transition-transform duration-200", showRating ? "rotate-180" : "")}>
                                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </button>

                            {showRating && (
                                <div className="mt-4 bg-gradient-to-br from-amber-50 via-orange-50/30 to-yellow-50/50 p-8 rounded-2xl border-2 border-amber-200/60 shadow-lg relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                                    {/* Decorative Background Elements */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/20 rounded-full -mr-16 -mt-16"></div>
                                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-200/20 rounded-full -ml-12 -mb-12"></div>

                                    {/* Header */}
                                    <div className="relative z-10 mb-6">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2.5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-md">
                                                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-bold text-slate-900">
                                                    {t('request_details.customer_rating')}
                                                </h2>
                                                <p className="text-sm text-slate-600">{t('rating.subtitle')}</p>
                                            </div>
                                        </div>

                                        {/* Overall Rating Summary */}
                                        <div className="flex items-center gap-4 mt-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-amber-100">
                                            <div className="text-center">
                                                <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">
                                                    {((request.rating.product_rating + request.rating.service_rating) / 2).toFixed(1)}
                                                </div>
                                                <div className="text-xs text-slate-500 font-medium mt-1">{t('rating.average')}</div>
                                            </div>
                                            <div className="h-12 w-px bg-amber-200"></div>
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <svg
                                                        key={star}
                                                        className={clsx("w-7 h-7 drop-shadow-md transition-transform hover:scale-110",
                                                            star <= Math.round((request.rating.product_rating + request.rating.service_rating) / 2)
                                                                ? "text-amber-400 fill-amber-400"
                                                                : "text-gray-300 fill-gray-300"
                                                        )}
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                                    </svg>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Rating Cards Grid */}
                                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        {/* Product Rating Card */}
                                        <div className="group bg-white p-5 rounded-xl border-2 border-amber-100 hover:border-amber-300 shadow-sm hover:shadow-md transition-all duration-300">
                                            <div className="flex items-start gap-3 mb-3">
                                                <div className="p-2 bg-amber-100 rounded-lg group-hover:bg-amber-200 transition-colors">
                                                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-sm font-semibold text-slate-700 mb-1">
                                                        {t('rating.product_satisfaction')}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex gap-0.5">
                                                            {[1, 2, 3, 4, 5].map((star) => (
                                                                <svg
                                                                    key={star}
                                                                    className={clsx("w-5 h-5 transition-all",
                                                                        star <= (request.rating.product_rating || 0)
                                                                            ? "text-amber-400 fill-amber-400 drop-shadow-sm"
                                                                            : "text-gray-300 fill-gray-300"
                                                                    )}
                                                                    viewBox="0 0 24 24"
                                                                >
                                                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                                                </svg>
                                                            ))}
                                                        </div>
                                                        <span className="text-lg font-bold text-slate-900">
                                                            {request.rating.product_rating}<span className="text-sm text-slate-500">/5</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-gradient-to-r from-amber-400 to-amber-500 h-2 rounded-full transition-all duration-500"
                                                    style={{ width: `${(request.rating.product_rating / 5) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        {/* Service Rating Card */}
                                        <div className="group bg-white p-5 rounded-xl border-2 border-green-100 hover:border-green-300 shadow-sm hover:shadow-md transition-all duration-300">
                                            <div className="flex items-start gap-3 mb-3">
                                                <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                                                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-sm font-semibold text-slate-700 mb-1">
                                                        {t('rating.service_satisfaction')}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex gap-0.5">
                                                            {[1, 2, 3, 4, 5].map((star) => (
                                                                <svg
                                                                    key={star}
                                                                    className={clsx("w-5 h-5 transition-all",
                                                                        star <= (request.rating.service_rating || 0)
                                                                            ? "text-green-500 fill-green-500 drop-shadow-sm"
                                                                            : "text-gray-300 fill-gray-300"
                                                                    )}
                                                                    viewBox="0 0 24 24"
                                                                >
                                                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                                                </svg>
                                                            ))}
                                                        </div>
                                                        <span className="text-lg font-bold text-slate-900">
                                                            {request.rating.service_rating}<span className="text-sm text-slate-500">/5</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-gradient-to-r from-green-400 to-green-500 h-2 rounded-full transition-all duration-500"
                                                    style={{ width: `${(request.rating.service_rating / 5) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Additional Info */}
                                    <div className="relative z-10 space-y-3">
                                        {/* How Found Us */}
                                        {request.rating.how_found_us && (
                                            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-blue-100">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                    </svg>
                                                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                                        {t('rating.how_found_us')}
                                                    </span>
                                                </div>
                                                <div className="text-sm font-medium text-slate-900 bg-blue-50 px-3 py-1.5 rounded-lg inline-block">
                                                    {request.rating.how_found_us}
                                                </div>
                                            </div>
                                        )}

                                        {/* Customer Feedback */}
                                        {request.rating.customer_notes && (
                                            <div className="bg-white/80 backdrop-blur-sm p-5 rounded-xl border border-purple-100">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                                    </svg>
                                                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                                        {t('rating.customer_feedback')}
                                                    </span>
                                                </div>
                                                <div className="relative">
                                                    <div className="text-slate-700 leading-relaxed bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg border-l-4 border-purple-400">
                                                        <svg className="w-6 h-6 text-purple-200 absolute top-2 left-2" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                                                        </svg>
                                                        <p className="relative z-10 italic pl-8">
                                                            "{request.rating.customer_notes}"
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Rating Image */}
                                        {request.rating.image_url && (
                                            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-blue-100">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <ImageIcon size={16} className="text-blue-500" />
                                                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                                        {t('rating.rating_image')}
                                                    </span>
                                                </div>
                                                <div className="relative group aspect-video rounded-lg overflow-hidden border border-slate-200 cursor-pointer shadow-sm hover:shadow-md transition-all max-w-sm">
                                                    <img
                                                        src={request.rating.image_url}
                                                        alt="Rating"
                                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                        onClick={() => window.open(request.rating.image_url, '_blank')}
                                                    />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Sidebar (Left Side) */}
                <div className="space-y-6">
                    {/* Client Info */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h2 className="text-lg font-bold text-slate-900 mb-4">{t('request_details.client_info')}</h2>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xl">
                                {request.user?.name.charAt(0)}
                            </div>
                            <div>
                                <div className="font-bold text-slate-900">{request.user?.name}</div>
                                <div className="text-sm text-slate-500" dir="ltr">{request.user?.phone}</div>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate(`/dashboard/users/${request.user?.id}`)}
                            className="w-full py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
                        >
                            {t('request_details.view_client_profile')}
                        </button>
                    </div>

                    {/* Schedule Info */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h2 className="text-lg font-bold text-slate-900 mb-4">{t('request_details.schedule_details')}</h2>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500">{t('common.time')}</div>
                                    <div className="font-medium text-slate-900" dir="ltr">
                                        {new Date(request.scheduled_at).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                                        <Calendar size={20} />
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500 font-medium mb-1">{t('requests.scheduled_at')}</div>
                                        <div className="font-semibold text-slate-900">
                                            {new Date(request.scheduled_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                                    <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
                                        <Calendar size={20} />
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500 font-medium mb-1">{t('requests.end_date')}</div>
                                        <div className="font-semibold text-slate-900">
                                            {request.end_date ? new Date(request.end_date).toLocaleDateString() : t('common.undefined')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Technician Info */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h2 className="text-lg font-bold text-slate-900 mb-4">{t('request_details.technician_assigned')}</h2>
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
                                {t('request_details.no_technician')}
                            </div>
                        )}

                    </div>

                    {/* Request History Timeline */}
                    <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
                        <RequestTimeline activities={request.activities || []} />
                    </div>
                </div>

            </div>

            {/* Customer Images Section */}
            {request.attachments && request.attachments.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <ImageIcon className="text-purple-600" size={20} />
                        <h3 className="text-lg font-bold text-slate-900">
                            {t('request_details.customer_images')}
                        </h3>
                        <span className="text-sm text-slate-500">
                            ({request.attachments.length})
                        </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {request.attachments.map((img: any, idx: number) => (
                            <img
                                key={idx}
                                src={getBaseUrl() + '/storage/' + img.file_path}
                                alt={`Customer ${idx + 1}`}
                                className="w-full h-48 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Technician Images Section */}
            {request.technician_images && request.technician_images.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Camera className="text-blue-600" size={20} />
                        <h3 className="text-lg font-bold text-slate-900">
                            {t('request_details.technician_images')}
                        </h3>
                        <span className="text-sm text-slate-500">
                            ({request.technician_images.length})
                        </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {request.technician_images.map((img: any, idx: number) => (
                            <div key={idx} className="relative group">
                                <img
                                    src={img.image_url}
                                    alt={`Technician ${idx + 1}`}
                                    className="w-full h-48 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                                />
                                <div className="absolute bottom-2 left-2 right-2 bg-black/70 text-white text-xs p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                    <p className="font-medium">{img.technician?.name}</p>
                                    <p className="text-slate-300">
                                        {new Date(img.uploaded_at).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Readiness Edit Modal */}
            {readinessModal && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">

                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">{t('request_details.edit_readiness')}</h2>
                            <button onClick={() => setReadinessModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Site Ready Toggle */}
                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <input
                                    type="checkbox"
                                    id="isSiteReady"
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                    checked={editReadiness.is_site_ready}
                                    onChange={e => setEditReadiness(prev => ({ ...prev, is_site_ready: e.target.checked }))}
                                />
                                <label htmlFor="isSiteReady" className="font-medium text-slate-900 cursor-pointer select-none">
                                    {t('new_request.is_site_ready')}
                                </label>
                            </div>

                            {/* Details Selection */}
                            <div className="space-y-4">
                                <div>
                                    <div className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                        <Package size={16} />
                                        {t('new_request.product_status_title')}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {productStatusOptions.map(option => (
                                            <div
                                                key={option}
                                                onClick={() => toggleReadinessDetail(option)}
                                                className={clsx(
                                                    "px-3 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-all text-center select-none",
                                                    editReadiness.details.includes(option)
                                                        ? "bg-purple-50 border-purple-200 text-purple-700"
                                                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                                )}
                                            >
                                                {t(`new_request.readiness_options.${option}`)}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                        <Clock size={16} />
                                        {t('new_request.order_status_title')}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {orderStatusDetails.map(option => (
                                            <div
                                                key={option}
                                                onClick={() => toggleReadinessDetail(option)}
                                                className={clsx(
                                                    "px-3 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-all text-center select-none",
                                                    editReadiness.details.includes(option)
                                                        ? "bg-blue-50 border-blue-200 text-blue-700"
                                                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                                )}
                                            >
                                                {t(`new_request.readiness_options.${option}`)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                                <button
                                    onClick={() => setReadinessModal(false)}
                                    className="flex-1 py-2 text-slate-600 hover:bg-slate-50 rounded-lg"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    onClick={handleUpdateReadiness}
                                    disabled={updating}
                                    className="flex-1 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
                                >
                                    {updating ? t('common.saving') : t('common.save_changes')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Update Modal */}
            {statusModal && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">

                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h2 className="text-xl font-bold mb-4">{t('request_details.update_status_modal')}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">{t('request_details.new_status')}</label>
                                <select
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                    value={newStatus}
                                    onChange={e => setNewStatus(e.target.value)}
                                >
                                    <option value="">{t('request_details.select_status')}</option>
                                    <option value="pending">{t('status.pending')}</option>
                                    <option value="assigned">{t('status.assigned')}</option>
                                    <option value="on_way">{t('status.on_way')}</option>
                                    <option value="in_progress">{t('status.in_progress')}</option>
                                    <option value="completed">{t('status.completed')}</option>
                                    <option value="canceled">{t('status.canceled')}</option>
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
                                    {t('request_details.notify_client')}
                                </label>
                            </div>

                            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                                <button
                                    onClick={() => setStatusModal(false)}
                                    className="flex-1 py-2 text-slate-600 hover:bg-slate-50 rounded-lg"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    onClick={handleUpdateStatus}
                                    disabled={!newStatus || updating}
                                    className="flex-1 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
                                >
                                    {updating ? t('common.updating') : t('common.save_changes')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Technician Modal */}
            {assignModal && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">

                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">{t('requests.assign_technician')}</h2>
                            <button onClick={() => setAssignModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Date Filters inside Modal */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4 grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">{t('requests.scheduled_at')}</label>
                                <input
                                    type="date"
                                    value={assignDates.start}
                                    onChange={(e) => handleDateFilterChange('start', e.target.value)}
                                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">{t('requests.end_date')}</label>
                                <input
                                    type="date"
                                    value={assignDates.end}
                                    min={assignDates.start}
                                    onChange={(e) => handleDateFilterChange('end', e.target.value)}
                                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            {technicians.length === 0 ? (
                                <div className="text-center text-slate-500 py-4">{t('technicians.no_techs')}</div>
                            ) : (
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {technicians.map((tech: any) => (
                                        <div
                                            key={tech.id}
                                            onClick={() => setSelectedTech(tech.id)}
                                            className={clsx(
                                                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                                                selectedTech === tech.id ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"
                                            )}
                                        >
                                            <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-600">
                                                {tech.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-900">{tech.name}</div>
                                                <div className="text-xs text-slate-500">{tech.phone}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                                <button
                                    onClick={() => setAssignModal(false)}
                                    className="flex-1 py-2 text-slate-600 hover:bg-slate-50 rounded-lg"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    onClick={handleAssign}
                                    disabled={!selectedTech || updating}
                                    className="flex-1 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
                                >
                                    {updating ? t('common.saving') : t('common.confirm')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Rating Modal (Read-Only) - Compact Version */}
            {rateModal && request.rating && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200 my-8 overflow-hidden">
                        <div className="relative bg-gradient-to-br from-amber-50 via-orange-50/30 to-yellow-50/50 p-5 md:p-6">

                            {/* Close Button */}
                            <button
                                onClick={() => setRateModal(false)}
                                className="absolute top-3 right-3 p-1.5 bg-white/80 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-colors z-20 shadow-sm"
                            >
                                <X size={18} />
                            </button>

                            {/* Decorative Background Elements */}
                            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-200/20 rounded-full -mr-12 -mt-12 pointer-events-none"></div>
                            <div className="absolute bottom-0 left-0 w-16 h-16 bg-orange-200/20 rounded-full -ml-8 -mb-8 pointer-events-none"></div>

                            {/* Header */}
                            <div className="relative z-10 mb-5 text-center">
                                <div className="inline-flex items-center justify-center p-2.5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-md mb-3">
                                    <Star className="w-6 h-6 text-white fill-white" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900">
                                    {t('request_details.customer_rating') || 'Customer Rating'}
                                </h2>
                                <p className="text-xs text-slate-600 mt-0.5">{t('rating.subtitle') || 'Feedback from the customer'}</p>
                            </div>

                            {/* Overall Rating Summary */}
                            <div className="relative z-10 flex flex-col items-center justify-center mb-6">
                                <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600 mb-1">
                                    {((request.rating.product_rating + request.rating.service_rating) / 2).toFixed(1)}
                                </div>
                                <div className="flex gap-0.5 mb-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            size={20}
                                            className={clsx(
                                                star <= Math.round((request.rating.product_rating + request.rating.service_rating) / 2)
                                                    ? "text-amber-400 fill-amber-400 drop-shadow-sm"
                                                    : "text-gray-300 fill-gray-300"
                                            )}
                                        />
                                    ))}
                                </div>
                                <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{t('rating.average') || 'Average Rating'}</div>
                            </div>

                            <div className="space-y-4 relative z-10">
                                {/* Rating Cards Grid */}
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Product Rating Card */}
                                    <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-sm">
                                        <div className="flex flex-col items-center text-center mb-2">
                                            <span className="text-xs font-semibold text-slate-700 mb-1">{t('rating.product_satisfaction') || 'Product'}</span>
                                            <span className="font-bold text-slate-900 text-lg">{request.rating.product_rating}<span className="text-slate-400 text-[10px] font-normal">/5</span></span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                                            <div
                                                className="bg-gradient-to-r from-amber-400 to-amber-500 h-1.5 rounded-full"
                                                style={{ width: `${(request.rating.product_rating / 5) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Service Rating Card */}
                                    <div className="bg-white p-3 rounded-xl border border-green-100 shadow-sm">
                                        <div className="flex flex-col items-center text-center mb-2">
                                            <span className="text-xs font-semibold text-slate-700 mb-1">{t('rating.service_satisfaction') || 'Service'}</span>
                                            <span className="font-bold text-slate-900 text-lg">{request.rating.service_rating}<span className="text-slate-400 text-[10px] font-normal">/5</span></span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                                            <div
                                                className="bg-gradient-to-r from-green-400 to-green-500 h-1.5 rounded-full"
                                                style={{ width: `${(request.rating.service_rating / 5) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>

                                {/* How Found Us & Notes Row */}
                                <div className="bg-white/60 p-3 rounded-xl border border-slate-200/60 space-y-2">
                                    <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                                        <span className="text-slate-500">{t('rating.how_found_us') || 'Source'}:</span>
                                        <span className="font-medium text-slate-900 capitalize bg-white px-2 py-0.5 rounded border border-slate-200">
                                            {request.rating.how_found_us}
                                        </span>
                                    </div>

                                    {/* Customer Notes */}
                                    {request.rating.customer_notes && (
                                        <div>
                                            <div className="text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">{t('rating.customer_feedback') || 'Feedback'}</div>
                                            <p className="text-slate-700 italic text-xs leading-relaxed line-clamp-3">"{request.rating.customer_notes}"</p>
                                        </div>
                                    )}
                                </div>

                                {/* Image (Collapsible or Compact) */}
                                {request.rating.image_url && (
                                    <div className="mt-3">
                                        <div className="text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">{t('rating.rating_image') || 'Attached Image'}</div>
                                        <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm h-32 relative group">
                                            <img
                                                src={request.rating.image_url}
                                                alt="Rating"
                                                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                                                onClick={() => window.open(request.rating.image_url, '_blank')}
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <span className="bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">Click to View</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer Action - Compact */}
                        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                            <button
                                onClick={() => setRateModal(false)}
                                className="text-slate-500 hover:text-slate-800 text-xs font-medium transition-colors"
                            >
                                {t('common.close') || 'Close'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
