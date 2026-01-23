import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import api from '../services/auth';

export default function TechnicianHistory() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const [technician, setTechnician] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTechnicianHistory();
  }, [id]);

  const loadTechnicianHistory = async () => {
    setLoading(true);
    try {
      // Fetch technician info
      const techRes = await api.get(`/admin/users/${id}`);
      if (techRes.data.success) {
        setTechnician(techRes.data.data);
      }

      // Fetch both service and installation requests
      const [serviceRes, installRes] = await Promise.all([
        api.get('/requests'),
        api.get('/installation-requests')
      ]);

      const allRequests = [];

      // Filter service requests assigned to this tech
      if (serviceRes.data.success && serviceRes.data.data) {
        const techServiceReqs = serviceRes.data.data.filter((r: any) => r.technician_id === parseInt(id || '0'));
        allRequests.push(...techServiceReqs.map((r: any) => ({...r, type: 'service'})));
      }

      // Filter installation requests assigned to this tech
      if (installRes.data.success && installRes.data.data) {
        const techInstallReqs = installRes.data.data.filter((r: any) => r.technician_id === parseInt(id || '0'));
        allRequests.push(...techInstallReqs.map((r: any) => ({...r, type: 'installation'})));
      }

      // Sort by date descending
      allRequests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setHistory(allRequests);
    } catch (error) {
      console.error('Failed to load history', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="text-slate-600 rtl:rotate-180" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('technician_history.title')}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {technician ? technician.name : '...'}
          </p>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader className="w-10 h-10 animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 rounded-xl border border-blue-200">
              <p className="text-sm text-blue-600 font-medium mb-1">{t('technician_history.total_requests')}</p>
              <p className="text-3xl font-bold text-slate-900">{history.length}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100/50 p-6 rounded-xl border border-green-200">
              <p className="text-sm text-green-600 font-medium mb-1">{t('technician_history.completed')}</p>
              <p className="text-3xl font-bold text-slate-900">
                {history.filter(r => r.status === 'completed').length}
              </p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 p-6 rounded-xl border border-amber-200">
              <p className="text-sm text-amber-600 font-medium mb-1">{t('technician_history.pending')}</p>
              <p className="text-3xl font-bold text-slate-900">
                {history.filter(r => r.status === 'pending' || r.status === 'in_progress').length}
              </p>
            </div>
          </div>

          {/* Requests List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">{t('technician_history.request_history')}</h2>
            </div>

            {history.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <FileText size={48} className="mx-auto mb-3 text-slate-300" />
                <p className="font-medium">{t('technician_history.no_requests')}</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {history.map((req) => (
                  <div key={`${req.type}-${req.id}`} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={clsx(
                            "px-2.5 py-0.5 rounded-full text-xs font-semibold",
                            req.type === 'service' ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                          )}>
                            {req.type === 'service' ? t('technician_history.service') : t('technician_history.installation')}
                          </span>
                          <span className={clsx(
                            "px-2.5 py-0.5 rounded-full text-xs font-semibold",
                            req.status === 'completed' ? 'bg-green-100 text-green-700' :
                            req.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                            req.status === 'pending' ? 'bg-gray-100 text-gray-700' :
                            'bg-red-100 text-red-700'
                          )}>
                            {t(`technician_history.status_${req.status}`) || req.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                          <p className="text-slate-600">
                            <span className="font-medium text-slate-900">{t('common.id')}:</span> #{req.id}
                          </p>
                          {req.user && (
                            <p className="text-slate-600">
                              <span className="font-medium text-slate-900">{t('technician_history.customer')}:</span> {req.user.name}
                            </p>
                          )}
                          {req.service_type && (
                            <p className="text-slate-600">
                              <span className="font-medium text-slate-900">{t('technician_history.type')}:</span> {req.service_type}
                            </p>
                          )}
                          <p className="text-slate-600">
                            <span className="font-medium text-slate-900">{t('common.date')}:</span> {new Date(req.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => navigate(req.type === 'service' ? `/dashboard/requests/${req.id}` : `/dashboard/requests/installation/${req.id}`)}
                        className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 transition-colors"
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
  );
}
