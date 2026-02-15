import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Users, User, CheckCircle, AlertCircle, Search } from 'lucide-react';
import { adminService } from '../services/auth';
import clsx from 'clsx';

export default function Notifications() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        recipient_type: 'all_users', // all_users, all_technicians, specific_user
        user_id: '',
        title: '',
        body: ''
    });

    const [userSearch, setUserSearch] = useState('');
    const [foundUsers, setFoundUsers] = useState<any[]>([]);
    const [searchingUsers, setSearchingUsers] = useState(false);

    const handleSearchUsers = async (query: string) => {
        setUserSearch(query);
        if (query.length < 3) {
            setFoundUsers([]);
            return;
        }

        setSearchingUsers(true);
        try {
            // Using existing users endpoint with search
            const res = await adminService.getUsers(1, query);
            if (res.success) {
            if (res.success) {
                setFoundUsers(res.data);
            }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSearchingUsers(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSuccess(null);
        setError(null);

        try {
            const res = await adminService.sendCustomNotification(formData);
            if (res.success) {
                setSuccess(res.message);
                setFormData({
                    recipient_type: 'all_users',
                    user_id: '',
                    title: '',
                    body: ''
                });
                setUserSearch('');
                setFoundUsers([]);
            } else {
                setError('Failed to send notification');
            }
        } catch (err: any) {
             setError(err.response?.data?.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">{t('notifications.title') || 'Custom Notifications'}</h1>
                <p className="text-slate-500 mt-1">{t('notifications.subtitle') || 'Send push notifications to your users and technicians'}</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-1 bg-slate-50 border-b border-slate-100 flex gap-1">
                    <div className="flex-1 p-4">
                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* Recipient Type */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-slate-700">{t('notifications.recipient') || 'Recipient'}</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {[
                                        { id: 'all_users', label: t('notifications.all_users') || 'All Users', icon: Users },
                                        { id: 'all_technicians', label: t('notifications.all_technicians') || 'All Technicians', icon: Users },
                                        { id: 'specific_user', label: t('notifications.specific_user') || 'Specific User', icon: User },
                                    ].map((type) => (
                                        <div
                                            key={type.id}
                                            onClick={() => setFormData({ ...formData, recipient_type: type.id })}
                                            className={clsx(
                                                "cursor-pointer relative flex items-center gap-3 p-4 rounded-xl border transition-all",
                                                formData.recipient_type === type.id
                                                    ? "border-blue-500 bg-blue-50/50 text-blue-700 ring-1 ring-blue-500"
                                                    : "border-slate-200 hover:border-slate-300 hovered:bg-slate-50 text-slate-600"
                                            )}
                                        >
                                            <div className={clsx(
                                                "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                                                formData.recipient_type === type.id ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"
                                            )}>
                                                <type.icon size={20} />
                                            </div>
                                            <span className="font-medium">{type.label}</span>
                                            {formData.recipient_type === type.id && (
                                                <div className="absolute top-3 right-3 text-blue-500 rtl:right-auto rtl:left-3">
                                                    <CheckCircle size={16} />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Specific User Search */}
                            {formData.recipient_type === 'specific_user' && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <label className="text-sm font-medium text-slate-700">{t('notifications.search_user') || 'Search User'}</label>
                                    <div className="relative">
                                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 rtl:right-3 rtl:left-auto" />
                                        <input
                                            type="text"
                                            value={userSearch}
                                            onChange={(e) => handleSearchUsers(e.target.value)}
                                            placeholder={t('notifications.search_placeholder') || 'Name, Email or Phone...'}
                                            className="w-full pl-10 pr-4 rtl:pr-10 rtl:pl-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                                        />
                                        {searchingUsers && <div className="absolute right-3 top-1/2 -translate-y-1/2 rtl:right-auto rtl:left-3"><div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>}
                                    </div>

                                    {foundUsers.length > 0 && (
                                        <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-60 overflow-y-auto mt-2 shadow-sm">
                                            {foundUsers.map(u => (
                                                <div
                                                    key={u.id}
                                                    onClick={() => {
                                                        setFormData({ ...formData, user_id: u.id });
                                                        setUserSearch(u.name);
                                                        setFoundUsers([]);
                                                    }}
                                                    className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">
                                                            {u.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-slate-900">{u.name}</div>
                                                            <div className="text-xs text-slate-500">{u.phone}</div>
                                                        </div>
                                                    </div>
                                                    {String(formData.user_id) === String(u.id) && <CheckCircle size={16} className="text-blue-500" />}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {formData.user_id && (
                                        <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                            <CheckCircle size={12} />
                                            Selected User ID: {formData.user_id}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Content */}
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">{t('notifications.msg_title') || 'Title'}</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300"
                                        placeholder={t('notifications.title_placeholder') || 'e.g., Special Offer'}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">{t('notifications.msg_body') || 'Message Body'}</label>
                                    <textarea
                                        required
                                        rows={4}
                                        value={formData.body}
                                        onChange={(e) => setFormData({...formData, body: e.target.value})}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 resize-none"
                                        placeholder={t('notifications.body_placeholder') || 'Write your message here...'}
                                    />
                                </div>
                            </div>

                            {/* Feedback */}
                            {success && (
                                <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl flex items-center gap-2 text-sm border border-emerald-100 animate-in fade-in">
                                    <CheckCircle size={18} />
                                    {success}
                                </div>
                            )}
                            {error && (
                                <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-2 text-sm border border-red-100 animate-in fade-in">
                                    <AlertCircle size={18} />
                                    {error}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="pt-4 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 flex items-center gap-2 font-medium disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <Send size={18} />
                                            {t('notifications.send') || 'Send Notification'}
                                        </>
                                    )}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
