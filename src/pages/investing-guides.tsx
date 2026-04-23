import { BookOpen, TrendingUp, Shield, DollarSign, BarChart3, Calendar } from 'lucide-react';

const guides = [
  {
    id: '1',
    title: 'Cổ tức là gì? Tại sao nên đầu tư cổ phiếu trả cổ tức?',
    icon: DollarSign,
    color: 'emerald',
    description: 'Tìm hiểu về cổ tức, lợi ích của đầu tư cổ phiếu trả cổ tức và cách xây dựng dòng tiền thụ động.',
    topics: [
      'Cổ tức (Dividend) là gì?',
      'Các loại cổ tức: tiền mặt, cổ phiếu',
      'Lợi ích của đầu tư cổ phiếu trả cổ tức',
      'Sự khác biệt giữa đầu tư cổ tức và đầu tư tăng trưởng'
    ]
  },
  {
    id: '2',
    title: 'Các chỉ số quan trọng khi đánh giá cổ phiếu trả cổ tức',
    icon: BarChart3,
    color: 'blue',
    description: 'Hướng dẫn phân tích các chỉ số tài chính quan trọng để đánh giá chất lượng cổ phiếu trả cổ tức.',
    topics: [
      'Dividend Yield - Tỷ suất cổ tức',
      'Payout Ratio - Tỷ lệ chi trả',
      'Dividend Growth Rate - Tốc độ tăng trưởng cổ tức',
      'Dividend Streak - Chuỗi tăng trưởng cổ tức',
      'Free Cash Flow (FCF)',
      'Debt-to-Equity Ratio'
    ]
  },
  {
    id: '3',
    title: 'Đánh giá mức độ an toàn của cổ tức (Dividend Safety)',
    icon: Shield,
    color: 'purple',
    description: 'Cách xác định xem một cổ phiếu có khả năng duy trì và tăng cổ tức trong tương lai hay không.',
    topics: [
      'Phân tích Payout Ratio',
      'Đánh giá dòng tiền tự do (FCF)',
      'Xem xét tình hình nợ của công ty',
      'Lịch sử chi trả cổ tức',
      'Triển vọng ngành và vị thế cạnh tranh'
    ]
  },
  {
    id: '4',
    title: 'Chiến lược đầu tư cổ tức hiệu quả',
    icon: TrendingUp,
    color: 'amber',
    description: 'Các chiến lược đầu tư cổ tức phổ biến và cách áp dụng vào thị trường Việt Nam.',
    topics: [
      'Chiến lược Dividend Growth Investing',
      'Chiến lược High Yield',
      'Tái đầu tư cổ tức (DRIP)',
      'Đa dạng hóa danh mục cổ phiếu trả cổ tức',
      'Khi nào nên mua và bán cổ phiếu trả cổ tức'
    ]
  },
  {
    id: '5',
    title: 'Lịch cổ tức và các mốc thời gian quan trọng',
    icon: Calendar,
    color: 'teal',
    description: 'Hiểu về các ngày quan trọng trong lịch chi trả cổ tức tại thị trường Việt Nam.',
    topics: [
      'Ngày công bố (Declaration Date)',
      'Ngày giao dịch không hưởng quyền (Ex-Dividend Date)',
      'Ngày đăng ký cuối cùng (Record Date)',
      'Ngày thanh toán (Payment Date)',
      'Cách tính toán để hưởng cổ tức'
    ]
  },
  {
    id: '6',
    title: 'Thuế và chi phí khi đầu tư cổ phiếu',
    icon: DollarSign,
    color: 'red',
    description: 'Tìm hiểu về các loại thuế và chi phí liên quan đến đầu tư cổ phiếu tại Việt Nam.',
    topics: [
      'Thuế thu nhập từ cổ tức',
      'Thuế chuyển nhượng chứng khoán',
      'Phí giao dịch và phí lưu ký',
      'Cách tính toán lợi nhuận thực tế sau thuế'
    ]
  }
];

export function InvestingGuides() {
  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700 dark:border-slate-700">
          <h2 className="font-semibold mb-2 flex items-center gap-2">
            <BookOpen className="size-6 text-emerald-600 dark:text-emerald-400" />
            Hướng dẫn Đầu tư Cổ tức
          </h2>
          <p className="text-gray-600 dark:text-slate-300">
            Tài liệu hướng dẫn toàn diện về đầu tư cổ phiếu trả cổ tức tại thị trường Việt Nam
          </p>
        </div>

        {/* Guides Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {guides.map((guide) => {
            const Icon = guide.icon;
            const colorClasses = {
              emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
              blue: 'bg-blue-100 text-blue-700 border-blue-200',
              purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 border-purple-200',
              amber: 'bg-amber-100 text-amber-700 dark:text-amber-400 border-amber-200',
              teal: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-teal-200',
              red: 'bg-red-100 text-red-700 border-red-200'
            };

            return (
              <div
                key={guide.id}
                className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700 dark:border-slate-700 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className={`p-3 rounded-lg ${colorClasses[guide.color as keyof typeof colorClasses]}`}>
                    <Icon className="size-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">{guide.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-slate-300">{guide.description}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-700 dark:text-slate-300 uppercase">Nội dung chính:</p>
                  <ul className="space-y-1.5">
                    {guide.topics.map((topic, idx) => (
                      <li key={idx} className="text-sm text-gray-600 dark:text-slate-300 flex items-start gap-2">
                        <span className="text-emerald-600 dark:text-emerald-400 mt-1">•</span>
                        <span>{topic}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button className="mt-6 w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium">
                  Đọc ngay
                </button>
              </div>
            );
          })}
        </div>

        {/* Additional Resources */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
          <h3 className="font-semibold mb-4 text-blue-900">Tài nguyên bổ sung</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-blue-100">
              <h4 className="font-medium text-blue-900 mb-2">Thuật ngữ cơ bản</h4>
              <p className="text-sm text-blue-700">Từ điển các thuật ngữ đầu tư cổ phiếu và cổ tức phổ biến</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-blue-100">
              <h4 className="font-medium text-blue-900 mb-2">Công thức tính toán</h4>
              <p className="text-sm text-blue-700">Các công thức quan trọng để phân tích cổ phiếu trả cổ tức</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-blue-100">
              <h4 className="font-medium text-blue-900 mb-2">Case Study</h4>
              <p className="text-sm text-blue-700">Phân tích cụ thể các cổ phiếu trả cổ tức tốt nhất VN</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-blue-100">
              <h4 className="font-medium text-blue-900 mb-2">FAQ</h4>
              <p className="text-sm text-blue-700">Câu hỏi thường gặp về đầu tư cổ tức tại Việt Nam</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
