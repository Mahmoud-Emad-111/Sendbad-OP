import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { getBaseUrl } from '../services/auth';
import { Calendar, User, Settings, AlertCircle, CheckCircle, Clock, MapPin, ArrowRight, Package, X } from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import clsx from 'clsx';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTranslation } from 'react-i18next';

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

    // Readiness Details State
    const [readinessModal, setReadinessModal] = useState(false);
    const [editReadiness, setEditReadiness] = useState<{is_site_ready: boolean, details: string[]}>({
        is_site_ready: false,
        details: []
    });
    const productStatusOptions = ['quartz', 'appliances', 'order'];
    const orderStatusDetails = ['in_stock', 'shipping', 'production', 'on_site'];

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

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
    });

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
                alert(t('requests.assigned_success') || 'Technician Assigned Successfully');
            }
        } catch (error) {
            alert(t('common.error') || 'Error assigning technician');
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
                        <ArrowRight size={20} className="text-slate-600 rtl:rotate-180" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            {t('request_details.installation_title', {id: request.id})}
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
                                     {t('common.loading_map')}
                                 </div>
                             )
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

                    {/* Images Gallery */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h2 className="text-lg font-bold text-slate-900 mb-4">{t('request_details.attachments')}</h2>
                         {request.attachments && request.attachments.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {request.attachments.map((img: any) => (
                                    <div key={img.id} className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 group cursor-pointer">
                                        <img
                                            src={`${getBaseUrl()}/storage/${img.file_path}`}
                                            alt="Request Attachment"
                                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                        />
                                        <a
                                            href={`${getBaseUrl()}/storage/${img.file_path}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-medium"
                                        >
                                            {t('request_details.view_image')}
                                        </a>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-slate-50 rounded-lg text-slate-400 text-sm border border-dashed border-slate-200">
                                {t('request_details.no_images')}
                            </div>
                        )}
                    </div>


                    {/* Customer Rating Section - Enhanced Design */}
                    {request.rating && request.status === 'completed' && (
                        <div className="bg-gradient-to-br from-amber-50 via-orange-50/30 to-yellow-50/50 p-8 rounded-2xl border-2 border-amber-200/60 shadow-lg relative overflow-hidden">
                            {/* Decorative Background Elements */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/20 rounded-full -mr-16 -mt-16"></div>
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-200/20 rounded-full -ml-12 -mb-12"></div>

                            {/* Header */}
                            <div className="relative z-10 mb-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2.5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-md">
                                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900">
                                            {t('request_details.customer_rating')}
                                        </h2>
                                        <p className="text-sm text-slate-600">تقييم العميل للخدمة والمنتج</p>
                                    </div>
                                </div>

                                {/* Overall Rating Summary */}
                                <div className="flex items-center gap-4 mt-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-amber-100">
                                    <div className="text-center">
                                        <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">
                                            {((request.rating.product_rating + request.rating.service_rating) / 2).toFixed(1)}
                                        </div>
                                        <div className="text-xs text-slate-500 font-medium mt-1">متوسط التقييم</div>
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
                                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
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
                                                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
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
                                                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
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
                                                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
                                                </svg>
                                                <p className="relative z-10 italic pl-8">
                                                    "{request.rating.customer_notes}"
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
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
                                        {new Date(request.scheduled_at).toLocaleTimeString(i18n.language, {hour: '2-digit', minute:'2-digit'})}
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
                </div>
            </div>

             {/* Readiness Edit Modal */}
            {readinessModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">{t('request_details.edit_readiness') || 'Edit Site Readiness'}</h2>
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
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
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
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
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
        </div>
    );
}
