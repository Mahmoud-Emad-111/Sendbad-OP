import { useEffect, useState } from 'react';
import api from '../services/auth';
import { BarChart, Star, Clock, Trophy, TrendingUp, Users, Calendar as CalendarIcon, CheckCircle, Wrench, Package } from 'lucide-react';
import clsx from 'clsx';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTranslation } from 'react-i18next';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

export default function Reports() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Calendar State
  const [date, setDate] = useState<any>(new Date());
  const [dailyRequests, setDailyRequests] = useState<any[]>([]);
  const [loadingDaily, setLoadingDaily] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    fetchDailyActivity(date);
  }, [date]);

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

  const fetchDailyActivity = async (selectedDate: Date) => {
      try {
          setLoadingDaily(true);
          // Adjust for timezone offset if needed, or just use simple ISO string split if local time is desired
          // Using strict YYYY-MM-DD
          const year = selectedDate.getFullYear();
          const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
          const day = String(selectedDate.getDate()).padStart(2, '0');
          const formattedDate = `${year}-${month}-${day}`;

          const res = await api.get(`/admin/reports/daily-activity?date=${formattedDate}`);
          if (res.data.success) {
              setDailyRequests(res.data.data);
          }
      } catch (error) {
          console.error("Error fetching daily activity:", error);
      } finally {
          setLoadingDaily(false);
      }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
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

      {/* Daily Activity Section */}
      <div className="border-t border-slate-200 pt-8 mt-8">
        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <CalendarIcon className="text-indigo-600" />
            {t('Daily Activity Log')}
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Calendar */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
                <Calendar
                    onChange={setDate}
                    value={date}
                    className="border-0 shadow-none w-full font-sans rounded-xl p-2"
                    tileClassName={() => {
                        // Optional: Highlight dates with activity if we fetch monthly data
                        // For now, just styling
                        return "rounded-lg hover:bg-indigo-50 font-medium text-sm p-2";
                    }}
                />
            </div>

            {/* Activity List */}
            <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-slate-800">
                        {t('Completed Requests on')} {date.toLocaleDateString()}
                    </h3>
                    <span className="text-sm bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">
                        {dailyRequests.length} {t('Common.requests')}
                    </span>
                </div>

                {loadingDaily ? (
                   <div className="py-12 flex justify-center"><LoadingSpinner /></div>
                ) : dailyRequests.length === 0 ? (
                    <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
                        <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p>{t('No completed requests for this date')}</p>
                    </div>
                ) : (
                    dailyRequests.map((req) => (
                        <div key={`${req.type}-${req.id}`} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
                            <div className={clsx(
                                "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                                req.type === 'maintenance' ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                            )}>
                                {req.type === 'maintenance' ? <Wrench size={20} /> : <Package size={20} />}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-sm">
                                            {req.type === 'maintenance'
                                                ? `${req.service_type || 'Maintenance'} Request`
                                                : `${req.product_type} Installation`}
                                        </h4>
                                        <p className="text-xs text-slate-500 mt-0.5">#{req.invoice_number}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                            <CheckCircle size={12} />
                                            {t('Completed')}
                                        </span>
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            {new Date(req.completed_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-3 flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">
                                    <div className="flex gap-4">
                                        <span className="flex items-center gap-1">
                                            <Users size={12} className="text-slate-400" />
                                            {req.customer_name}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Wrench size={12} className="text-slate-400" />
                                            {req.technician_name}
                                        </span>
                                    </div>
                                    {req.rating && (
                                        <div className="flex items-center gap-1 text-amber-500 font-bold">
                                            {req.rating.rating} <Star size={12} className="fill-amber-500" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
