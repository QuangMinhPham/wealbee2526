import { Link } from 'react-router'
import type { PostSummary } from '../lib/blogTypes'

export function RelatedPosts({ posts }: { posts: PostSummary[] }) {
  if (posts.length === 0) return null

  return (
    <section className="mt-14 pt-8 border-t border-[#e8f2ff]" aria-label="Bài viết liên quan">
      <h2 className="text-[17px] font-bold text-[#111827] mb-5">Bài viết liên quan</h2>
      <div className="flex flex-col border border-[#e8f2ff] rounded-xl overflow-hidden divide-y divide-[#e8f2ff]">
        {posts.map(p => (
          <Link
            key={p.id}
            to={`/blog/${p.slug}`}
            className="group flex items-center gap-4 px-4 py-4 bg-white hover:bg-[#f8faff] transition-colors"
          >
            {p.cover_url ? (
              <img
                src={p.cover_url}
                alt={p.title}
                width={56}
                height={56}
                loading="lazy"
                className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-lg flex-shrink-0 bg-gradient-to-br from-[#1d4ed8] to-[#0849ac]" />
            )}
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-[#111827] group-hover:text-[#0849ac] transition-colors leading-snug line-clamp-2">
                {p.title}
              </p>
              <p className="text-[12px] text-[#6b7280] mt-1 font-medium">
                {new Date(p.published_at).toLocaleDateString('vi-VN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
