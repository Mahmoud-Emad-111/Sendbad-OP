import React from 'react';
import {
  CheckCircle,
  Circle,
  Clock,
  User,
  Settings,
  Truck,
  FileText,
  AlertCircle
} from 'lucide-react';

interface Activity {
  id: number;
  action: string;
  description: string;
  created_at: string;
  user: {
    id: number;
    name: string;
    role: string;
  } | null;
}

interface RequestTimelineProps {
  activities: Activity[];
}

const RequestTimeline: React.FC<RequestTimelineProps> = ({ activities }) => {
  if (!activities || activities.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
        <Clock className="w-8 h-8 mx-auto mb-2 text-slate-400" />
        <p>لا يوجد سجل نشاطات لهذا الطلب بعد.</p>
      </div>
    );
  }

  const getIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <FileText size={16} className="text-blue-600" />;
      case 'technician_accepted':
      case 'assigned':
        return <User size={16} className="text-purple-600" />;
      case 'status_updated':
        return <Settings size={16} className="text-amber-600" />;
      case 'completed':
        return <CheckCircle size={16} className="text-green-600" />;
        case 'on_way':
        return <Truck size={16} className="text-indigo-600" />;
      default:
        return <Circle size={16} className="text-slate-400" />;
    }
  };

  const getBgColor = (action: string) => {
     switch (action) {
      case 'created':
        return 'bg-blue-100';
      case 'technician_accepted':
      case 'assigned':
        return 'bg-purple-100';
      case 'status_updated':
        return 'bg-amber-100';
      case 'completed':
        return 'bg-green-100';
      case 'on_way':
        return 'bg-indigo-100';
      default:
        return 'bg-slate-100';
    }
  };

  const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('ar-EG', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          hour12: true
      }).format(date);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Clock size={18} className="text-slate-500" />
                سجل النشاطات
            </h3>
        </div>
        <div className="p-6">
            <div className="relative border-r-2 border-slate-100 mr-3 space-y-8">
                {activities.map((activity, index) => (
                <div key={activity.id} className="relative flex items-start gap-4 mr-[-9px]">
                    {/* Dot */}
                    <div className={`relative z-10 shrink-0 w-8 h-8 rounded-full ${getBgColor(activity.action)} flex items-center justify-center border-2 border-white ring-1 ring-slate-100`}>
                        {getIcon(activity.action)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pt-1">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
                            <span className="font-bold text-slate-800 text-sm">
                                {activity.description}
                            </span>
                            <span className="text-xs text-slate-400 font-medium font-mono dir-ltr text-right sm:text-left">
                                {formatDate(activity.created_at)}
                            </span>
                        </div>

                        {activity.user && (
                            <div className="flex items-center gap-2 mt-2 bg-slate-50 px-3 py-1.5 rounded-lg w-fit">
                                <span className={`w-1.5 h-1.5 rounded-full ${activity.user.role === 'admin' ? 'bg-red-500' : 'bg-blue-500'}`} />
                                <span className="text-xs text-slate-600 font-medium">
                                    {activity.user.name}
                                    <span className="text-slate-400 opacity-75 mx-1">({activity.user.role === 'admin' ? 'مسؤول' : (activity.user.role === 'technician' ? 'فني' : 'عميل')})</span>
                                </span>
                            </div>
                        )}
                    </div>
                </div>
                ))}
            </div>
        </div>
    </div>
  );
};

export default RequestTimeline;
