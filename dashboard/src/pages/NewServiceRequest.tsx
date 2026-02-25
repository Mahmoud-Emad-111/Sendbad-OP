import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { toast } from 'react-toastify';
import { ArrowRight, MapPin, Search, Upload, CheckCircle, XCircle, Info, Loader, Calendar } from 'lucide-react';
import api, { adminService } from '../services/auth';
import clsx from 'clsx';
import L from 'leaflet';
import { useTranslation } from 'react-i18next';

// Fix Leaflet marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Location Parser Function
function parseGoogleMapsLink(url: string): { lat: number; lng: number; isShortened?: boolean } | null {
    if (!url || !url.trim()) return null;

    try {
        // Check if it's a shortened URL (goo.gl or maps.app.goo.gl)
        if (url.includes('goo.gl') || url.includes('maps.app.goo.gl')) {
            // Return special flag for shortened URLs
            return { lat: 0, lng: 0, isShortened: true };
        }

        // Pattern 1: ?q=lat,lng or &q=lat,lng
        const qPattern = /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/;
        const qMatch = url.match(qPattern);
        if (qMatch) {
            return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
        }

        // Pattern 2: @lat,lng,zoom
        const atPattern = /@(-?\d+\.?\d*),(-?\d+\.?\d*)/;
        const atMatch = url.match(atPattern);
        if (atMatch) {
            return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
        }

        // Pattern 3: /place/@lat,lng or /place/name/@lat,lng
        const placePattern = /place\/[^/]*@?(-?\d+\.?\d*),(-?\d+\.?\d*)/;
        const placeMatch = url.match(placePattern);
        if (placeMatch) {
            return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) };
        }

        return null;
    } catch (error) {
        console.error('Error parsing location link:', error);
        return null;
    }
}

// Location Picker Component
function LocationMarker({ position, setPosition }: { position: { lat: number, lng: number } | null, setPosition: (pos: { lat: number, lng: number }) => void }) {
    useMapEvents({
        click(e) {
            setPosition(e.latlng);
        },
    });

    return position === null ? null : (
        <Marker position={position}></Marker>
    );
}

