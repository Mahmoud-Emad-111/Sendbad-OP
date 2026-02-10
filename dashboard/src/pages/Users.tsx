import { useEffect, useState } from 'react';
import { adminService } from '../services/auth';
import { Search, UserPlus, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../services/auth';

export default function Users() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [deleting, setDeleting] = useState(false);

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

  const filteredUsers = users.filter(user => {
      const matchesRole = filter === 'all' || user.role === filter;
      const matchesSearch = (user.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
                            (user.phone || '').includes(search);
      return matchesRole && matchesSearch;
  });

  const toggleUser = (userId: number) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id));
    }
  };

  const deleteSingle = async (userId: number) => {
    if (!confirm(t('Are you sure you want to delete this user?'))) return;

    try {
      setDeleting(true);
      const res = await api.delete(`/admin/users/${userId}`);
      if (res.data.success) {
        setUsers(prev => prev.filter(u => u.id !== userId));
        alert(t('User deleted successfully'));
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error deleting user');
    } finally {
      setDeleting(false);
    }
  };

  const deleteSelected = async () => {
    if (selectedUsers.length === 0) return;
    if (!confirm(t(`Delete ${selectedUsers.length} selected user(s)?`))) return;

    try {
      setDeleting(true);
      const res = await api.post('/admin/users/bulk-delete', { ids: selectedUsers });
      if (res.data.success) {
        setUsers(prev => prev.filter(u => !selectedUsers.includes(u.id)));
        setSelectedUsers([]);
        alert(res.data.message);
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error deleting users');
    } finally {
      setDeleting(false);
    }
  };

  const RoleBadge = ({ role }: { role: string }) => {
    const styles: any = {
      admin: 'bg-purple-100 text-purple-700',
      technician: 'bg-blue-100 text-blue-700',
      customer: 'bg-green-100 text-green-700'
    };
    return (
      <span className={clsx("px-2 py-1 rounded-full text-xs font-semibold", styles[role] || 'bg-gray-100 text-gray-600')}>
        {t(`users.roles.${role}`)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('users.title')}</h1>
          <p className="text-slate-500">{t('users.subtitle')}</p>
        </div>
        <button
          onClick={() => window.location.href = '/dashboard/users/new'}
          className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800 transition-colors"
        >
            <UserPlus size={18} />
            {t('users.add_user')}
        </button>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedUsers.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-blue-900 font-medium">
              {selectedUsers.length} {t('selected')}
            </span>
            <button
              onClick={() => setSelectedUsers([])}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
            >
              <X size={16} />
              {t('common.cancel')}
            </button>
          </div>
          <button
            onClick={deleteSelected}
            disabled={deleting}
            className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            <Trash2 size={16} />
            {deleting ? t('common.deleting') + '...' : t('Delete Selected')}
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-2.5 text-slate-400 rtl:right-auto rtl:left-3" size={20} />
            <input
                type="text"
                placeholder={t('users.search_placeholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 rtl:pr-4 rtl:pl-10"
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
                    {t(`users.roles.${role}`)}
                </button>
            ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
            <table className="w-full text-start">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium text-sm">
                    <tr>
                        <th className="px-6 py-4 text-start">
                          <input
                            type="checkbox"
                            checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                            onChange={toggleAll}
                            className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                          />
                        </th>
                        <th className="px-6 py-4 text-start">{t('users.table.name')}</th>
                        <th className="px-6 py-4 text-start">{t('users.table.phone')}</th>
                        <th className="px-6 py-4 text-start">{t('users.table.role')}</th>
                        <th className="px-6 py-4 text-start">{t('Manual Orders')}</th>
                        <th className="px-6 py-4 text-start">{t('users.table.status')}</th>
                        <th className="px-6 py-4 text-start">{t('common.actions')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading ? (
                        <tr><td colSpan={7}><LoadingSpinner /></td></tr>
                    ) : filteredUsers.length === 0 ? (
                        <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">{t('common.no_data')}</td></tr>
                    ) : (
                        filteredUsers.map(user => (
                            <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                  <input
                                    type="checkbox"
                                    checked={selectedUsers.includes(user.id)}
                                    onChange={() => toggleUser(user.id)}
                                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                  />
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-900">{user.name || t('common.undefined')}</td>
                                <td className="px-6 py-4 text-slate-600" dir="ltr">{user.phone}</td>
                                <td className="px-6 py-4"><RoleBadge role={user.role} /></td>
                                <td className="px-6 py-4">
                                    {(user.manual_orders && user.manual_orders.length > 0) ? (
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded w-fit">
                                                {user.manual_orders.length} Orders
                                            </span>
                                            <div className="text-[10px] text-slate-400">
                                                {user.manual_orders.map((o:any) => o.invoice_number).join(', ')}
                                            </div>
                                        </div>
                                    ) : user.invoice_number ? (
                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded w-fit">
                                            {user.invoice_number}
                                        </span>
                                    ) : (
                                        <span className="text-slate-300">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={clsx("flex items-center gap-1.5 text-xs font-semibold", user.is_active ? "text-green-600" : "text-amber-600")}>
                                        <span className={clsx("w-1.5 h-1.5 rounded-full", user.is_active ? "bg-green-500" : "bg-amber-500")}></span>
                                        {user.is_active ? t('common.active') : t('common.inactive')}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                      <button
                                          onClick={() => window.location.href = `/dashboard/users/${user.id}`}
                                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                      >
                                          {t('common.view_details')}
                                      </button>
                                      <button
                                          onClick={() => deleteSingle(user.id)}
                                          disabled={deleting}
                                          className="text-red-600 hover:text-red-800 disabled:opacity-50"
                                          title={t('common.delete')}
                                      >
                                          <Trash2 size={16} />
                                      </button>
                                    </div>
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
