import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../services/auth';
import { UserPlus, Star, MapPin, Phone, Shield, Settings, Eye, EyeOff, FileText, Trash2, X } from 'lucide-react';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import clsx from 'clsx';
import api from '../services/auth';
import { useTranslation } from 'react-i18next';
import LiveTrackingMap from '../components/LiveTrackingMap';

export default function Technicians() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [technicians, setTechnicians] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [mapMode, setMapMode] = useState<{ show: boolean, techId: number | null }>({ show: false, techId: null });
    const [showPassword, setShowPassword] = useState(false);
    const [newTech, setNewTech] = useState({ name: '', phone: '', password: '' });
    const [submitting, setSubmitting] = useState(false);
    const [deleteModal, setDeleteModal] = useState<{ show: boolean, techId: number | null, loading: boolean }>({ show: false, techId: null, loading: false });
    const [selectedTechs, setSelectedTechs] = useState<number[]>([]);
    const [bulkDeleting, setBulkDeleting] = useState(false);



    useEffect(() => {
        loadTechnicians();
    }, []);

    const loadTechnicians = async () => {
        try {
            setLoading(true);
            const res = await adminService.getUsers(undefined, undefined, 'technician');
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
                loadTechnicians();
                alert(t('technicians.add_success'));
            }
        } catch (error) {
            alert(t('technicians.add_error'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteClick = (techId: number) => {
        setDeleteModal({ show: true, techId, loading: false });
    };

    const confirmDelete = async () => {
        if (!deleteModal.techId) return;
        setDeleteModal(prev => ({ ...prev, loading: true }));
        try {
            const res = await api.delete(`/admin/users/${deleteModal.techId}`);
            if (res.data.success) {
                setDeleteModal({ show: false, techId: null, loading: false });
                loadTechnicians();
            }
        } catch (error) {
            alert(t('technicians.delete_error') || 'Failed to delete technician');
            setDeleteModal(prev => ({ ...prev, loading: false }));
        }
    };

    const openHistory = (tech: any) => {
        navigate(`/dashboard/technicians/${tech.id}/history`);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{t('technicians.title')}</h1>
                    <p className="text-slate-500">{t('technicians.subtitle')}</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                >
                    <UserPlus size={18} />
                    {t('technicians.add_tech')}
                </button>
            </div>

            {/* Bulk Actions Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        checked={selectedTechs.length === technicians.length && technicians.length > 0}
                        onChange={() => {
                            if (selectedTechs.length === technicians.length) {
                                setSelectedTechs([]);
                            } else {
                                setSelectedTechs(technicians.map((t: any) => t.id));
                            }
                        }}
                        className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-700 font-medium">
                        {selectedTechs.length > 0 ? `${selectedTechs.length} ${t('common.selected')}` : t('tracking.select_all')}
                    </span>
                </div>

                {selectedTechs.length > 0 && (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSelectedTechs([])}
                            className="text-slate-500 hover:text-slate-700 text-sm font-medium flex items-center gap-1"
                        >
                            <X size={16} />
                            {t('common.cancel')}
                        </button>
                        <button
                            onClick={async () => {
                                if (!confirm(t('common.delete_selected_confirm', { count: selectedTechs.length }))) return;
                                try {
                                    setBulkDeleting(true);
                                    const res = await api.post('/admin/users/bulk-delete', { ids: selectedTechs });
                                    if (res.data.success) {
                                        loadTechnicians();
                                        setSelectedTechs([]);
                                        alert(res.data.message);
                                    }
                                } catch (error: any) {
                                    alert(error.response?.data?.message || 'Error deleting technicians');
                                } finally {
                                    setBulkDeleting(false);
                                }
                            }}
                            disabled={bulkDeleting}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                            <Trash2 size={16} />
                            {bulkDeleting ? t('common.deleting') + '...' : t('common.delete_selected')}
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 animate-pulse h-40"></div>
                    ))
                ) : technicians.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-slate-500">{t('technicians.no_techs')}</div>
                ) : (
                    technicians.map(tech => (
                        <div key={tech.id} className={clsx(
                            "bg-white p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow relative",
                            selectedTechs.includes(tech.id) ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-200"
                        )}>
                            {/* Checkbox Overlay */}
                            <div className="absolute top-4 right-4 z-10">
                                <input
                                    type="checkbox"
                                    checked={selectedTechs.includes(tech.id)}
                                    onChange={() => {
                                        setSelectedTechs(prev =>
                                            prev.includes(tech.id)
                                                ? prev.filter(id => id !== tech.id)
                                                : [...prev, tech.id]
                                        );
                                    }}
                                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 bg-white"
                                />
                            </div>

                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
                                        {tech.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">{tech.name}</h3>
                                        <span className={clsx("text-xs px-2 py-0.5 rounded-full", tech.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                                            {tech.is_active ? t('common.active') : t('common.inactive')}
                                        </span>
                                    </div>
                                </div>
                                <button className="text-slate-400 hover:text-slate-600">
                                    <Settings size={18} />
                                </button>
                                <button
                                    onClick={() => handleDeleteClick(tech.id)}
                                    className="text-slate-400 hover:text-red-500 transition-colors ml-2"
                                    title={t('common.delete')}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <div className="space-y-3 text-sm text-slate-600">
                                <div className="flex items-center gap-2">
                                    <Phone size={16} className="text-slate-400" />
                                    <span dir="ltr">{tech.phone}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin size={16} className="text-slate-400" />
                                    <span>{t('technicians.location_unknown')}</span>
                                </div>
                                {tech.avg_rating != null && (
                                    <div className="flex items-center gap-2">
                                        <Star size={16} className="text-amber-400 fill-amber-400" />
                                        <span>{tech.avg_rating}</span>
                                    </div>
                                )}
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
                                    {t('technicians.history')}
                                </button>
                                <button
                                    onClick={() => setMapMode({ show: true, techId: tech.id })}
                                    className="flex-1 bg-slate-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-slate-800"
                                >
                                    {t('technicians.live_tracking')}
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
                        <h2 className="text-xl font-bold mb-4">{t('technicians.modal.title')}</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.name')}</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                    value={newTech.name}
                                    onChange={e => setNewTech({ ...newTech, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.phone')}</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="968xxxxxxx"
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                    value={newTech.phone}
                                    onChange={e => setNewTech({ ...newTech, phone: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.password')}</label>
                                <div className="relative">
                                    <input
                                        required
                                        type={showPassword ? "text" : "password"}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 pr-10 rtl:pr-3 rtl:pl-10"
                                        value={newTech.password}
                                        onChange={e => setNewTech({ ...newTech, password: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-2.5 rtl:right-auto rtl:left-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                                >
                                    {submitting ? t('common.saving') : t('common.save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Live Tracking Modal */}
            {mapMode.show && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-4xl p-0 shadow-2xl relative animate-in fade-in zoom-in duration-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                                    <MapPin size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">{mapMode.techId ? t('tracking.technician_location') : t('tracking.live_technician_tracking')}</h2>
                                    <p className="text-xs text-slate-500">{t('tracking.realtime_from_firebase')}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setMapMode({ show: false, techId: null })}
                                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 bg-slate-100">
                            <LiveTrackingMap technicians={technicians} focusTechId={mapMode.techId} />
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={deleteModal.show}
                onClose={() => setDeleteModal({ show: false, techId: null, loading: false })}
                onConfirm={confirmDelete}
                loading={deleteModal.loading}
                title={t('technicians.delete_confirm_title') || 'Delete Technician'}
                message={`${t('technicians.delete_confirm_msg') || 'Are you sure you want to delete'} ${technicians.find(t => t.id === deleteModal.techId)?.name || ''}?`}
            />

        </div>
    );
}
