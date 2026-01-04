import { useEffect, useState } from 'react';
import { adminService } from '../services/auth';
import { Users as UsersIcon, Search } from 'lucide-react';
import clsx from 'clsx';

export default function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await adminService.getUsers();
      if (res.success) {
        setUsers(res.data);
      }
    } catch (error) {
      console.error("Failed to load users", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => filter === 'all' || user.role === filter);

  const RoleBadge = ({ role }: { role: string }) => {
    const styles: any = {
      admin: 'bg-purple-100 text-purple-700',
      technician: 'bg-blue-100 text-blue-700',
      customer: 'bg-green-100 text-green-700'
    };
    return (
      <span className={clsx("px-2 py-1 rounded-full text-xs font-semibold", styles[role] || 'bg-gray-100 text-gray-600')}>
        {role}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">المستخدمين</h1>
          <p className="text-slate-500">إدارة العملاء والمناديب والإدارة</p>
        </div>
        <button className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800 transition-colors">
            <UsersIcon size={18} />
            إضافة مستخدم
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-2.5 text-slate-400" size={20} />
            <input
                type="text"
                placeholder="بحث بالاسم أو رقم الهاتف..."
                className="w-full pr-10 pl-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-slate-900"
            />
        </div>
        <div className="flex gap-2">
            {['all', 'admin', 'technician', 'customer'].map(role => (
                <button
                  key={role}
                  onClick={() => setFilter(role)}
                  className={clsx(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
                    filter === role
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  )}
                >
                    {role === 'all' ? 'الكل' : role}
                </button>
            ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
            <table className="w-full text-right">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium text-sm">
                    <tr>
                        <th className="px-6 py-4">الاسم</th>
                        <th className="px-6 py-4">رقم الهاتف</th>
                        <th className="px-6 py-4">الدور</th>
                        <th className="px-6 py-4">الحالة</th>
                        <th className="px-6 py-4">تاريخ التسجيل</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading ? (
                        <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">جاري التحميل...</td></tr>
                    ) : filteredUsers.length === 0 ? (
                        <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">لا يوجد مستخدمين</td></tr>
                    ) : (
                        filteredUsers.map(user => (
                            <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-slate-900">{user.name || 'غير محدد'}</td>
                                <td className="px-6 py-4 text-slate-600" dir="ltr">{user.phone}</td>
                                <td className="px-6 py-4"><RoleBadge role={user.role} /></td>
                                <td className="px-6 py-4">
                                    <span className={clsx("flex items-center gap-1.5 text-xs font-semibold", user.is_active ? "text-green-600" : "text-amber-600")}>
                                        <span className={clsx("w-1.5 h-1.5 rounded-full", user.is_active ? "bg-green-500" : "bg-amber-500")}></span>
                                        {user.is_active ? 'نشط' : 'غير نشط'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-500 text-sm">
                                    {new Date(user.created_at).toLocaleDateString('ar-EG')}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}
