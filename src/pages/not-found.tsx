import { Link } from 'react-router';

export function NotFound() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-9xl font-bold text-emerald-500/20 mb-4">404</div>
        <h1 className="text-3xl font-bold text-white mb-4">
          Không tìm thấy trang
        </h1>
        <p className="text-slate-400 mb-8">
          Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            to="/landing"
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            Về trang chủ
          </Link>
          <Link
            to="/app"
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
          >
            Về Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
