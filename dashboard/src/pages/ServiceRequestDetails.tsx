import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/auth';
import { Calendar, User, Settings, AlertCircle, CheckCircle, Clock, MapPin, ArrowRight } from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import clsx from 'clsx';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTranslation } from 'react-i18next';

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
    const { t, i18n } = useTranslation();
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
            const res = await api.post(`/requests/${request.id}/status`, {
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
                            {t('request_details.service_title', {id: request.id})}
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

                    {/* Description */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h2 className="text-lg font-bold text-slate-900 mb-4">{t('request_details.problem_description')}</h2>
                        <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                            {request.description}
                        </p>
                    </div>

                    {/* Installation Details (Only for Installation Requests) */}
                    {request.service_type === 'installation' && request.details && (
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Settings size={20} className="text-purple-500" />
                                {t('request_details.installation_data')}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <div className="text-sm text-slate-500 mb-1">{t('new_request.product_type')}</div>
                                    <div className="font-semibold text-slate-900">{request.details.product_type}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-slate-500 mb-1">{t('common.quantity')}</div>
                                    <div className="font-semibold text-slate-900">{request.details.quantity}</div>
                                </div>
                                <div className="md:col-span-2">
                                    <div className="text-sm text-slate-500 mb-1">{t('request_details.site_status')}</div>
                                    <div className="flex items-center gap-2">
                                        <span className={clsx("px-2 py-1 rounded text-xs font-bold", request.details.is_site_ready ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                                            {request.details.is_site_ready ? t('request_details.ready') : t('request_details.not_ready')}
                                        </span>
                                    </div>
                                </div>
                                {request.details.readiness_details && request.details.readiness_details.length > 0 && (
                                    <div className="md:col-span-2">
                                        <div className="text-sm text-slate-500 mb-2">{t('new_request.completed_preparations')}</div>
                                        <div className="flex flex-wrap gap-2">
                                            {request.details.readiness_details.map((item: string, idx: number) => (
                                                <span key={idx} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs border border-slate-200">
                                                    {t(`new_request.readiness_options.${item}`) !== `new_request.readiness_options.${item}` ? t(`new_request.readiness_options.${item}`) : item}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {request.details.notes && (
                                    <div className="md:col-span-2">
                                        <div className="text-sm text-slate-500 mb-1">{t('new_request.additional_notes')}</div>
                                        <div className="text-slate-700 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                                            "{request.details.notes}"
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Images Gallery */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h2 className="text-lg font-bold text-slate-900 mb-4">{t('request_details.attachments')}</h2>
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
                                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                    <Settings size={20} />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500">{t('request_details.service_type')}</div>
                                    <div className="font-medium text-slate-900">{request.service_type}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500">{t('common.date')}</div>
                                    <div className="font-medium text-slate-900" dir="ltr">
                                        {new Date(request.scheduled_at).toLocaleDateString(i18n.language)}
                                    </div>
                                </div>
                            </div>
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
        </div>
    );
}
