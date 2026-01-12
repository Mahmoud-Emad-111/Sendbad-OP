import { useEffect, useState } from 'react';
import api from '../services/auth';
import { BarChart, Star, Clock, Trophy, TrendingUp, Users } from 'lucide-react';
import clsx from 'clsx';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTranslation } from 'react-i18next';

export default function Reports() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const res = await api.get('/admin/reports/performance');
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
            <BarChart size={28} />
        </div>
        <div>
            <h1 className="text-2xl font-bold text-slate-900">{t('reports.title')}</h1>
            <p className="text-slate-500">{t('reports.subtitle')}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-slate-500 text-sm mb-1">{t('reports.avg_completion_time')}</p>
                <div className="text-3xl font-bold text-slate-900 flex items-center gap-1">
                    {stats?.avg_completion_hours} <span className="text-sm font-normal text-slate-500">{t('reports.hours')}</span>
                </div>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                <Clock size={24} />
            </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-slate-500 text-sm mb-1">{t('reports.highest_rating')}</p>
                <div className="text-3xl font-bold text-slate-900">
                    {stats?.top_technicians?.[0]?.avg_rating ? parseFloat(stats.top_technicians[0].avg_rating).toFixed(1) : '---'}
                </div>
            </div>
            <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center">
                <Star size={24} className="fill-amber-500" />
            </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-slate-500 text-sm mb-1">{t('reports.total_ratings')}</p>
                <div className="text-3xl font-bold text-slate-900">
                    {stats?.ratings_breakdown?.reduce((acc: number, curr: any) => acc + curr.count, 0) || 0}
                </div>
            </div>
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center">
                <TrendingUp size={24} />
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Technicians */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Trophy className="text-amber-500" size={20} />
                {t('reports.top_technicians')}
            </h2>
            <div className="space-y-4">
                {stats?.top_technicians?.map((tech: any, idx: number) => (
                    <div key={tech.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className={clsx(
                                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                                idx === 0 ? "bg-amber-100 text-amber-700" :
                                idx === 1 ? "bg-slate-200 text-slate-700" :
                                idx === 2 ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                            )}>
                                {idx + 1}
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">{tech.name}</h3>
                                <p className="text-xs text-slate-500">{tech.completed_count} {t('reports.completed_requests')}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm">
                            <span className="font-bold text-slate-900">{parseFloat(tech.avg_rating).toFixed(1)}</span>
                            <Star size={14} className="text-amber-400 fill-amber-400" />
                        </div>
                    </div>
                ))}
                {(!stats?.top_technicians || stats.top_technicians.length === 0) && (
                    <p className="text-slate-500 text-center py-4">{t('reports.no_data')}</p>
                )}
            </div>
        </div>

        {/* Ratings Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Users className="text-blue-500" size={20} />
                {t('reports.customer_satisfaction')}
            </h2>
            <div className="space-y-4">
                {[5, 4, 3, 2, 1].map(stars => {
                    const ratingData = stats?.ratings_breakdown?.find((r: any) => r.rating === stars);
                    const count = ratingData ? ratingData.count : 0;
                    const total = stats?.ratings_breakdown?.reduce((acc: number, curr: any) => acc + curr.count, 0) || 1;
                    const percentage = (count / total) * 100;

                    return (
                        <div key={stars} className="flex items-center gap-3">
                            <div className="flex items-center gap-1 w-12 shrink-0 font-medium text-slate-700">
                                <span>{stars}</span>
                                <Star size={14} className="text-amber-400 fill-amber-400" />
                            </div>
                            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={clsx(
                                        "h-full rounded-full transition-all duration-500",
                                        stars >= 4 ? "bg-green-500" :
                                        stars === 3 ? "bg-amber-500" : "bg-red-500"
                                    )}
                                    style={{ width: `${percentage}%` }}
                                ></div>
                            </div>
                            <div className="w-16 text-left text-sm text-slate-500 font-mono">
                                {count} ({percentage.toFixed(0)}%)
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>
    </div>
  );
}
