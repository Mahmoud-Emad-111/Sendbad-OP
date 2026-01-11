import { useEffect, useState } from 'react';
import api from '../services/auth';
import { Package, RefreshCw, AlertTriangle } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Inventory() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/admin/odoo/products');
            if (res.data.success) {
                setProducts(res.data.data);
            }
        } catch (err) {
            setError('فشل في تحميل المنتجات من Odoo. تأكد من الاتصال.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Package className="text-blue-600" />
                        المخزون (Odoo Integration)
                    </h1>
                    <p className="text-slate-500">عرض حي للمنتجات وقطع الغيار المتوفرة</p>
                </div>
                <button
                    onClick={loadProducts}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors"
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    تحديث البيانات
                </button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
                    <AlertTriangle size={20} />
                    {error}
                </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium text-sm">
                            <tr>
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4 w-1/3">اسم المنتج</th>
                                <th className="px-6 py-4">السعر (OMR)</th>
                                <th className="px-6 py-4 text-center">الكمية المتاحة</th>
                                <th className="px-6 py-4">الحالة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={5}><LoadingSpinner /></td></tr>
                            ) : products.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">لا يوجد منتجات متاحة</td></tr>
                            ) : (
                                products.map((product) => (
                                    <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-slate-400">#{product.id}</td>
                                        <td className="px-6 py-4 font-medium text-slate-900">{product.name}</td>
                                        <td className="px-6 py-4 text-slate-600 font-mono">{product.list_price}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                                product.qty_available > 10 ? 'bg-green-100 text-green-700' :
                                                product.qty_available > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                                {product.qty_available}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {product.qty_available > 0 ?
                                                <span className="text-green-600 text-xs font-semibold">متوفر</span> :
                                                <span className="text-red-500 text-xs font-semibold">نفذت الكمية</span>
                                            }
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
