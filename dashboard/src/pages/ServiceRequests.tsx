import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/auth';
import { User, Settings, AlertCircle, CheckCircle, Clock, Eye, X, Filter, Search as SearchIcon, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import LoadingSpinner from '../components/LoadingSpinner';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

export default function ServiceRequests() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [technicians, setTechnicians] = useState<any[]>([]);

  // Filters State
  const [filters, setFilters] = useState({
      search: '',
      status: 'all',
      technician_id: '',
      service_type: 'all',
      date_from: '',
      date_to: ''
  });

    const [assignModal, setAssignModal] = useState<{show: boolean, requestId: number | null}>({show: false, requestId: null});
    const [assignDates, setAssignDates] = useState({ start: '', end: '' });
    const [selectedTech, setSelectedTech] = useState('');
    const [deleteModal, setDeleteModal] = useState<{show: boolean, requestId: number | null, loading: boolean}>({show: false, requestId: null, loading: false});
    const [selectedRequests, setSelectedRequests] = useState<number[]>([]);
    const [bulkDeleting, setBulkDeleting] = useState(false);

  // ... inside component ...
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    // Get user from local storage
    const userStr = localStorage.getItem('user');
    if (userStr) {
        const user = JSON.parse(userStr);
        setUserRole(user.role);
    }
  }, []);

  useEffect(() => {
    if (userRole === 'admin') {
        // loadTechnicians(); // This will be replaced by fetchTechnicians
    }
  }, [userRole]);

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
      // Build query string
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.technician_id) params.append('technician_id', filters.technician_id);
      if (filters.service_type !== 'all') params.append('service_type', filters.service_type);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);

      const res = await api.get(`/requests?${params.toString()}`);
      if (res.data.success) {
        // Filter out installation requests client-side to keep this page strictly for Maintenance/Repair
        const maintenanceRequests = res.data.data.filter((r: any) => r.service_type !== 'installation');
        setRequests(maintenanceRequests);
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
          service_type: 'all',
          date_from: '',
          date_to: ''
      });
  };

  // ... rest of loadTechnicians ...
    const fetchTechnicians = async (startDate?: string, endDate?: string) => {
        try {
            // Find current request to get default dates if not provided
            let sDate = startDate;
            let eDate = endDate;

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
            console.error(error);
        }
    };

    const handleDateChange = (key: 'start' | 'end', value: string) => {
         setAssignDates(prev => {
            const newDates = { ...prev, [key]: value };
            if (key === 'start' && newDates.end && value > newDates.end) {
                newDates.end = value;
            }
            fetchTechnicians(newDates.start, newDates.end);
            return newDates;
         });
    };

    const handleAssign = async () => {
        if (!selectedTech || !assignModal.requestId) return;

        try {
            const res = await api.post(`/admin/requests/${assignModal.requestId}/assign`, {
                technician_id: selectedTech,
                scheduled_at: assignDates.start, // Send Date Only
                end_date: assignDates.end       // Send Date Only
            });
            if (res.data.success) {
                toast.success(t('requests.assign_success'));
                setAssignModal({show: false, requestId: null});
                loadRequests();
            }
        } catch (error) {
            toast.error(t('requests.assign_error'));
        }
    };

    const confirmDelete = async () => {
        if (!deleteModal.requestId) return;
        setDeleteModal(prev => ({ ...prev, loading: true }));
        try {
            const res = await api.delete(`/requests/${deleteModal.requestId}`);
            if (res.data.success) {
                toast.success(t('requests.delete_success') || 'Request deleted successfully');
                setDeleteModal({ show: false, requestId: null, loading: false });
                loadRequests();
            }
        } catch (error) {
            toast.error(t('requests.delete_error') || 'Failed to delete request');
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

  /* Client-side filtering removed to fix missing data issue. Server handles filtering. */
  const filteredRequests = requests;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('requests.title')}</h1>
          <p className="text-slate-500">{t('requests.subtitle')}</p>
        </div>
        <button
            onClick={() => window.location.href = "/dashboard/requests/new-service"}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl transition-colors font-medium shadow-sm hover:shadow-md"
        >
            <span>+</span>
            {t('requests.new_request')}
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
                const res = await api.post('/requests/bulk-delete', { ids: selectedRequests });
                if (res.data.success) {
                  loadRequests();
                  setSelectedRequests([]);
                  toast.success(res.data.message);
                }
              } catch (error: any) {
                toast.error(error.response?.data?.message || 'Error deleting requests');
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
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

              {/* Service Type Filter */}
              <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  value={filters.service_type}
                  onChange={(e) => handleFilterChange('service_type', e.target.value)}
              >
                  <option value="all">{t('requests.all_services')}</option>
                  <option value="maintenance">{t('requests.types.maintenance')}</option>
                  <option value="repair">{t('requests.types.repair')}</option>
                  <option value="inspection">{t('requests.types.inspection')}</option>
              </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
               {/* Date From */}
               <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500 w-16">{t('requests.date_from')}:</span>
                  <input
                      type="date"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      value={filters.date_from}
                      onChange={(e) => handleFilterChange('date_from', e.target.value)}
                  />
               </div>

               {/* Date To */}
               <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500 w-16">{t('requests.date_to')}:</span>
                  <input
                      type="date"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      value={filters.date_to}
                      onChange={(e) => handleFilterChange('date_to', e.target.value)}
                  />
               </div>

               {/* Clear Buttons */}
               <div className="lg:col-span-2 flex justify-end">
                    <button
                        onClick={clearFilters}
                        className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                        <RotateCcw size={16} />
                        {t('requests.reset_filters')}
                    </button>
               </div>
          </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
              <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                          <th className="px-4 py-3 text-start">
                            <input
                              type="checkbox"
                              checked={selectedRequests.length === filteredRequests.length && filteredRequests.length > 0}
                              onChange={() => {
                                if (selectedRequests.length === filteredRequests.length) {
                                  setSelectedRequests([]);
                                } else {
                                  setSelectedRequests(filteredRequests.map((r: any) => r.id));
                                }
                              }}
                              className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                            />
                          </th>
                          <th className="px-4 py-3 text-start text-xs font-semibold text-slate-700 uppercase tracking-wider">#{t('common.id')}</th>
                          <th className="px-4 py-3 text-start text-xs font-semibold text-slate-700 uppercase tracking-wider">{t('requests.table.customer')}</th>
                          <th className="px-4 py-3 text-start text-xs font-semibold text-slate-700 uppercase tracking-wider">{t('common.service_type')}</th>
                          <th className="px-4 py-3 text-start text-xs font-semibold text-slate-700 uppercase tracking-wider">{t('requests.table.status')}</th>
                          <th className="px-4 py-3 text-start text-xs font-semibold text-slate-700 uppercase tracking-wider">{t('requests.technician')}</th>
                          <th className="px-4 py-3 text-start text-xs font-semibold text-slate-700 uppercase tracking-wider">{t('requests.scheduled_at')}</th>
                          <th className="px-4 py-3 text-start text-xs font-semibold text-slate-700 uppercase tracking-wider">{t('common.actions')}</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {loading ? (
                          <tr><td colSpan={8} className="text-center py-8"><LoadingSpinner /></td></tr>
                      ) : filteredRequests.length === 0 ? (
                          <tr><td colSpan={8} className="text-center py-8 text-slate-500">{t('common.no_data')}</td></tr>
                      ) : (
                          filteredRequests.map((req: any) => (
                              <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-4 py-3">
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
                                  <td className="px-4 py-3 font-mono text-sm text-slate-600">#{req.id}</td>
                                  <td className="px-4 py-3">
                                      <div className="flex items-center gap-2">
                                          <User className="text-slate-400" size={16} />
                                          <span className="text-sm font-medium text-slate-900">{req.user?.name || t('common.undefined')}</span>
                                      </div>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-slate-600">{req.service_type || '-'}</td>
                                  <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                                  <td className="px-4 py-3 text-sm text-slate-600">{req.technician?.name || t('requests.not_assigned')}</td>
                                  <td className="px-4 py-3 text-sm text-slate-600" dir="ltr">{req.scheduled_at ? new Date(req.scheduled_at).toLocaleDateString() : '-'}</td>
                                  <td className="px-4 py-3">
                                      <div className="flex items-center gap-2">
                                          <button
                                              onClick={() => navigate(`/dashboard/requests/${req.id}`)}
                                              className="text-slate-400 hover:text-blue-600 transition-colors p-2 hover:bg-blue-50 rounded-full"
                                              title={t('common.view_details')}
                                          >
                                              <Eye size={18} />
                                          </button>
                                          {userRole === 'admin' && (
                                              <>
                                                  <button onClick={() => setAssignModal({show: true, requestId: req.id})} className="text-green-600 hover:text-green-800">
                                                      <Settings size={18} />
                                                  </button>
                                                  <button
                                                    onClick={() => setDeleteModal({show: true, requestId: req.id, loading: false})}
                                                    className="text-red-600 hover:text-red-800"
                                                    title={t('common.delete')}>
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





      {/* Assign Modal */}
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
                            onClick={() => setAssignModal({show: false, requestId: null})}
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
            message={t('requests.delete_confirm_message') || 'Are you sure you want to delete this service request? This action cannot be undone.'}
            loading={deleteModal.loading}
        />
    </div>
  );
}

