export const formatVND = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0
  }).format(amount);
};

export const formatNumber = (num: number, decimals: number = 0) => {
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
};

export const formatPercent = (value: number, decimals: number = 1) => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('vi-VN');
};

export const calculateCAGR = (values: number[]) => {
  if (values.length < 2) return 0;
  const years = values.length - 1;
  const startValue = values[0];
  const endValue = values[values.length - 1];
  if (startValue <= 0) return 0;
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
};

// Màu theo điểm số (0–100). Nếu score = null → Chưa đánh giá
export const getSafetyColorByScore = (score: number | null): string => {
  if (score === null) return 'text-gray-500 bg-gray-100';
  if (score >= 80) return 'text-emerald-700 bg-emerald-100';
  if (score >= 60) return 'text-green-700 bg-green-100';
  if (score >= 40) return 'text-amber-700 bg-amber-100';
  if (score >= 20) return 'text-orange-700 bg-orange-100';
  return 'text-red-700 bg-red-100';
};

export const getSafetyLabelByScore = (score: number | null): string => {
  if (score === null) return 'Chưa đánh giá';
  if (score >= 80) return `An toàn (${score})`;
  if (score >= 60) return `Khá tốt (${score})`;
  if (score >= 40) return `Trung bình (${score})`;
  if (score >= 20) return `Rủi ro (${score})`;
  return `Nguy hiểm (${score})`;
};

// Giữ lại để tương thích với code cũ dùng string 'Safe'/'Unrated'/'Risky'
export const getSafetyColor = (safety: string) => {
  switch (safety) {
    case 'Safe':
      return 'text-emerald-700 bg-emerald-100';
    case 'Unrated':
      return 'text-gray-500 bg-gray-100';
    case 'Risky':
      return 'text-red-700 bg-red-100';
    default:
      return 'text-gray-500 bg-gray-100';
  }
};

export const getSafetyLabel = (safety: string) => {
  switch (safety) {
    case 'Safe':
      return 'An toàn';
    case 'Unrated':
      return 'Chưa đánh giá';
    case 'Risky':
      return 'Rủi ro';
    default:
      return safety;
  }
};