export default function NewServiceRequest() {
    const { t, i18n } = useTranslation();
    const tileUrl = i18n.language === 'ar'
        ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

    const attribution = i18n.language === 'ar'
        ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // Phone Lookup State
    const [phone, setPhone] = useState('');
    const [lookingUp, setLookingUp] = useState(false);
    const [userData, setUserData] = useState<any>(null);

    // Form State
    const [selectedOrder, setSelectedOrder] = useState('');
    const [formData, setFormData] = useState({
        service_type: 'maintenance',
        description: '',
        address: '',
        scheduled_at: '',
        end_date: '',
    });

    // Location State
    const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
    const [locationInputMethod, setLocationInputMethod] = useState<'map' | 'link'>('map');
    const [locationLink, setLocationLink] = useState('');
    const [linkParsingError, setLinkParsingError] = useState<string | null>(null);

    // Images
    const [images, setImages] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);

    const handlePhoneLookup = async () => {
        if (!phone || phone.length < 8) {
            toast.error(t('new_service_request.invalid_phone'));
            return;
        }

        setLookingUp(true);
        try {
            const res = await adminService.lookupUserByPhone(phone);
            if (res.success) {
                setUserData(res.data);
                // Auto-fill form
                setFormData(prev => ({
                    ...prev,
                    address: res.data.user.address || prev.address
                }));

                // Show warning if not linked to Odoo
                if (!res.data.odoo.linked) {
                    toast.warning(t('new_service_request.user_not_on_odoo'));
                } else {
                    toast.success(t('new_service_request.user_found'));
                }
            }
        } catch (error: any) {
            if (error.response?.status === 404) {
                toast.error(t('new_service_request.user_not_found'));
            } else {
                toast.error(t('common.error'));
            }
        } finally {
            setLookingUp(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setImages(prev => [...prev, ...newFiles]);

            const newUrls = newFiles.map(file => URL.createObjectURL(file));
            setPreviewUrls(prev => [...prev, ...newUrls]);
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    };

    const handleLocationLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const url = e.target.value;
        setLocationLink(url);

        if (url.trim()) {
            const coords = parseGoogleMapsLink(url);
            if (coords && coords.isShortened) {
                setLinkParsingError('الرجاء فتح الرابط في المتصفح ونسخ الرابط الكامل (Full URL)');
                setPosition(null);
            } else if (coords) {
                setPosition(coords);
                setLinkParsingError(null);
                toast.success(`${t('common.latitude')}: ${coords.lat.toFixed(6)}, ${t('common.longitude')}: ${coords.lng.toFixed(6)}`);
            } else {
                setLinkParsingError(t('new_request.invalid_link') || 'رابط غير صحيح');
                setPosition(null);
            }
        } else {
            setPosition(null);
            setLinkParsingError(null);
        }
    };

    const handleLocationMethodChange = (method: 'map' | 'link') => {
        setLocationInputMethod(method);
        // Clear position and errors when switching methods
        setPosition(null);
        setLocationLink('');
        setLinkParsingError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!userData) {
            toast.error(t('new_service_request.lookup_first'));
            return;
        }

        if (!position) {
            toast.error(t('new_request.error_location'));
            return;
        }

        if (!formData.description || !formData.scheduled_at) {
            toast.error(t('new_service_request.fill_required'));
            return;
        }

        setLoading(true);

        try {
            const data = new FormData();
            if (userData.user.id) {
                data.append('user_id', userData.user.id);
            } else {
                data.append('new_user_name', userData.user.name);
                data.append('new_user_phone', userData.user.phone);
            }
            data.append('service_type', formData.service_type);
            data.append('description', formData.description);
            data.append('address', formData.address);
            data.append('scheduled_at', formData.scheduled_at);
            data.append('end_date', formData.end_date || formData.scheduled_at);
            if (selectedOrder) data.append('invoice_number', selectedOrder);
            data.append('latitude', position ? position.lat.toString() : '');
            data.append('longitude', position ? position.lng.toString() : '');

            images.forEach((image) => {
                data.append('images[]', image);
            });

            const response = await api.post('/admin/requests', data);

            if (response.data.success) {
                toast.success(t('new_service_request.success'));
                navigate('/dashboard/requests');
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || t('login.server_error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header */}
            <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ArrowRight className="text-slate-600 rtl:rotate-180" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{t('new_service_request.title')}</h1>
                    <p className="text-slate-500 text-sm mt-1">{t('new_service_request.subtitle')}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* RIGHT COLUMN: Service Request Info */}
                <div className="space-y-6">

                    {/* Phone Lookup */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 rounded-2xl border border-blue-200 shadow-sm">
                        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4">
                            <Search className="text-blue-600" size={22} />
                            {t('new_service_request.phone_lookup')}
                        </h2>

                        <div className="flex gap-3 mb-4">
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="9XXXXXXX"
                                className="flex-1 px-4 py-2.5 border border-blue-300 bg-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                dir="ltr"
                            />
                            <button
                                type="button"
                                onClick={handlePhoneLookup}
                                disabled={lookingUp || !phone}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {lookingUp ? <Loader className="animate-spin" size={18} /> : <Search size={18} />}
                                {t('common.search')}
                            </button>
                        </div>

                        {userData && (
                            <div className="bg-white p-4 rounded-xl border border-blue-200">
                                <div className="flex items-center gap-2 text-green-700 font-semibold mb-3">
                                    <CheckCircle size={20} />
                                    {t('new_service_request.user_found')}
                                </div>
                                <div className="space-y-2 text-sm">
                                    <p className="flex items-center gap-2">
                                        <span className="font-medium text-slate-600">{t('common.name')}:</span>
                                        <span className="text-slate-900">{userData.user.name}</span>
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <span className="font-medium text-slate-600">{t('common.phone')}:</span>
                                        <span className="text-slate-900">{userData.user.phone}</span>
                                    </p>
                                    {userData.user.is_odoo_only && (
                                        <p className="text-amber-600 flex items-center gap-1 font-medium bg-amber-50 p-2 rounded-lg border border-amber-100">
                                            <Info size={16} />
                                            {t('new_service_request.is_new_user')}
                                        </p>
                                    )}
                                    {userData.odoo.linked && (
                                        <p className="text-green-600 flex items-center gap-1">
                                            <CheckCircle size={16} />
                                            {t('new_service_request.linked_to_odoo')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Order Selection (if Odoo linked) */}
                    {userData?.odoo?.linked && userData.odoo.orders.length > 0 && (
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="font-semibold text-slate-800 mb-3">{t('new_service_request.select_order')}</h3>
                            <select
                                value={selectedOrder}
                                onChange={(e) => setSelectedOrder(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            >
                                <option value="">-- {t('new_service_request.choose_order')} --</option>
                                {userData.odoo.orders.map((order: any) => (
                                    <option key={order.id} value={order.name}>
                                        {order.name} - {order.quotation_template || 'N/A'}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Service Type */}
                    {userData && (
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="font-semibold text-slate-800 mb-3">{t('user_details.service_type')} *</h3>
                            <select
                                name="service_type"
                                value={formData.service_type}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                required
                            >
                                <option value="maintenance">{t('requests.types.maintenance')}</option>
                                <option value="repair">{t('requests.types.repair')}</option>
                                <option value="inspection">{t('requests.types.inspection')}</option>
                            </select>
                        </div>
                    )}

                    {/* Description */}
                    {userData && (
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="font-semibold text-slate-800 mb-3">{t('common.description')} *</h3>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows={4}
                                placeholder={t('common.description')}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                                required
                            />
                        </div>
                    )}

                    {/* Site Images */}
                    {userData && (
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="flex items-center gap-2 font-semibold text-slate-800 mb-3">
                                <Upload className="text-blue-600" size={20} />
                                {t('new_request.site_images')}
                            </h3>

                            <label className="flex items-center justify-center w-full py-8 px-4 border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-500 hover:bg-blue-50/50 transition-all cursor-pointer">
                                <div className="flex flex-col items-center gap-2">
                                    <Upload className="text-slate-400" size={32} />
                                    <span className="text-sm text-slate-600 font-medium">{t('new_request.add_images')}</span>
                                </div>
                                <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                            </label>

                            {previewUrls.length > 0 && (
                                <div className="grid grid-cols-3 gap-3 mt-4">
                                    {previewUrls.map((url, idx) => (
                                        <div key={idx} className="relative group">
                                            <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-24 object-cover rounded-lg border border-slate-200" />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(idx)}
                                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <XCircle size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* LEFT COLUMN: Location & Date */}
                <div className="space-y-6">

                    {/* Map Location */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                            <h3 className="flex items-center gap-2 font-semibold text-slate-800">
                                <MapPin className="text-blue-600" size={22} />
                                {t('new_request.location_date')}
                            </h3>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Toggle between Map and Link */}
                            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => handleLocationMethodChange('map')}
                                    className={clsx(
                                        "flex-1 py-2.5 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2",
                                        locationInputMethod === 'map'
                                            ? "bg-white text-blue-600 shadow-sm"
                                            : "text-slate-600 hover:text-slate-800"
                                    )}
                                >
                                    <MapPin size={18} />
                                    {t('new_request.map') || 'خريطة'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleLocationMethodChange('link')}
                                    className={clsx(
                                        "flex-1 py-2.5 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2",
                                        locationInputMethod === 'link'
                                            ? "bg-white text-blue-600 shadow-sm"
                                            : "text-slate-600 hover:text-slate-800"
                                    )}
                                >
                                    <Info size={18} />
                                    {t('new_request.location_link') || 'رابط الموقع'}
                                </button>
                            </div>

                            {/* Map Input */}
                            {locationInputMethod === 'map' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                        <MapPin size={16} className="text-blue-600" />
                                        {t('new_request.click_to_select')}
                                    </label>
                                    <div className={clsx(
                                        "w-full h-80 rounded-xl overflow-hidden border-2 transition-all relative z-0",
                                        position ? "border-green-500" : "border-slate-300"
                                    )}>
                                        <MapContainer
                                            center={[23.5859, 58.4059]}
                                            zoom={7}
                                            style={{ height: '100%', width: '100%' }}
                                        >
                                            <TileLayer
                                                url={tileUrl}
                                                attribution={attribution}
                                            />
                                            <LocationMarker position={position} setPosition={setPosition} />
                                        </MapContainer>
                                    </div>
                                    {position && (
                                        <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
                                            <CheckCircle size={14} />
                                            {t('common.latitude')}: {position.lat.toFixed(6)}, {t('common.longitude')}: {position.lng.toFixed(6)}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Link Input */}
                            {locationInputMethod === 'link' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        {t('new_request.paste_google_maps_link') || 'الصق رابط Google Maps'}
                                    </label>
                                    <input
                                        type="url"
                                        value={locationLink}
                                        onChange={handleLocationLinkChange}
                                        placeholder="https://maps.google.com/?q=23.5859,58.4059"
                                        className={clsx(
                                            "w-full px-4 py-2.5 border rounded-xl outline-none focus:ring-2 transition-all",
                                            linkParsingError
                                                ? "border-red-300 focus:ring-red-500"
                                                : position
                                                    ? "border-green-300 focus:ring-green-500"
                                                    : "border-slate-300 focus:ring-blue-500"
                                        )}
                                        dir="ltr"
                                    />
                                    {linkParsingError && (
                                        <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                                            <XCircle size={14} />
                                            {linkParsingError}
                                        </p>
                                    )}
                                    {position && !linkParsingError && (
                                        <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
                                            <CheckCircle size={14} />
                                            {t('common.latitude')}: {position.lat.toFixed(6)}, {t('common.longitude')}: {position.lng.toFixed(6)}
                                        </p>
                                    )}
                                    <p className="mt-2 text-xs text-slate-500">
                                        {t('new_request.link_hint') || 'يدعم روابط Google Maps بصيغ مختلفة'}
                                    </p>
                                </div>
                            )}



                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">{t('requests.scheduled_at')}</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-3 text-slate-400" size={18} />
                                        <input
                                            type="date"
                                            name="scheduled_at"
                                            value={formData.scheduled_at}
                                            onChange={handleInputChange}
                                            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono text-sm"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">{t('requests.end_date')}</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-3 text-slate-400" size={18} />
                                        <input
                                            type="date"
                                            name="end_date"
                                            value={formData.end_date}
                                            min={formData.scheduled_at}
                                            onChange={handleInputChange}
                                            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono text-sm"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {!position && (
                                <p className="text-xs text-amber-600 flex items-center gap-1 bg-amber-50 p-2 rounded-lg">
                                    <Info size={14} />
                                    {t('new_request.location_required')}
                                </p>
                            )}
                        </div>
                    </div>

                </div>

                {/* Submit Button */}
                {userData && (
                    <div className="lg:col-span-2">
                        <button
                            type="submit"
                            disabled={loading || !position}
                            className={clsx(
                                "w-full py-4 rounded-2xl font-semibold text-lg transition-all shadow-lg",
                                loading || !position
                                    ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                                    : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-blue-500/30 hover:shadow-xl"
                            )}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader className="animate-spin" size={22} />
                                    {t('new_request.sending')}
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <CheckCircle size={22} />
                                    {t('new_request.submit_btn')}
                                </span>
                            )}
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
}
