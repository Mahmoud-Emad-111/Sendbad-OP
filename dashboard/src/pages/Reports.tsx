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

  const [ratings, setRatings] = useState<any[]>([]);

  useEffect(() => {
    loadReports();
    fetchRatings();
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

  const fetchRatings = async () => {
      try {
          const res = await api.get('/admin/reports/ratings');
          if (res.data.success) {
              setRatings(res.data.data);
          }
      } catch (error) {
          console.error("Error fetching ratings:", error);
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:block">
        {/* Top Customers */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 page-break-inside-avoid">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Users className="text-emerald-500" size={20} />
                {t('reports.top_customers') || 'Top Customers (Spending)'}
            </h2>
             <div className="space-y-4">
                {stats?.top_customers?.map((customer: any, idx: number) => (
                    <div key={customer.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                        <div className="flex items-center gap-3">
                             <div className={clsx(
                                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-emerald-100 text-emerald-700"
                            )}>
                                {idx + 1}
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">{customer.name}</h3>
                                <p className="text-xs text-slate-500">{customer.orders_count} {t('reports.orders') || 'Orders'}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="font-bold text-slate-900">{parseFloat(customer.total_spent).toLocaleString()} OMR</div>
                            <div className="text-xs text-slate-500">{t('reports.paid') || 'Paid'}: {parseFloat(customer.total_paid).toLocaleString()}</div>
                        </div>
                    </div>
                ))}
                 {(!stats?.top_customers || stats.top_customers.length === 0) && (
                    <p className="text-slate-500 text-center py-4">{t('reports.no_data') || 'No data available'}</p>
                )}
            </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 page-break-inside-avoid">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Package className="text-blue-500" size={20} />
                {t('reports.recent_transactions') || 'Recent Transactions'}
            </h2>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                            <th className="p-2">{t('reports.invoice') || 'Invoice'}</th>
                            <th className="p-2">{t('reports.customer') || 'Customer'}</th>
                            <th className="p-2 text-right">{t('reports.amount') || 'Amount'}</th>
                            <th className="p-2 text-center">{t('reports.status') || 'Status'}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {stats?.recent_transactions?.map((t: any) => (
                            <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-2 font-medium text-slate-900">{t.invoice_number}</td>
                                <td className="p-2 text-slate-600">{t.user?.name || 'N/A'}</td>
                                <td className="p-2 text-right font-bold text-slate-800">{parseFloat(t.total_amount).toLocaleString()}</td>
                                <td className="p-2 text-center">
                                    <span className={clsx(
                                        "px-2 py-0.5 rounded-full text-xs font-medium",
                                        t.status === 'paid' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                    )}>
                                        {t.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                         {(!stats?.recent_transactions || stats.recent_transactions.length === 0) && (
                            <tr>
                                <td colSpan={4} className="text-center py-4 text-slate-500">{t('reports.no_data')}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

      {/* Daily Activity Section */}
      <div className="border-t border-slate-200 pt-8 mt-8 print:border-none print:pt-0">
        <div className="flex items-center justify-between mb-6 print:hidden">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <CalendarIcon className="text-indigo-600" />
                {t('reports.daily_activity_log') || 'Daily Activity Log'}
            </h2>
            <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium text-sm"
            >
                <Package size={16} />
                {t('common.print_report') || 'Print Report'}
            </button>
        </div>

        {/* Print Header (Visible only when printing) */}
        <div className="hidden print:block mb-8">
            <h1 className="text-2xl font-bold text-black mb-2">{t('reports.daily_report') || 'Daily Operation Report'}</h1>
            <p className="text-gray-600">Date: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:block">
            {/* Calendar */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center print:hidden">
                <Calendar
                    onChange={setDate}
                    value={date}
                    className="border-0 shadow-none w-full font-sans rounded-xl p-2"
                    tileClassName={() => {
                        return "rounded-lg hover:bg-indigo-50 font-medium text-sm p-2";
                    }}
                />
            </div>

            {/* Activity List */}
            <div className="lg:col-span-2 space-y-4 print:w-full">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-slate-800">
                        {t('reports.completed_on') || 'Completed Requests on'} {date.toLocaleDateString()}
                    </h3>
                    <span className="text-sm bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium print:border print:border-slate-300">
                        {dailyRequests.length} {t('common.requests') || 'Requests'}
                    </span>
                </div>

                {loadingDaily ? (
                   <div className="py-12 flex justify-center"><LoadingSpinner /></div>
                ) : dailyRequests.length === 0 ? (
                    <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
                        <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p>{t('reports.no_completed') || 'No completed requests for this date'}</p>
                    </div>
                ) : (
                    dailyRequests.map((req) => (
                        <a
                            href={req.type === 'maintenance' ? `/dashboard/requests/${req.id}` : `/dashboard/requests/installation/${req.id}`}
                            key={`${req.type}-${req.id}`}
                            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4 cursor-pointer print:shadow-none print:border-slate-300 print:mb-2 page-break-inside-avoid"
                        >
                            <div className={clsx(
                                "w-10 h-10 rounded-full flex items-center justify-center shrink-0 print:hidden",
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
                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full print:bg-white print:text-black print:border print:border-black">
                                            <CheckCircle size={12} />
                                            {t('common.completed') || 'Completed'}
                                        </span>
                                        <p className="text-[10px] text-slate-400 mt-1 print:text-black">
                                            {new Date(req.completed_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-3 flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2 rounded-lg print:bg-white print:border print:border-slate-200">
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
                                        <div className="flex items-center gap-1 text-amber-500 font-bold print:text-black">
                                            {req.rating.rating} <Star size={12} className="fill-amber-500 print:hidden" />
                                            <span className="hidden print:inline">Stars</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </a>
                    ))
                )}
            </div>
        </div>
      </div>

      {/* Recent Ratings Section */}
      <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Star className="text-amber-500 fill-amber-500" />
              {t('reports.recent_ratings')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ratings.map((rating: any) => (
                  <div
                      key={rating.id}
                      onClick={() => window.location.href = rating.request_type === 'installation'
                          ? `/dashboard/installation-requests/${rating.request_id}`
                          : `/dashboard/requests/${rating.request_id}`
                      }
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                  >
                      <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600">
                                  {rating.user_name.charAt(0)}
                              </div>
                              <div>
                                  <div className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                                      {rating.user_name}
                                  </div>
                                  <div className="text-xs text-slate-500 flex items-center gap-1">
                                      <Clock size={10} />
                                      {rating.created_at}
                                  </div>
                              </div>
                          </div>
                          <div className="flex bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                              <span className="font-bold text-amber-600 mr-1">{rating.rating}</span>
                              <Star size={14} className="text-amber-500 fill-amber-500 mt-0.5" />
                          </div>
                      </div>

                      {rating.comment && (
                          <p className="text-sm text-slate-600 italic bg-slate-50 p-3 rounded-lg mb-3 line-clamp-2">
                              "{rating.comment}"
                          </p>
                      )}

                      {rating.image_url ? (
                          <div className="relative h-32 rounded-lg overflow-hidden border border-slate-200">
                              <img
                                  src={rating.image_url}
                                  alt="Rating Attachment"
                                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                              />
                              <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent flex items-end p-2">
                                  <span className="text-white text-xs font-medium flex items-center gap-1">
                                      <Users size={12} /> {t('request_details.rating_image')}
                                  </span>
                              </div>
                          </div>
                      ) : (
                          <div className="flex items-center justify-between text-xs text-slate-400 mt-2 pt-2 border-t border-slate-100">
                              <span>#{rating.request_id}</span>
                              <span className="capitalize">{rating.type || rating.request_type}</span>
                          </div>
                      )}
                  </div>
              ))}
              {ratings.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300">
                      <Star size={48} className="mx-auto text-slate-200 mb-3" />
                      <p>{t('reports.no_ratings')}</p>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
}
