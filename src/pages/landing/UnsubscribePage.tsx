import { useState } from "react";
import { useNavigate } from "react-router";
import { Navbar } from "../../components/landing/Navbar";
import { Check } from "lucide-react";
import { unsubscribeEmail } from "../../lib/landing/subscribe";

export default function UnsubscribePage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);
    const result = await unsubscribeEmail(email);
    setIsLoading(false);
    if (result.success) {
      setIsSubmitted(true);
    } else {
      setErrorMsg(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#f0f7ff]">
      <Navbar />

      <div className="flex items-center justify-center px-6 py-16 min-h-[calc(100vh-76px)]">
        <div className="w-full max-w-[480px]">
          {!isSubmitted ? (
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-[#f0f7ff] rounded-full flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <path d="M3 8L10.89 13.26C11.2187 13.4793 11.6049 13.5963 12 13.5963C12.3951 13.5963 12.7813 13.4793 13.11 13.26L21 8M5 19H19C19.5304 19 20.0391 18.7893 20.4142 18.4142C20.7893 18.0391 21 17.5304 21 17V7C21 6.46957 20.7893 5.96086 20.4142 5.58579C20.0391 5.21071 19.5304 5 19 5H5C4.46957 5 3.96086 5.21071 3.58579 5.58579C3.21071 5.96086 3 6.46957 3 7V17C3 17.5304 3.21071 18.0391 3.58579 18.4142C3.96086 18.7893 4.46957 19 5 19Z"
                      stroke="#0849ac" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>

              <h1 className="text-2xl font-bold text-center text-[#111827] mb-2">Hủy đăng ký</h1>
              <p className="text-center text-gray-600 mb-8">
                Nhập email bạn đã đăng ký để dừng nhận tin nhắn từ Wealbee
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Địa chỉ email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrorMsg(""); }}
                    placeholder="email@example.com"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0849ac] focus:border-transparent outline-none transition-all"
                  />
                </div>

                {errorMsg && (
                  <p className="text-[13px] text-red-500 text-center">{errorMsg}</p>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !email}
                  className="w-full bg-[#0849ac] text-white py-3 rounded-lg font-semibold hover:bg-[#063d8f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Đang xử lý...
                    </span>
                  ) : (
                    "Xác nhận hủy đăng ký"
                  )}
                </button>
              </form>

              <p className="text-xs text-gray-500 text-center mt-6">
                Bạn sẽ không còn nhận được email thông báo và bản tin từ Wealbee
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-[#111827] mb-3">Đã hủy đăng ký thành công</h2>
              <p className="text-gray-600 mb-2">
                Email <span className="font-semibold text-[#0849ac]">{email}</span> đã được gỡ khỏi danh sách nhận tin.
              </p>
              <p className="text-gray-500 text-sm mb-8">
                Bạn sẽ không còn nhận được email từ Wealbee nữa.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => { setIsSubmitted(false); setEmail(""); setErrorMsg(""); }}
                  className="w-full bg-[#0849ac] text-white py-3 rounded-lg font-semibold hover:bg-[#063d8f] transition-colors"
                >
                  Hủy đăng ký email khác
                </button>
                <button
                  onClick={() => navigate("/")}
                  className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                >
                  Quay về trang chủ
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-6">
                Đổi ý rồi?{" "}
                <a href="/start" className="text-[#0849ac] hover:underline font-medium">
                  Đăng ký lại
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
