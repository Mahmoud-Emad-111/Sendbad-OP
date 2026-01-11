import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { toast } from 'react-toastify';
import { ArrowRight, MapPin, Upload, CheckCircle, XCircle, Info, Loader } from 'lucide-react';
import api from '../services/auth';
import clsx from 'clsx';
import L from 'leaflet';

// Fix Leaflet marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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

export default function NewInstallationRequest() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    product_type: '',
    quantity: 1,
    is_site_ready: false,
    notes: '',
    address: '',
    scheduled_at: '',
  });

  // Location State
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);

  // Readiness Details
  const readinessOptions = ['تركيب السيراميك', 'تركيب الأبواب', 'تركيب النوافذ', 'دهان الحوائط', 'توصيل الكهرباء'];
  const [selectedReadiness, setSelectedReadiness] = useState<string[]>([]);

  // Images
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleToggleReadiness = (option: string) => {
    setSelectedReadiness(prev =>
      prev.includes(option) ? prev.filter(item => item !== option) : [...prev, option]
    );
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!position) {
        toast.error('يرجى تحديد الموقع على الخريطة');
        return;
    }
    if (!formData.product_type) {
        toast.error('يرجى إدخال نوع المنتج');
        return;
    }

    setLoading(true);

    const data = new FormData();
    data.append('product_type', formData.product_type);
    data.append('quantity', formData.quantity.toString());
    data.append('is_site_ready', formData.is_site_ready ? '1' : '0');
    data.append('notes', formData.notes);
    data.append('address', formData.address);
    data.append('scheduled_at', formData.scheduled_at);
    data.append('latitude', position.lat.toString());
    data.append('longitude', position.lng.toString());

    // Append array items individually for FormData
    selectedReadiness.forEach((item, index) => {
        data.append(`readiness_details[${index}]`, item);
    });

    images.forEach((image, index) => {
        data.append(`images[${index}]`, image);
    });

    try {
        const response = await api.post('/requests/installation', data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.data.success) {
            toast.success('تم إرسال طلب التركيب بنجاح! 🎉');
            navigate('/dashboard/requests');
        }
    } catch (error: any) {
        console.error(error);
        toast.error(error.response?.data?.message || 'حدث خطأ أثناء إرسال الطلب');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowRight className="text-slate-600" />
        </button>
        <div>
            <h1 className="text-2xl font-bold text-slate-800">طلب تركيب جديد 🛠️</h1>
            <p className="text-slate-500 text-sm mt-1">أدخل تفاصيل المنتج والموقع لجدولة التركيب</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* RIGHT COLUMN: Product & Readiness */}
        <div className="space-y-6">

            {/* Product Info Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <CheckCircle size={18} className="text-blue-500" />
                    بيانات المنتج
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">نوع المنتج</label>
                        <input
                            type="text"
                            name="product_type"
                            value={formData.product_type}
                            onChange={handleInputChange}
                            className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="مثال: مطبخ ألوميتال، دولاب..."
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">الكمية</label>
                        <input
                            type="number"
                            name="quantity"
                            value={formData.quantity}
                            onChange={handleInputChange}
                            className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            min="1"
                            required
                        />
                    </div>
                </div>
            </div>

            {/* Site Readiness Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Info size={18} className="text-purple-500" />
                    تجهيزات الموقع
                </h3>

                <div className="mb-4 flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium text-slate-700">هل الموقع جاهز للتركيب؟</span>
                    <button
                        type="button"
                        onClick={() => setFormData(prev => ({...prev, is_site_ready: !prev.is_site_ready}))}
                        className={clsx(
                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                            formData.is_site_ready ? "bg-green-500" : "bg-slate-300"
                        )}
                    >
                        <span className={clsx(
                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                            formData.is_site_ready ? "translate-x-1" : "translate-x-6"
                        )} />
                    </button>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">التجهيزات المكتملة:</label>
                    <div className="grid grid-cols-2 gap-2">
                        {readinessOptions.map(option => (
                            <div
                                key={option}
                                onClick={() => handleToggleReadiness(option)}
                                className={clsx(
                                    "p-2 text-xs border rounded-lg cursor-pointer transition-colors text-center select-none",
                                    selectedReadiness.includes(option)
                                        ? "bg-blue-50 border-blue-500 text-blue-700 font-medium"
                                        : "hover:bg-slate-50 border-slate-200 text-slate-600"
                                )}
                            >
                                {option}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

             {/* Images Card */}
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Upload size={18} className="text-orange-500" />
                    صور الموقع (اختياري)
                </h3>

                <div className="grid grid-cols-3 gap-2 mb-4">
                    {previewUrls.map((url, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group">
                            <img src={url} alt="preview" className="w-full h-full object-cover" />
                            <button
                                type="button"
                                onClick={() => removeImage(idx)}
                                className="absolute top-1 right-1 bg-red-500/80 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <XCircle size={16} />
                            </button>
                        </div>
                    ))}
                    <label className="border-2 border-dashed border-slate-300 rounded-lg aspect-square flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                        <Upload size={24} className="text-slate-400 mb-1" />
                        <span className="text-[10px] text-slate-500">إضافة صور</span>
                        <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                </div>
            </div>

        </div>

        {/* LEFT COLUMN: Location & Schedule */}
        <div className="space-y-6">

            {/* Location Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <MapPin size={18} className="text-red-500" />
                    الموقع والتاريخ
                </h3>

                <div className="h-64 bg-slate-100 rounded-xl overflow-hidden relative mb-4 z-0">
                    <MapContainer center={[30.0444, 31.2357]} zoom={13} style={{ height: '100%', width: '100%' }}>
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        <LocationMarker position={position} setPosition={setPosition} />
                    </MapContainer>
                    {!position && (
                        <div className="absolute inset-0 bg-black/10 flex items-center justify-center pointer-events-none z-[1000]">
                            <span className="bg-white/90 px-3 py-1 rounded-full text-xs font-bold text-slate-700 shadow-sm">
                                اضغط لتحديد الموقع 📍
                            </span>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">العنوان بالتفصيل</label>
                         <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="المدينة، الشارع، علامة مميزة..."
                            required
                        />
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">تاريخ ووقت الزيارة</label>
                         <input
                            type="datetime-local"
                            name="scheduled_at"
                            value={formData.scheduled_at}
                            onChange={handleInputChange}
                            className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right ltr:text-right"
                            required
                        />
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">ملاحظات إضافية</label>
                         <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleInputChange}
                            className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                            placeholder="أي تفاصيل تانية تحب تضيفها..."
                        />
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {!position && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs flex items-center gap-2">
                    <Info size={16} />
                    يجب تحديد الموقع على الخريطة لإرسال الطلب.
                </div>
            )}

            {/* Submit Button */}
            <button
                type="submit"
                disabled={loading || !position}
                className={clsx(
                    "w-full py-4 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2",
                    loading || !position
                        ? "bg-slate-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-500/25"
                )}
            >
                {loading ? (
                    <>
                        <Loader className="animate-spin" size={20} />
                        جاري الإرسال...
                    </>
                ) : (
                    <>
                        إرسال الطلب
                        <ArrowRight size={20} className="rotate-180" />
                    </>
                )}
            </button>
        </div>

      </form>
    </div>
  );
}
