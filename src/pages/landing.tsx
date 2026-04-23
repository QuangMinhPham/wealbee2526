/**
 * Landing Page - Wealbee
 * Light mode: clean white design | Dark mode: slate/navy gradient
 */

import { useState, FormEvent } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import {
  ArrowRight,
  Check,
  Shield,
  Sparkles,
  BarChart3,
  Coins,
  Target,
  PieChart,
  Zap,
  Globe,
  Mail,
  CheckCircle2,
  LogIn,
  CalendarDays,
  Brain,
  LineChart,
  Award,
  Calculator,
  BookOpen,
  ChevronRight,
  Star,
  Moon,
  Sun
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect } from 'react';
import wealbeeLogoUrl from '../assets/BRAND_NAME-logo-color.svg';

function LandingThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-9 h-9" />;
  const isDark = theme === 'dark';
  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="p-2 rounded-lg transition-all text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}

export function Landing() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setIsSubmitted(true);
    setEmail('');
    setTimeout(() => setIsSubmitted(false), 5000);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 transition-colors duration-300">

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-700/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={wealbeeLogoUrl} alt="Wealbee" className="h-8 dark:brightness-0 dark:invert" />
          </div>
          <div className="hidden md:flex items-center gap-8">
            {[
              { label: 'Tính năng', href: '#features' },
              { label: 'Cách hoạt động', href: '#how-it-works' },
              { label: 'Bảng giá', href: '#pricing' },
            ].map(item => (
              <a key={item.label} href={item.href} className="text-sm text-slate-600 dark:text-slate-400 hover:text-[#4980DF] dark:hover:text-[#7aa8ef] transition-colors">
                {item.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <LandingThemeToggle />
            <Link to="/login" className="text-sm text-slate-600 dark:text-slate-400 hover:text-[#4980DF] dark:hover:text-[#7aa8ef] transition-colors flex items-center gap-1.5 px-2 py-1.5">
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Đăng nhập</span>
            </Link>
            <Link to="/login" className="px-4 py-2 bg-[#4980DF] hover:bg-[#3a6bc7] text-white text-sm font-medium rounded-lg transition-colors">
              Dùng thử miễn phí
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-16 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#4980DF]/5 dark:bg-[#4980DF]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-50 dark:bg-blue-900/20 rounded-full blur-3xl" />
          {/* Dark mode extra glow */}
          <div className="hidden dark:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#4980DF]/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 bg-[#4980DF]/10 dark:bg-[#4980DF]/20 rounded-full border border-[#4980DF]/20 dark:border-[#4980DF]/30"
              >
                <Sparkles className="w-4 h-4 text-[#4980DF]" />
                <span className="text-sm font-medium text-[#4980DF] dark:text-[#7aa8ef]">Nền tảng quản lý đầu tư #1 Việt Nam</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-6 leading-tight"
              >
                Quản lý{' '}
                <span className="text-[#4980DF]">toàn bộ tài sản</span>
                {' '}trong một nền tảng duy nhất
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-lg text-slate-600 dark:text-slate-300 mb-8 leading-relaxed max-w-xl"
              >
                Cổ phiếu, Vàng, Crypto, Trái phiếu — theo dõi thời gian thực trên 3 sàn HOSE, HNX, UPCOM.
                Kết hợp AI phân tích và tối ưu hóa dòng tiền thụ động.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-3 mb-8"
              >
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#4980DF] hover:bg-[#3a6bc7] text-white font-semibold rounded-xl transition-all shadow-lg shadow-[#4980DF]/25 hover:shadow-xl hover:shadow-[#4980DF]/30"
                >
                  Bắt đầu miễn phí
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:border-[#4980DF]/40 dark:hover:border-[#4980DF]/50 hover:text-[#4980DF] dark:hover:text-[#7aa8ef] transition-all"
                >
                  Khám phá tính năng
                </a>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex flex-wrap gap-6 text-sm text-slate-500 dark:text-slate-400"
              >
                <div className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-green-500" />
                  <span>Bảo mật tuyệt đối</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-[#4980DF]" />
                  <span>Setup 5 phút</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-purple-500" />
                  <span>Made in Vietnam</span>
                </div>
              </motion.div>
            </div>

            {/* Right: Dashboard Preview */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="hidden lg:block"
            >
              <div className="relative">
                {/* Main card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl shadow-slate-200/60 dark:shadow-slate-900/60 border border-slate-100 dark:border-slate-700 p-6 transform rotate-1">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Tổng quan danh mục</h3>
                    <span className="text-xs text-slate-400">Hôm nay</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                      { label: 'Tổng giá trị', value: '1.25 tỷ', sub: '+12.5%', subColor: 'text-green-600 dark:text-green-400' },
                      { label: 'Cổ tức/năm', value: '89.2 tr', sub: '7.1% yield', subColor: 'text-[#4980DF]' },
                      { label: 'Lãi/Lỗ', value: '+156 tr', sub: '+14.2%', subColor: 'text-green-600 dark:text-green-400' }
                    ].map(stat => (
                      <div key={stat.label} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{stat.label}</p>
                        <p className="text-base font-bold text-slate-900 dark:text-white">{stat.value}</p>
                        <p className={`text-xs font-medium ${stat.subColor}`}>{stat.sub}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-gradient-to-r from-[#4980DF]/5 to-blue-50 dark:from-[#4980DF]/10 dark:to-slate-700/50 rounded-xl p-4 h-28 flex items-end gap-1">
                    {[35, 45, 40, 55, 50, 65, 60, 70, 68, 75, 80, 85].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col justify-end">
                        <div className="bg-[#4980DF]/30 dark:bg-[#4980DF]/40 rounded-t-sm" style={{ height: `${h * 0.9}%` }}>
                          <div className="w-full h-1.5 bg-[#4980DF] rounded-t-sm" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Floating: Bee AI */}
                <div className="absolute -left-8 top-10 bg-white dark:bg-slate-800 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-700 p-4 w-48 transform -rotate-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                      <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">Bee AI</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    "VNM có tỷ suất cổ tức 5.2%, dividend safety cao..."
                  </p>
                </div>

                {/* Floating: Portfolio health */}
                <div className="absolute -right-4 bottom-6 bg-white dark:bg-slate-800 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-700 p-4 w-44 transform rotate-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
                      <Award className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">Sức khỏe A+</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {['Đa dạng', 'An toàn', 'Tăng trưởng'].map(tag => (
                      <span key={tag} className="px-1.5 py-0.5 bg-green-50 dark:bg-green-900/30 text-[9px] text-green-700 dark:text-green-400 rounded-full">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Exchanges Bar */}
      <section className="py-10 px-6 bg-slate-50 dark:bg-slate-800/50 border-y border-slate-100 dark:border-slate-700/50">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-xs text-slate-400 dark:text-slate-500 mb-5 uppercase tracking-widest font-medium">Hỗ trợ theo dõi đa tài sản</p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            {[
              { name: 'HOSE', desc: 'Sàn TP.HCM' },
              { name: 'HNX', desc: 'Sàn Hà Nội' },
              { name: 'UPCOM', desc: 'Thị trường UPCoM' },
              { name: 'Vàng', desc: 'SJC / DOJI' },
              { name: 'Crypto', desc: 'BTC, ETH, ...' }
            ].map(ex => (
              <div key={ex.name} className="text-center">
                <p className="text-base font-bold text-slate-700 dark:text-slate-200">{ex.name}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{ex.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problems */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Nhà đầu tư Việt Nam đang gặp vấn đề gì?
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              80% nhà đầu tư cá nhân vẫn đang quản lý danh mục bằng Excel hoặc cảm tính
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: BarChart3, color: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400', title: 'Tài sản phân tán', desc: 'Cổ phiếu trên 3 sàn, vàng tại ngân hàng, crypto trên nhiều sàn — mất hàng giờ mỗi ngày chỉ để cập nhật số liệu.' },
              { icon: Target, color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400', title: 'Thiếu công cụ phân tích', desc: 'Không có nền tảng nào tại VN cho phép theo dõi đa tài sản + phân tích cổ tức chuyên sâu + đánh giá sức khỏe danh mục.' },
              { icon: CalendarDays, color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400', title: 'Bỏ lỡ cổ tức & cơ hội', desc: 'Không theo dõi được lịch chi trả cổ tức, ngày giao dịch không hưởng quyền. Khi biết thì đã quá muộn.' },
            ].map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 hover:shadow-lg hover:shadow-slate-100 dark:hover:shadow-slate-900/40 transition-all"
              >
                <div className={`w-12 h-12 ${p.color} rounded-xl flex items-center justify-center mb-4`}>
                  <p.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{p.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-6 bg-slate-50 dark:bg-slate-800/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <div className="inline-flex items-center gap-2 bg-[#4980DF]/10 dark:bg-[#4980DF]/20 px-4 py-1.5 rounded-full border border-[#4980DF]/20 dark:border-[#4980DF]/30 mb-4">
              <Sparkles className="w-4 h-4 text-[#4980DF]" />
              <span className="text-sm font-medium text-[#4980DF] dark:text-[#7aa8ef]">10+ tính năng chuyên sâu</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Mọi thứ bạn cần, trong một nền tảng
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              Wealbee không chỉ là công cụ theo dõi — mà là trợ lý đầu tư toàn diện
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: BarChart3, bg: 'bg-blue-50 dark:bg-blue-900/20 text-[#4980DF]', title: 'Dashboard đa tài sản', desc: 'Theo dõi Cổ phiếu, Vàng, Crypto, Trái phiếu trong một giao diện. 6 chỉ số tổng quan, 7 tab phân tích chi tiết.', badge: 'Core' },
              { icon: Coins, bg: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400', title: 'Phân tích cổ tức chuyên sâu', desc: 'Dividend Safety Score, lịch sử chi trả, dự báo thu nhập thụ động 5 năm, lịch cổ tức tự động.', badge: 'Nổi bật' },
              { icon: Brain, bg: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400', title: 'Bee AI — Trợ lý đầu tư', desc: 'AI phân tích cổ phiếu, tư vấn chiến lược, đánh giá rủi ro. Hỏi bất kỳ câu hỏi nào về thị trường.', badge: 'AI' },
              { icon: LineChart, bg: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400', title: 'Biểu đồ hiệu suất', desc: 'So sánh hiệu suất danh mục với VN-Index, VN30, HNX, UPCOM. Nhiều khung thời gian: 1T, 3T, 1N, 5N.', badge: null },
              { icon: PieChart, bg: 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400', title: 'Đa dạng hóa & phân bổ', desc: 'Phân tích phân bổ theo Ngành, Loại tài sản, Sàn giao dịch. Biểu đồ trực quan với tỷ lệ phần trăm.', badge: null },
              { icon: Award, bg: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400', title: 'Sức khỏe danh mục', desc: 'Chấm điểm 5 chiều: Đa dạng hóa, An toàn, Thu nhập, Tăng trưởng, Bền vững. Xếp hạng A+ đến F.', badge: 'Độc quyền' },
              { icon: Target, bg: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400', title: 'So sánh cổ phiếu', desc: 'So sánh song song tối đa 5 cổ phiếu. 20+ chỉ số tài chính, Dividend Yield, Growth Rate.', badge: null },
              { icon: Calculator, bg: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400', title: 'Máy tính đầu tư', desc: '3 kịch bản đầu tư: An toàn, Cân bằng, Tăng trưởng. Dự phóng chi tiết theo năm với biểu đồ.', badge: null },
              { icon: BookOpen, bg: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400', title: 'Hướng dẫn & xếp hạng', desc: '6+ bài hướng dẫn chuyên sâu. Bảng xếp hạng Top cổ phiếu cổ tức, an toàn, tăng trưởng nhanh nhất.', badge: null },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 hover:shadow-lg hover:shadow-slate-100 dark:hover:shadow-slate-900/40 hover:border-[#4980DF]/20 dark:hover:border-[#4980DF]/30 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-11 h-11 ${f.bg} rounded-xl flex items-center justify-center`}>
                    <f.icon className="w-5 h-5" />
                  </div>
                  {f.badge && (
                    <span className="px-2 py-0.5 bg-[#4980DF]/10 dark:bg-[#4980DF]/20 text-[#4980DF] dark:text-[#7aa8ef] text-[10px] font-semibold rounded-full uppercase tracking-wide">
                      {f.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 group-hover:text-[#4980DF] dark:group-hover:text-[#7aa8ef] transition-colors">{f.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Highlight */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="bg-gradient-to-r from-[#4980DF] to-blue-600 px-6 py-4 flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">Bee AI — Trợ lý đầu tư</p>
                    <p className="text-white/70 text-xs">Powered by Gemini AI</p>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-end">
                    <div className="bg-[#4980DF] text-white rounded-2xl rounded-tr-md px-4 py-2.5 text-sm max-w-[80%]">
                      VNM có đáng đầu tư trong năm 2026 không?
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl rounded-tl-md px-4 py-3 text-sm max-w-[85%] leading-relaxed">
                      <p className="font-medium text-slate-900 dark:text-white mb-2">Phân tích VNM (Vinamilk):</p>
                      <ul className="space-y-1.5 text-xs">
                        {[
                          { text: 'Tỷ suất cổ tức: 5.2% — Cao hơn trung bình ngành' },
                          { text: 'Dividend Safety: An toàn — Chi trả ổn định 10+ năm', bold: 'An toàn', boldColor: 'text-green-600 dark:text-green-400' },
                          { text: 'P/E: 15.8x — Hợp lý so với ngành FMCG' },
                        ].map((item, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{item.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 bg-purple-50 dark:bg-purple-900/30 px-3 py-1.5 rounded-full mb-4">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide">Tích hợp AI</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                Hỏi bất kỳ điều gì về đầu tư
              </h2>
              <p className="text-lg text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                Bee AI là trợ lý đầu tư thông minh, sẵn sàng phân tích cổ phiếu,
                tư vấn chiến lược và đánh giá rủi ro danh mục 24/7.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Phân tích cổ phiếu tự động trên trang chi tiết',
                  'Tư vấn chiến lược đầu tư cá nhân hóa',
                  'Đánh giá rủi ro và đề xuất tái cân bằng',
                  'Lưu trữ lịch sử hội thoại để tra cứu',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-[#4980DF]/10 dark:bg-[#4980DF]/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-[#4980DF]" />
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-300">{item}</span>
                  </li>
                ))}
              </ul>
              <Link to="/login" className="inline-flex items-center gap-2 text-[#4980DF] dark:text-[#7aa8ef] font-semibold text-sm hover:gap-3 transition-all">
                Thử Bee AI ngay
                <ChevronRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6 bg-slate-50 dark:bg-slate-800/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">Bắt đầu chỉ trong 3 bước</h2>
            <p className="text-lg text-slate-500 dark:text-slate-400">Đơn giản, nhanh chóng và không cần kiến thức chuyên môn</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-14 left-[22%] right-[22%] h-0.5 bg-gradient-to-r from-[#4980DF]/20 via-[#4980DF]/40 to-[#4980DF]/20" />
            {[
              { step: '01', title: 'Đăng ký & nhập tài sản', desc: 'Tạo tài khoản miễn phí, sau đó nhập danh mục đầu tư. Hỗ trợ nhập thủ công hoặc CSV.', icon: LogIn },
              { step: '02', title: 'Xem tổng quan tức thì', desc: 'Dashboard tự động tính tổng giá trị, lãi/lỗ, cổ tức, và phân bổ tài sản của bạn.', icon: BarChart3 },
              { step: '03', title: 'Nhận phân tích từ AI', desc: 'Bee AI phân tích danh mục, chấm điểm sức khỏe, và đề xuất chiến lược tối ưu hóa.', icon: Brain },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="text-center"
              >
                <div className="w-14 h-14 mx-auto mb-4 bg-[#4980DF] rounded-2xl flex items-center justify-center shadow-lg shadow-[#4980DF]/25 relative z-10">
                  <span className="text-lg font-bold text-white">{item.step}</span>
                </div>
                <div className="w-12 h-12 mx-auto mb-4 bg-[#4980DF]/10 dark:bg-[#4980DF]/20 rounded-xl flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-[#4980DF]" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">Tại sao chọn Wealbee?</h2>
            <p className="text-lg text-slate-500 dark:text-slate-400">So sánh với cách quản lý đầu tư truyền thống</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm dark:shadow-slate-900/50"
          >
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left p-4 text-sm font-medium text-slate-500 dark:text-slate-400">Tính năng</th>
                  <th className="p-4 text-sm font-bold text-[#4980DF] dark:text-[#7aa8ef] text-center">Wealbee</th>
                  <th className="p-4 text-sm font-medium text-slate-400 text-center">Excel / App khác</th>
                </tr>
              </thead>
              <tbody>
                {[
                  'Theo dõi đa tài sản (Cổ phiếu + Vàng + Crypto)',
                  'AI phân tích & tư vấn tự động',
                  'Dividend Safety Score',
                  'Đánh giá sức khỏe danh mục 5 chiều',
                  'So sánh cổ phiếu song song',
                  'Lịch cổ tức tự động',
                  'So sánh với VN-Index benchmark',
                  'Giao diện tiếng Việt, định dạng VND',
                  'Dự báo thu nhập thụ động',
                ].map((row, i) => (
                  <tr key={i} className="border-b border-slate-50 dark:border-slate-700/50 last:border-b-0">
                    <td className="p-4 text-sm text-slate-700 dark:text-slate-300">{row}</td>
                    <td className="p-4 text-center">
                      <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                    </td>
                    <td className="p-4 text-center">
                      <div className="w-5 h-5 mx-auto rounded-full border-2 border-slate-200 dark:border-slate-600" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 bg-slate-50 dark:bg-slate-800/30">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">Miễn phí trong giai đoạn beta</h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 mb-10">Đăng ký ngay để được sử dụng miễn phí tất cả tính năng</p>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-[#4980DF] p-8 md:p-10 shadow-lg shadow-[#4980DF]/10 dark:shadow-[#4980DF]/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#4980DF] text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl">
                EARLY ACCESS
              </div>
              <div className="inline-flex items-center gap-2 bg-green-50 dark:bg-green-900/30 px-3 py-1.5 rounded-full mb-4">
                <Star className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-xs font-semibold text-green-600 dark:text-green-400">100 người đầu tiên — Miễn phí trọn đời</span>
              </div>
              <div className="mb-6">
                <span className="text-5xl font-bold text-slate-900 dark:text-white">0 VND</span>
                <span className="text-slate-400 ml-2">/tháng</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 max-w-lg mx-auto mb-8">
                {['Dashboard đa tài sản', 'Bee AI trợ lý đầu tư', 'Phân tích cổ tức chuyên sâu', 'Đánh giá sức khỏe danh mục', 'So sánh & xếp hạng cổ phiếu', 'Máy tính đầu tư', 'Biểu đồ hiệu suất & benchmark', 'Hướng dẫn đầu tư'].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 text-left">
                    <Check className="w-4 h-4 text-[#4980DF] flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <Link to="/login" className="inline-flex items-center gap-2 px-8 py-4 bg-[#4980DF] hover:bg-[#3a6bc7] text-white font-semibold rounded-xl transition-all shadow-lg shadow-[#4980DF]/25">
                Bắt đầu miễn phí ngay
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Email CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">Sẵn sàng kiểm soát tài sản?</h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 mb-8">Đăng ký nhận thông báo khi có tính năng mới và ưu đãi đặc biệt</p>
            <div className="max-w-md mx-auto">
              {!isSubmitted ? (
                <form onSubmit={handleSubmit}>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="email@example.com"
                        required
                        className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#4980DF] focus:border-transparent transition-all"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-3.5 bg-[#4980DF] hover:bg-[#3a6bc7] text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>Đăng ký <ArrowRight className="w-4 h-4" /></>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-xl p-5 flex items-center gap-4"
                >
                  <CheckCircle2 className="w-7 h-7 text-green-500 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-slate-900 dark:text-white font-semibold text-sm">Đăng ký thành công!</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Chúng tôi sẽ liên hệ với bạn sớm nhất.</p>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-900 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-2">
              <img src={wealbeeLogoUrl} alt="Wealbee" className="h-7 mb-4 dark:brightness-0 dark:invert" />
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 leading-relaxed max-w-sm">
                Nền tảng quản lý đầu tư thông minh cho nhà đầu tư Việt Nam.
                Tích hợp AI, theo dõi đa tài sản, tối ưu dòng tiền thụ động.
              </p>
              <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-xs">
                <Globe className="w-3.5 h-3.5" />
                <span>Made in Vietnam</span>
              </div>
            </div>
            <div>
              <h4 className="text-slate-900 dark:text-white font-semibold text-sm mb-4">Sản phẩm</h4>
              <ul className="space-y-2.5">
                {[{ label: 'Dashboard', to: '/login' }, { label: 'Bee AI', to: '/login' }, { label: 'Phân tích cổ phiếu', to: '/login' }, { label: 'Hướng dẫn', to: '/login' }].map(item => (
                  <li key={item.label}>
                    <Link to={item.to} className="text-sm text-slate-500 dark:text-slate-400 hover:text-[#4980DF] dark:hover:text-[#7aa8ef] transition-colors">{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-slate-900 dark:text-white font-semibold text-sm mb-4">Công ty</h4>
              <ul className="space-y-2.5">
                {['Về chúng tôi', 'Blog', 'Liên hệ', 'Tuyển dụng'].map(item => (
                  <li key={item}>
                    <a href="#" className="text-sm text-slate-500 dark:text-slate-400 hover:text-[#4980DF] dark:hover:text-[#7aa8ef] transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-100 dark:border-slate-700/50 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-400 dark:text-slate-500 text-xs">&copy; 2026 Wealbee. All rights reserved.</p>
            <div className="flex items-center gap-6">
              {['Điều khoản', 'Bảo mật', 'Cookies'].map(item => (
                <a key={item} href="#" className="text-slate-400 dark:text-slate-500 hover:text-[#4980DF] dark:hover:text-[#7aa8ef] transition-colors text-xs">{item}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
