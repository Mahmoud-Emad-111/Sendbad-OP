import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/auth';
import { CheckCircle, Clock, MapPin, Eye, ClipboardList, Package, User, Settings, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import LoadingSpinner from '../components/LoadingSpinner';
import { Trash2, X } from 'lucide-react';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

export default function InstallationRequests() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  // Filters State
  const [filters, setFilters] = useState({
      search: '',
      status: 'all',
      date_from: '',
      date_to: ''
  });
  const [deleteModal, setDeleteModal] = useState<{show: boolean, requestId: number | null, loading: boolean}>({show: false, requestId: null, loading: false});
  const [selectedRequests, setSelectedRequests] = useState<number[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        const user = JSON.parse(userStr);
        setUserRole(user.role);
    }
    loadRequests();
  }, []);

  // Debounced load for search
  useEffect(() => {
    const timer = setTimeout(() => {
        loadRequests();
    }, 500);
    return () => clearTimeout(timer);
  }, [filters]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      // params.append('service_type', 'installation'); // Not needed, dedicated endpoint
      if (filters.search) params.append('search', filters.search);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);

      const res = await api.get(`/installation-requests?${params.toString()}`);
      if (res.data.success) {
        setRequests(res.data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
      setFilters(prev => ({ ...prev, [key]: value }));
  };

    const handleDeleteClick = (requestId: number) => {
        setDeleteModal({ show: true, requestId, loading: false });
    };

    const confirmDelete = async () => {
        if (!deleteModal.requestId) return;
        setDeleteModal(prev => ({ ...prev, loading: true }));
        try {
            const res = await api.delete(`/installation-requests/${deleteModal.requestId}`);
            if (res.data.success) {
                // @ts-ignore
                // toast.success(t('requests.delete_success') || 'Request deleted successfully');
                setDeleteModal({ show: false, requestId: null, loading: false });
                loadRequests();
            }
        } catch (error) {
             // @ts-ignore
            // toast.error(t('requests.delete_error') || 'Failed to delete request');
            setDeleteModal(prev => ({ ...prev, loading: false }));
        }
    };

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: any = {
        pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'pending', icon: Clock },
        assigned: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'assigned', icon: User },
        on_way: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'on_way', icon: Clock },
        in_progress: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'in_progress', icon: Settings },
        completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'completed', icon: CheckCircle },
        canceled: { bg: 'bg-red-100', text: 'text-red-700', label: 'canceled', icon: AlertCircle },
    };

    const config = styles[status] || styles.pending;
    const Icon = config.icon;

    return (
        <span className={clsx("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold", config.bg, config.text)}>
            <Icon size={14} />
            {t(`requests.statuses.${config.label}`)}
        </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="text-blue-600" />
            {t('installation.title')}
          </h1>
          <p className="text-slate-500">{t('installation.subtitle')}</p>
        </div>
        <button
            onClick={() => window.location.href = "/dashboard/requests/new-installation"}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition-colors font-medium shadow-sm hover:shadow-md"
        >
            <span>+</span>
            {t('installation.new_request')}
        </button>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedRequests.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-blue-900 font-medium">
              {selectedRequests.length} {t('selected')}
            </span>
            <button
              onClick={() => setSelectedRequests([])}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
              <X size={16} />
              {t('common.cancel')}
            </button>
          </div>
          <button
            onClick={async () => {
              if (!confirm(t(`Delete ${selectedRequests.length} selected request(s)?`))) return;
              try {
                setBulkDeleting(true);
                const res = await api.post('/installation-requests/bulk-delete', { ids: selectedRequests });
                if (res.data.success) {
                  loadRequests();
                  setSelectedRequests([]);
                  // toast.success(res.data.message); // If toast is available
                  alert(res.data.message);
                }
              } catch (error: any) {
                alert(error.response?.data?.message || 'Error deleting requests');
              } finally {
                setBulkDeleting(false);
              }
            }}
            disabled={bulkDeleting}
            className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700 transition-colors disabled:opacity-50">
            <Trash2 size={16} />
            {bulkDeleting ? t('common.deleting') + '...' : t('Delete Selected')}
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
           {/* Search */}
           <div className="md:col-span-2 relative">
               <input
                   type="text"
                   placeholder={t('requests.search_placeholder')}
                   className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                   value={filters.search}
                   onChange={(e) => handleFilterChange('search', e.target.value)}
               />
           </div>

           {/* Status */}
           <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
            >
                <option value="all">{t('requests.all_statuses')}</option>
                <option value="pending">{t('requests.statuses.pending')}</option>
                <option value="assigned">{t('requests.statuses.assigned')}</option>
                <option value="completed">{t('requests.statuses.completed')}</option>
            </select>

             {/* Date From */}
             <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">{t('requests.date_from')}:</span>
                 <input
                    type="date"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    value={filters.date_from}
                    onChange={(e) => handleFilterChange('date_from', e.target.value)}
                />
             </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
            <table className="w-full text-start">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium text-sm">
                    <tr>
                        <th className="px-6 py-4 text-start">
                          <input
                            type="checkbox"
                            checked={selectedRequests.length === requests.length && requests.length > 0}
                            onChange={() => {
                              if (selectedRequests.length === requests.length) {
                                setSelectedRequests([]);
                              } else {
                                setSelectedRequests(requests.map((r: any) => r.id));
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                          />
                        </th>
                        <th className="px-6 py-4 text-start">{t('user_details.request_id')}</th>
                        <th className="px-6 py-4 text-start">{t('installation.table.product')} / {t('new_service_request.invoice_number')}</th>
                        <th className="px-6 py-4 text-start">{t('installation.table.quantity')}</th>
                        <th className="px-6 py-4 text-start">{t('installation.table.location')}</th>
                        <th className="px-6 py-4 text-start">{t('installation.table.site_readiness')}</th>
                        <th className="px-6 py-4 text-start">{t('requests.scheduled_at')}</th>
                        <th className="px-6 py-4 text-start">{t('common.status')}</th>
                        <th className="px-6 py-4 text-start">{t('common.actions')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading ? (
                        <tr><td colSpan={8}><LoadingSpinner /></td></tr>
                    ) : requests.length === 0 ? (
                        <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-500">{t('installation.no_requests')}</td></tr>
                    ) : (
                        requests.map(req => (
                            <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                  <input
                                    type="checkbox"
                                    checked={selectedRequests.includes(req.id)}
                                    onChange={() => {
                                      setSelectedRequests(prev =>
                                        prev.includes(req.id)
                                          ? prev.filter(id => id !== req.id)
                                          : [...prev, req.id]
                                      );
                                    }}
                                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                  />
                                </td>
                                <td className="px-6 py-4 font-mono text-slate-500">#{req.id}</td>
                                <td className="px-6 py-4 font-medium text-slate-900">
                                    <div className="flex items-center gap-2">
                                        <Package size={16} className="text-slate-400" />
                                        {req.product_type || t('common.undefined')}
                                        {req.invoice_number && (
                                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                                #{req.invoice_number}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-600 font-mono font-bold">
                                    x{req.quantity || 1}
                                </td>
                                <td className="px-6 py-4 text-slate-500 truncate max-w-xs" title={req.address}>
                                    <div className="flex items-center gap-1">
                                        <MapPin size={14} />
                                        {req.address}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                     <span className={clsx("text-xs font-bold px-2 py-1 rounded", req.is_site_ready ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                                        {req.is_site_ready ? t('installation.site_ready') : t('installation.site_not_ready')}
                                     </span>
                                </td>
                                <td className="px-6 py-4 text-slate-600 text-sm">
                                    <div dir="ltr">{new Date(req.scheduled_at).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}</div>
                                </td>
                                <td className="px-6 py-4"><StatusBadge status={req.status} /></td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => navigate(`/dashboard/requests/installation/${req.id}`)}
                                        className="text-slate-400 hover:text-blue-600 transition-colors p-2 hover:bg-blue-50 rounded-full"
                                        title={t('common.view_details')}
                                    >
                                        <Eye size={18} />
                                    </button>
                                    {userRole === 'admin' && (
                                        <button
                                            onClick={() => handleDeleteClick(req.id)}
                                            className="text-slate-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-full ml-1"
                                            title={t('common.delete')}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>


        <DeleteConfirmationModal
            isOpen={deleteModal.show}
            onClose={() => setDeleteModal({ show: false, requestId: null, loading: false })}
            onConfirm={confirmDelete}
            title={t('requests.delete_confirm_title') || 'Delete Request'}
            message={t('requests.delete_confirm_message') || 'Are you sure you want to delete this installation request? This action cannot be undone.'}
            loading={deleteModal.loading}
        />
    </div>
  );
}
