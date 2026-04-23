import { useNavigate } from 'react-router'

export function BlogCTA() {
  const navigate = useNavigate()

  return (
    <div className="mt-12 bg-gradient-to-br from-[#032d6b] via-[#0849ac] to-[#2563eb] rounded-2xl px-8 py-10 text-center text-white">
      <h2 className="text-[20px] font-extrabold tracking-tight leading-tight mb-2">
        Nhận tin tức đầu tư cá nhân hoá mỗi sáng
      </h2>
      <p className="text-[15px] opacity-85 leading-relaxed mb-6 max-w-sm mx-auto">
        Wealbee phân tích tác động của tin tức lên từng tài sản trong danh mục của bạn, sau đó gửi thẳng vào email trước khi thị trường mở cửa.
      </p>
      <button
        onClick={() => navigate('/start')}
        className="bg-white text-[#0849ac] font-bold text-[15px] px-7 py-3 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
      >
        Bắt đầu miễn phí →
      </button>
    </div>
  )
}
