import { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/auth';
import clsx from 'clsx';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

interface Notification {
  id: string | number;
  type: 'deadline' | 'new_request';
  title: string;
  message: string;
  time: string;
  date: string;
  requestId: number;
  isRead: boolean;
}

export default function NotificationDropdown() {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [maxSeenId, setMaxSeenId] = useState<number>(0);
  const isFirstRun = useRef(true);

  useEffect(() => {
    checkNotifications();
    const interval = setInterval(checkNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const checkNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/requests?sort=id&direction=desc');
      if (res.data.success) {
        const requests = res.data.data;
        if (requests.length === 0) {
          setLoading(false);
          return;
        }

        const currentMaxId = Math.max(...requests.map((r: any) => r.id));
        const today = new Date();
        const newNotifications: Notification[] = [];
        let hasNewRequest = false;

        if (!isFirstRun.current && currentMaxId > maxSeenId) {
            const brandNew = requests.filter((r: any) => r.id > maxSeenId);
            brandNew.forEach((req: any) => {
                 hasNewRequest = true;
                 newNotifications.push({
                     id: `new-${req.id}`,
                     type: 'new_request',
                     title: t('notifications.new_request_title'),
                     message: t('notifications.new_request_message', {id: req.id, type: req.service_type || 'General'}),
                     time: new Date(req.created_at || Date.now()).toLocaleTimeString(i18n.language, {hour:'2-digit', minute:'2-digit'}),
                     date: new Date(req.created_at || Date.now()).toLocaleDateString(i18n.language),
                     requestId: req.id,
                     isRead: false
                 });
            });
        }

        if (currentMaxId > maxSeenId) {
            setMaxSeenId(currentMaxId);
        }

        requests.forEach((req: any) => {
           if (!req.task_end_time || req.status !== 'in_progress') return;
           const endTime = new Date(req.task_end_time);
           const isSameDay = endTime.toDateString() === today.toDateString();
           const isPassed = endTime < today;

           if (isSameDay || isPassed) {
               if (!newNotifications.find(n => n.requestId === req.id && n.type === 'new_request')) {
                   newNotifications.push({
                       id: `deadline-${req.id}`,
                       type: 'deadline',
                       title: t('notifications.deadline_title'),
                       message: t('notifications.deadline_message', {id: req.id, when: isPassed && !isSameDay ? t('common.already') : t('common.today')}),
                       time: endTime.toLocaleTimeString(i18n.language, {hour:'2-digit', minute:'2-digit'}),
                       date: endTime.toLocaleDateString(i18n.language),
                       requestId: req.id,
                       isRead: false
                   });
               }
           }
        });

        if (newNotifications.length > 0) {
            setNotifications(prev => {
                const combined = [...newNotifications, ...prev];
                const unique = combined.filter((v, i, a) => a.findIndex(t => String(t.id) === String(v.id)) === i);
                return unique;
            });

            try {
                const isSoundEnabled = localStorage.getItem('notification_sound') !== 'false';
                if (isSoundEnabled) {
                    const soundFile = hasNewRequest ? '/new_request.mp3' : '/notification.mp3';
                    const audio = new Audio(soundFile);
                    audio.volume = 0.5;
                    audio.play().catch(e => console.log("Audio blocked:", e));
                }
            } catch (err) {
                console.warn("Audio failed", err);
            }
        }

        isFirstRun.current = false;
      }
    } catch (error) {
       console.error("Failed to fetch notifications", error);
    } finally {
        setLoading(false);
    }
  };

  const unreadCount = notifications.length;

  const handleNotificationClick = (notif: Notification) => {
      setIsOpen(false);
      navigate(`/dashboard/requests/${notif.requestId}`);
  };

  const testSound = (e: any) => {
      e.stopPropagation();
      const isSoundEnabled = localStorage.getItem('notification_sound') !== 'false';

      if (!isSoundEnabled) {
          toast.info(t('notifications.sound_disabled'));
          return;
      }

      try {
          const audio = new Audio('/new_request.mp3');
          audio.volume = 0.5;
          audio.play().then(() => toast.success(t('notifications.sound_test_success'))).catch(() => toast.error(t('notifications.sound_blocked')));
      } catch (err) {
          console.error(err);
      }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
            "p-2 rounded-full relative transition-colors",
            isOpen ? "bg-slate-100 text-slate-800" : "text-slate-500 hover:bg-slate-100"
        )}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 origin-top-left animate-in fade-in zoom-in-95 duration-200 end-0 ltr:left-auto ltr:right-0 rtl:right-auto rtl:left-0">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-semibold text-slate-800">{t('notifications.title')}</h3>
                <div className="flex items-center gap-2">
                    <button onClick={testSound} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100">
                        {t('notifications.test_sound')}
                    </button>
                    {unreadCount > 0 && (
                        <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full">
                            {t('notifications.new_count', {count: unreadCount})}
                        </span>
                    )}
                </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
                        <Bell size={32} className="opacity-20" />
                        <p className="text-sm">{t('notifications.empty')}</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {notifications.map((notif) => (
                            <div
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif)}
                                className="p-4 hover:bg-slate-50 cursor-pointer transition-colors group relative"
                            >
                                <div className="flex items-start gap-3">
                                    <div className={clsx(
                                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1",
                                        notif.type === 'new_request' ? "bg-yellow-50 text-yellow-600" : "bg-red-50 text-red-500"
                                    )}>
                                        {notif.type === 'new_request' ? <Bell size={16} /> : <AlertTriangle size={16} />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-medium text-slate-800 text-sm group-hover:text-blue-600 transition-colors">
                                                {notif.title}
                                            </h4>
                                            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                                {notif.time}
                                            </span>
                                        </div>
                                        <p className="text-slate-600 text-xs leading-relaxed">
                                            {notif.message}
                                        </p>
                                        <div className="flex items-center gap-3 mt-2">
                                            <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                                <Clock size={10} />
                                                <span>{notif.date}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className={clsx(
                                    "absolute right-0 top-0 bottom-0 w-1 rounded-l opacity-0 group-hover:opacity-100 transition-opacity rtl:right-0 rtl:left-auto ltr:left-0 ltr:right-auto",
                                    notif.type === 'new_request' ? "bg-yellow-500" : "bg-red-500"
                                )}></div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {notifications.length > 0 && (
                <div className="p-2 border-t border-slate-100 bg-slate-50">
                    <button
                        onClick={() => setNotifications([])}
                        className="w-full py-2 text-xs text-center text-slate-500 hover:text-slate-800 font-medium hover:bg-slate-200/50 rounded-lg transition-colors"
                    >
                        {t('notifications.clear_all')}
                    </button>
                </div>
            )}
        </div>
      )}
    </div>
  );
}
