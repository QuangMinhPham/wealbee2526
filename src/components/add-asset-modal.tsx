import { useState } from 'react';
import { X, Plus, TrendingUp, Coins, Bitcoin, Landmark, Package } from 'lucide-react';
import { supabase } from '../lib/supabase/client';
import { useAuth } from '../lib/auth-context';
import { formatVND } from '../lib/utils';

interface AddAssetModalProps {
  portfolioId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ASSET_TYPES = [
  { value: 'stock', label: 'Cổ phiếu', icon: TrendingUp, color: 'text-blue-600 bg-blue-50' },
  { value: 'gold', label: 'Vàng', icon: Coins, color: 'text-yellow-600 bg-yellow-50' },
  { value: 'crypto', label: 'Crypto', icon: Bitcoin, color: 'text-orange-600 bg-orange-50' },
  { value: 'bond', label: 'Trái phiếu', icon: Landmark, color: 'text-purple-600 bg-purple-50' },
  { value: 'other', label: 'Tài sản khác', icon: Package, color: 'text-gray-600 bg-gray-50' },
];

export function AddAssetModal({ portfolioId, isOpen, onClose, onSuccess }: AddAssetModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'type' | 'details'>('type');
  const [assetType, setAssetType] = useState('stock');
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [fee, setFee] = useState('0');
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const totalAmount = (parseFloat(quantity) || 0) * (parseFloat(price) || 0);
  const feeAmount = (parseFloat(fee) || 0) / 100 * totalAmount;
  const totalCost = totalAmount + feeAmount;

  const handleSelectType = (type: string) => {
    setAssetType(type);
    setStep('details');
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!symbol.trim() || !name.trim()) {
      setError('Vui lòng nhập mã và tên tài sản');
      return;
    }
    if (!quantity || parseFloat(quantity) <= 0) {
      setError('Vui lòng nhập số lượng hợp lệ');
      return;
    }
    if (!price || parseFloat(price) <= 0) {
      setError('Vui lòng nhập giá mua hợp lệ');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // 1. Find or get asset_type_id
      const { data: assetTypes } = await supabase
        .from('asset_types')
        .select('id')
        .eq('code', assetType === 'stock' ? 'VN_STOCK' : assetType.toUpperCase())
        .limit(1);

      let assetTypeId = assetTypes?.[0]?.id;

      // Fallback: get the first asset type if not found
      if (!assetTypeId) {
        const { data: fallbackTypes } = await supabase
          .from('asset_types')
          .select('id')
          .limit(1);
        assetTypeId = fallbackTypes?.[0]?.id;
      }

      if (!assetTypeId) {
        // Create a default asset type if none exists
        const { data: newType } = await supabase
          .from('asset_types')
          .insert({
            code: assetType.toUpperCase(),
            name_en: assetType,
            name_vi: ASSET_TYPES.find(t => t.value === assetType)?.label || assetType,
            category: assetType,
          })
          .select('id')
          .single();
        assetTypeId = newType?.id;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Không tìm thấy thông tin người dùng');

      // Map assetType to new enum values
      const assetTypeMap: Record<string, string> = {
        'stock': 'stock',
        'etf': 'etf',
        'fund': 'mutual_fund',
        'bond': 'bond',
        'crypto': 'crypto',
        'real_estate': 'real_estate',
        'gold': 'commodity',
        'other': 'other'
      };
      const mappedAssetType = assetTypeMap[assetType] || 'other';

      // 2. Create the asset in new schema (using any to bypass type check for now)
      const { data: asset, error: assetError } = await supabase
        .from('assets')
        .insert({
          portfolio_id: portfolioId,
          user_id: user.id,
          symbol: symbol.toUpperCase().trim(),
          name: name.trim(),
          asset_type: mappedAssetType,
          quantity: 0,
          average_cost: 0,
          total_cost: 0,
          current_price: parseFloat(price),
          current_value: 0,
        } as any)
        .select()
        .single();

      if (assetError) {
        // Asset might already exist in this portfolio
        if (assetError.code === '23505') {
          const { data: existingAsset } = await supabase
            .from('assets')
            .select('id')
            .eq('portfolio_id', portfolioId)
            .eq('symbol', symbol.toUpperCase().trim())
            .limit(1)
            .single();
          
          if (existingAsset) {
            await createHoldingAndTransaction(existingAsset.id);
            return;
          }
        }
        throw assetError;
      }

      await createHoldingAndTransaction(asset.id);
    } catch (err: any) {
      console.error('Error adding asset:', err);
      setError(err.message || 'Không thể thêm tài sản. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const createHoldingAndTransaction = async (assetId: string) => {
    const qty = parseFloat(quantity);
    const prc = parseFloat(price);
    const feeAmt = (parseFloat(fee) || 0) / 100 * qty * prc;
    const totalCost = qty * prc + feeAmt;

    // 3. Update asset with initial holding info
    const { error: assetUpdateError } = await supabase
      .from('assets')
      .update({
        quantity: qty,
        average_cost: prc,
        total_cost: totalCost,
        current_price: prc,
        current_value: qty * prc,
        unrealized_gain_loss: 0,
        unrealized_gain_loss_percentage: 0,
      })
      .eq('id', assetId);

    if (assetUpdateError) throw assetUpdateError;

    // 4. Create BUY transaction (using any to bypass type check)
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        portfolio_id: portfolioId,
        asset_id: assetId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        transaction_type: 'buy',
        transaction_status: 'completed',
        quantity: qty,
        price_per_unit: prc,
        total_amount: qty * prc,
        fee: feeAmt,
        transaction_date: new Date(transactionDate).toISOString(),
        notes: notes || undefined,
      } as any);

    if (txError) throw txError;

    // Success
    resetForm();
    onSuccess();
    onClose();
  };

  const resetForm = () => {
    setStep('type');
    setAssetType('stock');
    setSymbol('');
    setName('');
    setQuantity('');
    setPrice('');
    setFee('0');
    setNotes('');
    setError('');
    setTransactionDate(new Date().toISOString().split('T')[0]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {step === 'type' ? 'Chọn loại tài sản' : 'Thêm tài sản'}
          </h2>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="size-5 text-gray-400" />
          </button>
        </div>

        {step === 'type' ? (
          /* Step 1: Asset Type Selection */
          <div className="p-5 space-y-3">
            {ASSET_TYPES.map(type => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  onClick={() => handleSelectType(type.value)}
                  className="w-full flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-left group"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${type.color}`}>
                    <Icon className="size-5" />
                  </div>
                  <span className="font-medium text-gray-700 group-hover:text-emerald-700">
                    {type.label}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          /* Step 2: Asset Details Form */
          <div className="p-5 space-y-4">
            {/* Back button */}
            <button
              onClick={() => setStep('type')}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              ← Đổi loại tài sản
            </button>

            {/* Asset type badge */}
            <div className="flex items-center gap-2">
              {(() => {
                const t = ASSET_TYPES.find(t => t.value === assetType);
                const Icon = t?.icon || Package;
                return (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${t?.color}`}>
                    <Icon className="size-3.5" />
                    {t?.label}
                  </span>
                );
              })()}
            </div>

            {/* Symbol / Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {assetType === 'stock' ? 'Mã chứng khoán' : 'Mã / Ký hiệu'}
              </label>
              <input
                type="text"
                placeholder={assetType === 'stock' ? 'VD: VNM, VCB, HPG' : 'VD: BTC, SJC'}
                value={symbol}
                onChange={e => setSymbol(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên tài sản
              </label>
              <input
                type="text"
                placeholder="VD: Vinamilk, Bitcoin, Vàng SJC"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>

            {/* Quantity & Price Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số lượng
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Giá mua (VND)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            {/* Fee & Date Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phí giao dịch (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.15"
                  value={fee}
                  onChange={e => setFee(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ngày mua
                </label>
                <input
                  type="date"
                  value={transactionDate}
                  onChange={e => setTransactionDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ghi chú (tùy chọn)
              </label>
              <input
                type="text"
                placeholder="Ghi chú..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>

            {/* Summary */}
            {totalAmount > 0 && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Giá trị:</span>
                  <span>{formatVND(totalAmount)}</span>
                </div>
                {feeAmount > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Phí ({fee}%):</span>
                    <span>{formatVND(feeAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-200">
                  <span>Tổng chi:</span>
                  <span>{formatVND(totalCost)}</span>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang thêm...
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  Thêm tài sản
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
