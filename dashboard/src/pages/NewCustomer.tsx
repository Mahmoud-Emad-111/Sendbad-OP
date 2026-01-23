import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../services/auth';
import { UserPlus, Phone, FileText, Loader, ArrowLeft, User, Trash2, Plus, DollarSign, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import clsx from 'clsx';

export default function NewCustomer() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<{
      name: string,
      phone: string,
      orders: any[]
  }>({
      name: '',
      phone: '',
      orders: []
  });

  const handleCreateCustomer = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!formData.name || !formData.phone) {
          toast.error(t('manual_customer.fill_required'));
          return;
      }

      setSubmitting(true);
      try {
          const res = await adminService.createManualUser(formData);
          if(res.success) {
              toast.success(t('manual_customer.success'));
              navigate('/dashboard/users');
          }
      } catch (error: any) {
          toast.error(error.response?.data?.message || 'Error creating customer');
      } finally {
          setSubmitting(false);
      }
  };

  const addOrder = () => {
      setFormData({
          ...formData,
          orders: [
              ...formData.orders,
              {
                  invoice_number: '',
                  quotation_template: '',
                  total_amount: 0,
                  paid_amount: 0,
                  remaining_amount: 0,
                  status: 'partial'
              }
          ]
      });
  };

  const removeOrder = (index: number) => {
      const newOrders = [...formData.orders];
      newOrders.splice(index, 1);
      setFormData({...formData, orders: newOrders});
  };

  const updateOrder = (index: number, field: string, value: any) => {
      const newOrders = [...formData.orders];
      newOrders[index][field] = value;

      // Auto-calc logic
      if (field === 'total_amount' || field === 'paid_amount') {
          const total = parseFloat(newOrders[index].total_amount) || 0;
          const paid = parseFloat(newOrders[index].paid_amount) || 0;
          newOrders[index].remaining_amount = total - paid;
          newOrders[index].status = newOrders[index].remaining_amount <= 0 ? 'paid' : 'partial';
      }

      setFormData({...formData, orders: newOrders});
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="text-slate-600 rtl:rotate-180" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('manual_customer.title')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('manual_customer.subtitle')}</p>
        </div>
      </div>

      <form onSubmit={handleCreateCustomer} className="space-y-6">

        {/* Customer Details Card */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50/50 p-6 rounded-2xl border border-indigo-200 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4">
            <User className="text-indigo-600" size={22} />
            {t('manual_customer.customer_info')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                {t('manual_customer.full_name')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-2.5 border border-indigo-300 bg-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                placeholder={t('manual_customer.name_placeholder')}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                {t('common.phone')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="tel"
                  required
                  dir="ltr"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full pl-11 pr-4 py-2.5 border border-indigo-300 bg-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="968..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Orders Card */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 p-6 rounded-2xl border border-emerald-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
              <FileText className="text-emerald-600" size={22} />
              {t('manual_customer.orders_title')}
            </h2>
            <button
              type="button"
              onClick={addOrder}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors text-sm font-medium shadow-sm"
            >
              <Plus className="w-4 h-4" />
              {t('manual_customer.add_invoice')}
            </button>
          </div>

          <div className="space-y-4">
            {formData.orders.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-emerald-200 rounded-xl bg-white">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="text-slate-600 font-medium mb-1">
                  {t('manual_customer.no_invoices')}
                </p>
                <p className="text-slate-400 text-sm">
                  {t('manual_customer.no_invoices_hint')}
                </p>
              </div>
            ) : (
              formData.orders.map((order, index) => (
                <div
                  key={index}
                  className="relative group p-5 rounded-xl border border-emerald-200 bg-white hover:shadow-md transition-shadow"
                >
                  <button
                    type="button"
                    onClick={() => removeOrder(index)}
                    className="absolute top-3 right-3 z-10 p-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="space-y-4 pr-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                          {t('manual_customer.invoice_no')}
                        </label>
                        <input
                          type="text"
                          required
                          value={order.invoice_number}
                          onChange={(e) => updateOrder(index, 'invoice_number', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all"
                          placeholder={t('manual_customer.invoice_placeholder')}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                          {t('manual_customer.template')}
                        </label>
                        <input
                          type="text"
                          value={order.quotation_template}
                          onChange={(e) => updateOrder(index, 'quotation_template', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all"
                          placeholder={t('manual_customer.template_placeholder')}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {t('manual_customer.total')}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">OMR</span>
                          <input
                            type="number"
                            min="0"
                            step="0.001"
                            value={order.total_amount}
                            onChange={(e) => updateOrder(index, 'total_amount', e.target.value)}
                            className="w-full pl-12 pr-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-mono"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          {t('manual_customer.paid')}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">OMR</span>
                          <input
                            type="number"
                            min="0"
                            step="0.001"
                            value={order.paid_amount}
                            onChange={(e) => updateOrder(index, 'paid_amount', e.target.value)}
                            className="w-full pl-12 pr-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm font-mono"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                          {t('manual_customer.remaining')}
                        </label>
                        <div className={clsx(
                          "w-full px-3 py-2 border-2 rounded-lg text-sm font-mono font-bold flex items-center justify-between",
                          order.remaining_amount > 0
                            ? "bg-red-50 text-red-600 border-red-200"
                            : "bg-green-50 text-green-600 border-green-200"
                        )}>
                          <span>{order.remaining_amount.toFixed(3)}</span>
                          <span className="text-[10px] opacity-70">OMR</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => navigate('/dashboard/users')}
            className="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-medium"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-lg shadow-indigo-200"
          >
            {submitting ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>{t('common.saving')}</span>
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                <span>{t('manual_customer.create_btn')}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
