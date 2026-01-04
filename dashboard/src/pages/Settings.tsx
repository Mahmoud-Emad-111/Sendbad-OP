import React, { useState, useEffect } from 'react';
import api from '../services/auth';
import { User, Lock, Bell, Save, Shield } from 'lucide-react';

export default function Settings() {
    const [ , setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form States
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const res = await api.get('/user');
            if (res.data) {
                setUser(res.data);
                setName(res.data.name);
                setPhone(res.data.phone);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload: any = { name, phone };
            if (password) {
                payload.password = password;
                payload.password_confirmation = passwordConfirmation;
            }

            const res = await api.post('/auth/update-profile', payload);
            if (res.data.success) {
                alert('تم تحديث البيانات بنجاح');
                setUser(res.data.data);
                setPassword('');
                setPasswordConfirmation('');
            }
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.message || 'حدث خطأ أثناء التحديث');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>جاري التحميل...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-10">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">الإعدادات</h1>
                <p className="text-slate-500">إدارة الملف الشخصي وإعدادات النظام</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Sidebar Navigation (Visual Only for now) */}
                <div className="space-y-2">
                    <button className="w-full flex items-center gap-3 px-4 py-3 bg-white text-blue-600 font-medium rounded-lg shadow-sm border border-blue-100">
                        <User size={20} />
                        الملف الشخصي
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 bg-transparent text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors">
                        <Shield size={20} />
                        الحماية والأمان
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 bg-transparent text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors">
                        <Bell size={20} />
                        الإشعارات
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="md:col-span-2 space-y-6">
                    {/* Profile Card */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <User size={20} className="text-slate-400" />
                            البيانات الأساسية
                        </h2>

                        <form onSubmit={handleUpdateProfile} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">الاسم</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">رقم الهاتف</label>
                                    <input
                                        type="text"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                        dir="ltr"
                                    />
                                </div>
                            </div>

                            <hr className="border-slate-100 my-6" />

                            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Lock size={20} className="text-slate-400" />
                                تغيير كلمة المرور
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">كلمة المرور الجديدة</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="اتركها فارغة إذا لا تريد التغيير"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">تأكيد كلمة المرور</label>
                                    <input
                                        type="password"
                                        value={passwordConfirmation}
                                        onChange={e => setPasswordConfirmation(e.target.value)}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                                >
                                    <Save size={18} />
                                    {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Notification Settings (Mockup) */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm opacity-60">
                         <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Bell size={20} className="text-slate-400" />
                            تنبيهات النظام
                        </h2>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-700">تفعيل الإشعارات الصوتية</span>
                                <div className="w-10 h-6 bg-blue-600 rounded-full relative cursor-pointer">
                                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-700">إشعارات البريد الإلكتروني</span>
                                <div className="w-10 h-6 bg-slate-200 rounded-full relative cursor-pointer">
                                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
