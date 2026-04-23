import { Link } from 'react-router'
import type { PostSummary } from '../lib/blogTypes'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function estimateReadTime(excerpt: string | null) {
  // Without full content, use excerpt length as rough estimate
  if (!excerpt) return 3
  const words = excerpt.replace(/<[^>]+>/g, '').split(/\s+/).length
  return Math.max(2, Math.ceil((words * 10) / 200)) // excerpt ≈ 10% of article
}

export function PostCard({ post }: { post: PostSummary }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group block bg-white border border-[#e8f2ff] rounded-2xl overflow-hidden hover:shadow-lg hover:border-[#b8d9ff] transition-all duration-200"
    >
      {/* Cover — 16:9 */}
      <div className="aspect-video overflow-hidden bg-gradient-to-br from-[#1d4ed8] via-[#0849ac] to-[#2563eb]">
        {post.cover_url ? (
          <img
            src={post.cover_url}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
            loading="lazy"
          />
        ) : null}
      </div>

      {/* Body */}
      <div className="p-5">
        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {post.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="text-[11px] font-semibold text-[#0849ac] bg-[#e8f2ff] px-2.5 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h2 className="text-[15px] font-bold text-[#111827] leading-snug mb-2.5 group-hover:text-[#0849ac] transition-colors line-clamp-2">
          {post.title}
        </h2>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="text-[13px] text-[#4b5563] leading-relaxed mb-4 line-clamp-2">
            {post.excerpt}
          </p>
        )}

        {/* Meta */}
        <div className="flex items-center gap-2 text-[12px] text-[#6b7280] font-medium flex-wrap">
          <span>{formatDate(post.published_at)}</span>
          <span className="text-[#c7dffb]">·</span>
          <span>{estimateReadTime(post.excerpt)} phút đọc</span>
          {post.view_count && post.view_count > 0 && (
            <>
              <span className="text-[#c7dffb]">·</span>
              <span>{post.view_count.toLocaleString('vi-VN')} lượt xem</span>
            </>
          )}
        </div>
      </div>
    </Link>
  )
}
