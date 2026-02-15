import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/auth';
import { CheckCircle, Clock, MapPin, Eye, ClipboardList, Package, User, Settings, AlertCircle, Filter, Search as SearchIcon, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import LoadingSpinner from '../components/LoadingSpinner';
import { Trash2, X } from 'lucide-react';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import { toast } from 'react-toastify';

export default function InstallationRequests() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [technicians, setTechnicians] = useState<any[]>([]);

  // Filters State
  const [filters, setFilters] = useState({
      search: '',
      status: 'all',
      technician_id: '',
      date_from: '',
      date_to: ''
  });

  // Assignment Modal State
  const [assignModal, setAssignModal] = useState<{show: boolean, requestId: number | null}>({show: false, requestId: null});
  const [assignDates, setAssignDates] = useState({ start: '', end: '' });
  const [selectedTech, setSelectedTech] = useState('');

  // Delete Modal State
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
      if (filters.search) params.append('search', filters.search);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.technician_id) params.append('technician_id', filters.technician_id);
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

  const clearFilters = () => {
      setFilters({
          search: '',
          status: 'all',
          technician_id: '',
          date_from: '',
          date_to: ''
      });
  };

  /**
   * Fetch available technicians based on date range
   * Follows Single Responsibility Principle - only handles technician fetching
   */
  const fetchTechnicians = async (startDate?: string, endDate?: string) => {
      try {
          let sDate = startDate;
          let eDate = endDate;

          // Get default dates from selected request if not provided
          if (assignModal.requestId && (!sDate || !eDate)) {
               const req = requests.find(r => r.id === assignModal.requestId);
               if (req) {
                   sDate = sDate || req.scheduled_at;
                   eDate = eDate || req.end_date || req.scheduled_at;
               }
          }

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
          console.error('Error fetching technicians:', error);
          toast.error(t('common.error'));
      }
  };

  /**
   * Handle date changes and refetch available technicians
   * Follows Open/Closed Principle - extensible for additional date logic
   */
  const handleDateChange = (key: 'start' | 'end', value: string) => {
       setAssignDates(prev => {
          const newDates = { ...prev, [key]: value };
          // Ensure end date is not before start date
          if (key === 'start' && newDates.end && value > newDates.end) {
              newDates.end = value;
          }
          fetchTechnicians(newDates.start, newDates.end);
          return newDates;
       });
  };

  /**
   * Assign technician to installation request
   * Follows Interface Segregation - clean API contract
   */
  const handleAssign = async () => {
      if (!selectedTech || !assignModal.requestId) return;

      try {
          const res = await api.post(`/admin/installation-requests/${assignModal.requestId}/assign`, {
              technician_id: selectedTech,
              scheduled_at: assignDates.start,
              end_date: assignDates.end
          });
          if (res.data.success) {
              toast.success(t('requests.assigned_success'));
              setAssignModal({show: false, requestId: null});
              setSelectedTech('');
              setAssignDates({ start: '', end: '' });
              loadRequests();
          }
      } catch (error: any) {
          toast.error(error.response?.data?.message || t('common.error'));
      }
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
              {selectedRequests.length} {t('common.selected')}
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
              if (!confirm(t('common.delete_selected_confirm', { count: selectedRequests.length }))) return;
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
            {bulkDeleting ? t('common.deleting') + '...' : t('common.delete_selected')}
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-700 font-semibold border-b border-slate-100 pb-2 mb-2">
              <Filter size={20} className="text-blue-600" />
              {t('requests.filter_title')}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="md:col-span-2 relative">
                  <SearchIcon className="absolute right-3 top-2.5 text-slate-400 rtl:right-auto rtl:left-3" size={18} />
                  <input
                      type="text"
                      placeholder={t('requests.search_placeholder')}
                      className="w-full pr-10 pl-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm rtl:pr-4 rtl:pl-10"
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
              </div>

              {/* Status Filter */}
              <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                  <option value="all">{t('requests.all_statuses')}</option>
                  <option value="pending">{t('requests.statuses.pending')}</option>
                  <option value="assigned">{t('requests.statuses.assigned')}</option>
                  <option value="on_way">{t('requests.statuses.on_way')}</option>
                  <option value="in_progress">{t('requests.statuses.in_progress')}</option>
                  <option value="completed">{t('requests.statuses.completed')}</option>
                  <option value="canceled">{t('requests.statuses.canceled')}</option>
              </select>

              {/* Technician Filter */}
              <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  value={filters.technician_id}
                  onChange={(e) => handleFilterChange('technician_id', e.target.value)}
              >
                  <option value="">{t('requests.all_technicians')}</option>
                  {technicians.map(tech => (
                      <option key={tech.id} value={tech.id}>{tech.name}</option>
                  ))}
              </select>

              {/* Date From */}
              <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500 whitespace-nowrap">{t('requests.date_from')}:</span>
                  <input
                      type="date"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      value={filters.date_from}
                      onChange={(e) => handleFilterChange('date_from', e.target.value)}
                  />
              </div>
          </div>

          {/* Reset Filters Button */}
          <div className="flex justify-end">
              <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium px-3 py-1.5 hover:bg-slate-50 rounded-lg transition-colors"
              >
                  <RotateCcw size={16} />
                  {t('requests.reset_filters')}
              </button>
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
                        <th className="px-6 py-4 text-start">{t('requests.technician')}</th>
                        <th className="px-6 py-4 text-start">{t('requests.scheduled_at')}</th>
                        <th className="px-6 py-4 text-start">{t('common.status')}</th>
                        <th className="px-6 py-4 text-start">{t('common.actions')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading ? (
                        <tr><td colSpan={10}><LoadingSpinner /></td></tr>
                    ) : requests.length === 0 ? (
                        <tr><td colSpan={10} className="px-6 py-8 text-center text-slate-500">{t('installation.no_requests')}</td></tr>
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
                                    {req.technician?.name || (
                                        <span className="text-slate-400 italic">{t('requests.not_assigned')}</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-slate-600 text-sm">
                                    <div dir="ltr">{new Date(req.scheduled_at).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}</div>
                                </td>
                                <td className="px-6 py-4"><StatusBadge status={req.status} /></td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => navigate(`/dashboard/requests/installation/${req.id}`)}
                                            className="text-slate-400 hover:text-blue-600 transition-colors p-2 hover:bg-blue-50 rounded-full"
                                            title={t('common.view_details')}
                                        >
                                            <Eye size={18} />
                                        </button>
                                        {userRole === 'admin' && (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        setAssignModal({show: true, requestId: req.id});
                                                        fetchTechnicians(req.scheduled_at, req.end_date || req.scheduled_at);
                                                    }}
                                                    className="text-green-600 hover:text-green-800 transition-colors p-2 hover:bg-green-50 rounded-full"
                                                    title={t('requests.assign_technician')}
                                                >
                                                    <Settings size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(req.id)}
                                                    className="text-slate-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-full"
                                                    title={t('common.delete')}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>


      {/* Assign Technician Modal */}
      {assignModal.show && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                <h2 className="text-xl font-bold mb-4">{t('requests.assign_technician')}</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">{t('requests.choose_technician') || 'اختر الفني المتاح'}</label>
                        <select
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                            value={selectedTech}
                            onChange={e => setSelectedTech(e.target.value)}
                        >
                            <option value="">-- {t('requests.choose_technician') || 'اختر الفني'} --</option>
                            {technicians.map(tech => (
                                <option key={tech.id} value={tech.id}>{tech.name} ({tech.phone})</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('requests.scheduled_at')}</label>
                            <input
                                type="date"
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                value={assignDates.start}
                                onChange={e => handleDateChange('start', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('requests.end_date')}</label>
                            <input
                                type="date"
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                value={assignDates.end}
                                min={assignDates.start}
                                onChange={e => handleDateChange('end', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                        <button
                            onClick={() => {
                                setAssignModal({show: false, requestId: null});
                                setSelectedTech('');
                                setAssignDates({ start: '', end: '' });
                            }}
                            className="flex-1 py-2 text-slate-600 hover:bg-slate-50 rounded-lg"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            onClick={handleAssign}
                            disabled={!selectedTech}
                            className="flex-1 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
                        >
                            {t('common.confirm')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

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
