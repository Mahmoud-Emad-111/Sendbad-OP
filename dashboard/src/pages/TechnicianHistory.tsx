import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Loader,
  CheckCircle2,
  Clock,
  AlertCircle,
  Package,
  Wrench,
  Search,
  Filter,
  Calendar,
  User as UserIcon,
  MapPin,
  Phone
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import api from '../services/auth';
import { toast } from 'react-toastify';

export default function TechnicianHistory() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const [technician, setTechnician] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    status: 'all'
  });

  useEffect(() => {
    loadTechnicianHistory();
  }, [id]);

  /**
   * Load technician history with optimized API calls
   * Uses query parameters instead of client-side filtering for better performance
   */
  const loadTechnicianHistory = async () => {
    setLoading(true);
    try {
      // Fetch technician info
      const techRes = await api.get(`/admin/users/${id}`);
      if (techRes.data.success) {
        setTechnician(techRes.data.data);
      }

      // Fetch requests with technician_id filter (optimized)
      const [serviceRes, installRes] = await Promise.all([
        api.get('/requests', { params: { technician_id: id } }),
        api.get('/installation-requests', { params: { technician_id: id } })
      ]);

      const allRequests = [];

      // Add service requests
      if (serviceRes.data.success && serviceRes.data.data) {
        allRequests.push(...serviceRes.data.data.map((r: any) => ({...r, type: 'service'})));
      }

      // Add installation requests
      if (installRes.data.success && installRes.data.data) {
        allRequests.push(...installRes.data.data.map((r: any) => ({...r, type: 'installation'})));
      }

      // Sort by date descending
      allRequests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setHistory(allRequests);
    } catch (error: any) {
      console.error('Failed to load history', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  // Filter history based on search and filters
  const filteredHistory = history.filter(req => {
    const matchesSearch = !filters.search ||
      req.id.toString().includes(filters.search) ||
      req.user?.name?.toLowerCase().includes(filters.search.toLowerCase());

    const matchesType = filters.type === 'all' || req.type === filters.type;
    const matchesStatus = filters.status === 'all' || req.status === filters.status;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Calculate statistics
  const stats = {
    total: history.length,
    completed: history.filter(r => r.status === 'completed').length,
    inProgress: history.filter(r => r.status === 'in_progress' || r.status === 'on_way').length,
    pending: history.filter(r => r.status === 'pending' || r.status === 'assigned').length
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const config: any = {
      completed: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle2 },
      in_progress: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: Clock },
      on_way: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: Clock },
      pending: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', icon: Clock },
      assigned: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: Clock },
      canceled: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: AlertCircle }
    };

    const style = config[status] || config.pending;
    const Icon = style.icon;

    return (
      <span className={clsx("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border", style.bg, style.text, style.border)}>
        <Icon size={14} />
        {t(`requests.statuses.${status}`) || status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Header Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <ArrowLeft className="text-slate-600 rtl:rotate-180" size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{t('technician_history.title')}</h1>
                {technician && (
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <UserIcon size={16} />
                      <span className="font-medium">{technician.name}</span>
                    </div>
                    {technician.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone size={16} />
                        <span dir="ltr">{technician.phone}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-32">
            <div className="text-center">
              <Loader className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-slate-600 font-medium">{t('common.loading')}...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-blue-50 rounded-lg">
                    <FileText className="text-blue-600" size={20} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900 mb-1">{stats.total}</p>
                <p className="text-sm text-slate-600 font-medium">{t('technician_history.total_requests')}</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-green-50 rounded-lg">
                    <CheckCircle2 className="text-green-600" size={20} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900 mb-1">{stats.completed}</p>
                <p className="text-sm text-slate-600 font-medium">{t('technician_history.completed')}</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-blue-50 rounded-lg">
                    <Clock className="text-blue-600" size={20} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900 mb-1">{stats.inProgress}</p>
                <p className="text-sm text-slate-600 font-medium">{t('technician_history.in_progress')}</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-amber-50 rounded-lg">
                    <Clock className="text-amber-600" size={20} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900 mb-1">{stats.pending}</p>
                <p className="text-sm text-slate-600 font-medium">{t('technician_history.pending')}</p>
              </div>
            </div>

            {/* Filters Section */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                <Filter size={18} className="text-slate-600" />
                <h3 className="font-semibold text-slate-900">{t('requests.filter_title')}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute right-3 top-2.5 text-slate-400 rtl:right-auto rtl:left-3" size={18} />
                  <input
                    type="text"
                    placeholder={t('requests.search_placeholder')}
                    className="w-full pr-10 pl-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm rtl:pr-4 rtl:pl-10"
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  />
                </div>

                {/* Type Filter */}
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  value={filters.type}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="all">{t('technician_history.all_types')}</option>
                  <option value="service">{t('technician_history.service')}</option>
                  <option value="installation">{t('technician_history.installation')}</option>
                </select>

                {/* Status Filter */}
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="all">{t('requests.all_statuses')}</option>
                  <option value="pending">{t('requests.statuses.pending')}</option>
                  <option value="assigned">{t('requests.statuses.assigned')}</option>
                  <option value="on_way">{t('requests.statuses.on_way')}</option>
                  <option value="in_progress">{t('requests.statuses.in_progress')}</option>
                  <option value="completed">{t('requests.statuses.completed')}</option>
                  <option value="canceled">{t('requests.statuses.canceled')}</option>
                </select>
              </div>
            </div>

            {/* Requests List */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-slate-900">{t('technician_history.request_history')}</h2>
                  <span className="text-sm text-slate-600">
                    {filteredHistory.length} {t('technician_history.requests')}
                  </span>
                </div>
              </div>

              {filteredHistory.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                  <FileText size={56} className="mx-auto mb-4 text-slate-300" />
                  <p className="font-semibold text-lg mb-1">{t('technician_history.no_requests')}</p>
                  <p className="text-sm">{t('technician_history.no_requests_desc')}</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredHistory.map((req) => (
                    <div
                      key={`${req.type}-${req.id}`}
                      className="p-5 hover:bg-slate-50 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-6">
                        {/* Left Side - Request Info */}
                        <div className="flex-1 space-y-3">
                          {/* Type and Status Badges */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={clsx(
                              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border",
                              req.type === 'service'
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-purple-50 text-purple-700 border-purple-200"
                            )}>
                              {req.type === 'service' ? <Wrench size={14} /> : <Package size={14} />}
                              {req.type === 'service' ? t('technician_history.service') : t('technician_history.installation')}
                            </span>
                            <StatusBadge status={req.status} />
                          </div>

                          {/* Request Details Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-slate-500">{t('common.id')}:</span>
                              <span className="font-mono font-semibold text-slate-900">#{req.id}</span>
                            </div>

                            {req.user && (
                              <div className="flex items-center gap-2 text-sm">
                                <UserIcon size={14} className="text-slate-400" />
                                <span className="text-slate-900 font-medium">{req.user.name}</span>
                              </div>
                            )}

                            {req.service_type && (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-slate-500">{t('technician_history.type')}:</span>
                                <span className="text-slate-900">{req.service_type}</span>
                              </div>
                            )}

                            {req.address && (
                              <div className="flex items-center gap-2 text-sm col-span-2">
                                <MapPin size={14} className="text-slate-400 flex-shrink-0" />
                                <span className="text-slate-600 truncate">{req.address}</span>
                              </div>
                            )}

                            <div className="flex items-center gap-2 text-sm">
                              <Calendar size={14} className="text-slate-400" />
                              <span className="text-slate-600" dir="ltr">
                                {new Date(req.created_at).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right Side - Action Button */}
                        <button
                          onClick={() => navigate(req.type === 'service' ? `/dashboard/requests/${req.id}` : `/dashboard/requests/installation/${req.id}`)}
                          className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-all hover:shadow-md flex-shrink-0"
                        >
                          {t('common.view_details')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
