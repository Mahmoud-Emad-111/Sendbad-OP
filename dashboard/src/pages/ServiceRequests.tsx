import { useEffect, useState } from 'react';
import api from '../services/auth';
import { Calendar, User, Settings, AlertCircle, CheckCircle, Clock, Eye, X, Filter, Search as SearchIcon, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import LoadingSpinner from '../components/LoadingSpinner';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

export default function ServiceRequests() {
  const { t, i18n } = useTranslation();
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
    const [viewModal, setViewModal] = useState<{show: boolean, request: any | null}>({show: false, request: null});
    const [deleteModal, setDeleteModal] = useState<{show: boolean, requestId: number | null, loading: boolean}>({show: false, requestId: null, loading: false});

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

    const handleAssignClick = (req: any) => {
        const sDate = req.scheduled_at ? new Date(req.scheduled_at).toISOString().split('T')[0] : '';
        const eDate = req.end_date ? new Date(req.end_date).toISOString().split('T')[0] : sDate;

        setAssignDates({ start: sDate, end: eDate });
        setAssignModal({show: true, requestId: req.id});
        fetchTechnicians(sDate, eDate);
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

    const handleDeleteClick = (requestId: number) => {
        setDeleteModal({ show: true, requestId, loading: false });
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
            <table className="w-full text-start">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium text-sm">
                    <tr>
                        <th className="px-6 py-4 text-start">{t('user_details.request_id')}</th>
                        <th className="px-6 py-4 text-start">{t('common.name')}</th>
                        <th className="px-6 py-4 text-start">{t('user_details.service_type')}</th>
                        <th className="px-6 py-4 text-start">{t('requests.invoice_number')}</th>
                        <th className="px-6 py-4 text-start">{t('common.address')}</th>
                        <th className="px-6 py-4 text-start">{t('requests.scheduled_at')}</th>
                        <th className="px-6 py-4 text-start">{t('common.status')}</th>
                        <th className="px-6 py-4 text-start">{t('requests.technician')}</th>
                        <th className="px-6 py-4 text-start">{t('common.actions')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading ? (
                        <tr><td colSpan={8}><LoadingSpinner /></td></tr>
                    ) : requests.length === 0 ? (
                        <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-500">{t('common.no_data')}</td></tr>
                    ) : (
                        requests.map(req => (
                            <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-mono text-slate-500">#{req.id}</td>
                                <td className="px-6 py-4 font-medium text-slate-900">{req.user?.name}</td>
                                <td className="px-6 py-4 text-slate-600">
                                    {t(`requests.types.${req.service_type}`) || req.service_type}
                                </td>
                                <td className="px-6 py-4 font-mono text-sm text-slate-600">{req.invoice_number || '-'}</td>
                                <td className="px-6 py-4 text-slate-500 truncate max-w-xs" title={req.address}>{req.address}</td>
                                <td className="px-6 py-4 text-slate-600">
                                    <div className="flex items-center gap-1.5 text-xs bg-slate-100 px-2 py-1 rounded w-fit">
                                        <Calendar size={14} />
                                        <span dir="ltr">{new Date(req.scheduled_at).toLocaleDateString()}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4"><StatusBadge status={req.status} /></td>
                                <td className="px-6 py-4 text-slate-600">
                                    {req.technician ? (
                                        <span className="flex items-center gap-1">
                                            <User size={14} className="text-blue-500" />
                                            {req.technician.name}
                                        </span>
                                    ) : (
                                        <span className="text-slate-400 text-xs italic">{t('requests.not_assigned')}</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => window.location.href = `/dashboard/requests/${req.id}`}
                                        className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                                        title={t('common.view_details')}
                                    >
                                        <Eye size={18} />
                                    </button>
                                    {req.status === 'pending' && userRole === 'admin' && (
                                        <button
                                            onClick={() => handleAssignClick(req)}
                                            className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded hover:bg-slate-800 transition-colors ml-2"
                                        >
                                            {t('requests.assign_technician')}
                                        </button>
                                    )}

                                    {userRole === 'admin' && (
                                        <button
                                            onClick={() => handleDeleteClick(req.id)}
                                            className="text-slate-400 hover:text-red-600 transition-colors p-1"
                                            title={t('common.delete')}
                                        >
                                           <Trash2 size={18} />
                                        </button>
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


      {/* View Details Modal */}
      {viewModal.show && viewModal.request && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">{t('requests.request_details')} #{viewModal.request.id}</h2>
                        <span className="text-sm text-slate-500">{t('common.created_at')}: {new Date(viewModal.request.created_at).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}</span>
                    </div>
                    <button onClick={() => setViewModal({show: false, request: null})} className="text-slate-400 hover:text-red-500">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Status & Service Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-slate-500 mb-1">{t('requests.client_info')}</h3>
                                <div className="font-semibold text-slate-900 flex items-center gap-2">
                                    <User size={16} className="text-blue-500" />
                                    {viewModal.request.user?.name}
                                </div>
                                <div className="text-sm text-slate-600 mt-1" dir="ltr">{viewModal.request.user?.phone}</div>
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-slate-500 mb-1">{t('user_details.service_type')}</h3>
                                <div className="font-semibold text-slate-900">{t(`requests.types.${viewModal.request.service_type}`) || viewModal.request.service_type}</div>
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-slate-500 mb-1">{t('requests.invoice_number')}</h3>
                                <div className="font-mono text-slate-900">{viewModal.request.invoice_number || '-'}</div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-slate-500 mb-1">{t('common.status')}</h3>
                                <StatusBadge status={viewModal.request.status} />
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-slate-500 mb-1">{t('requests.scheduled_at')}</h3>
                                <div className="flex items-center gap-2 text-slate-900 font-semibold">
                                    <Calendar size={16} className="text-indigo-500" />
                                    <span dir="ltr">
                                        {new Date(viewModal.request.scheduled_at).toLocaleDateString()} -
                                        {new Date(viewModal.request.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Location & Description */}
                    <div className="bg-slate-50 p-4 rounded-xl space-y-4">
                        <div>
                            <h3 className="text-sm font-medium text-slate-500 mb-1">{t('common.address')}</h3>
                            <p className="text-slate-900">{viewModal.request.address}</p>
                            {viewModal.request.latitude && (
                                <a
                                    href={`https://www.google.com/maps?q=${viewModal.request.latitude},${viewModal.request.longitude}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                                >
                                    عرض الموقع على الخريطة ↗
                                </a>
                            )}
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-slate-500 mb-1">{t('common.description')}</h3>
                            <p className="text-slate-700 leading-relaxed">{viewModal.request.description}</p>
                        </div>
                    </div>

                    {/* Images Gallery */}
                    <div>
                        <h3 className="text-sm font-medium text-slate-500 mb-3">{t('requests.attachments')}</h3>
                        {viewModal.request.attachments && viewModal.request.attachments.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {viewModal.request.attachments.map((img: any) => (
                                    <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group">
                                        <img
                                            src={`${import.meta.env.VITE_API_BASE_URL.replace('/api', '')}/storage/${img.file_path}`}
                                            alt="Request Attachment"
                                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                        />
                                        <a
                                            href={`${import.meta.env.VITE_API_BASE_URL.replace('/api', '')}/storage/${img.file_path}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm font-medium"
                                        >
                                            عرض الصورة
                                        </a>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-slate-50 rounded-lg text-slate-400 text-sm border border-dashed border-slate-200">
                                {t('requests.no_attachments')}
                            </div>
                        )}
                    </div>

                    {/* Technician Info */}
                    {viewModal.request.technician && (
                        <div className="border-t border-slate-100 pt-6">
                            <h3 className="text-sm font-medium text-slate-500 mb-2">{t('requests.technician')}</h3>
                            <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                                    {viewModal.request.technician.name.charAt(0)}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900">{viewModal.request.technician.name}</div>
                                    <div className="text-xs text-slate-500" dir="ltr">{viewModal.request.technician.phone}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

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

