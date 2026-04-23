import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import DOMPurify from 'dompurify'
import { Navbar } from '../../../components/landing/Navbar'
import { Footer } from '../../../components/landing/Footer'
import { blogSupabase as supabase } from '../../../lib/landing/blogSupabase'
import { ReadingProgress } from './components/ReadingProgress'
import { RelatedPosts } from './components/RelatedPosts'
import { BlogCTA } from './components/BlogCTA'
import { setPostMeta, resetToSiteMeta } from './lib/blogMeta'
import type { Post, PostSummary } from './lib/blogTypes'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function readTime(content: string | null) {
  if (!content) return 3
  const words = content.replace(/<[^>]+>/g, '').split(/\s+/).length
  return Math.max(1, Math.ceil(words / 200))
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="max-w-[740px] mx-auto px-4 sm:px-6 py-10 animate-pulse">
        {/* Breadcrumb */}
        <div className="h-3.5 bg-[#e8f2ff] rounded-full w-1/3 mb-9" />
        {/* Meta */}
        <div className="h-3.5 bg-[#e8f2ff] rounded-full w-1/4 mb-5" />
        {/* Title */}
        <div className="h-8 bg-[#e8f2ff] rounded-xl w-full mb-3" />
        <div className="h-8 bg-[#e8f2ff] rounded-xl w-3/4 mb-8" />
        {/* Cover */}
        <div className="aspect-video bg-[#e8f2ff] rounded-2xl mb-10" />
        {/* Body */}
        {[100, 95, 88, 92, 70, 85, 96, 60].map((w, i) => (
          <div
            key={i}
            className="h-4 bg-[#e8f2ff] rounded-full mb-3"
            style={{ width: `${w}%` }}
          />
        ))}
      </div>
    </div>
  )
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const [post, setPost] = useState<Post | null>(null)
  const [related, setRelated] = useState<PostSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  // Fetch post
  useEffect(() => {
    if (!slug) {
      navigate('/blog', { replace: true })
      return
    }

    setLoading(true)
    setPost(null)
    setRelated([])

    supabase
      .from('posts')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          navigate('/blog', { replace: true })
          return
        }
        setPost(data as Post)
        setLoading(false)

        // Fire-and-forget: increment view count
        supabase.rpc('increment_view', { post_id: data.id }).then(() => {})

        // Load related posts
        loadRelated(data.id, data.tags)
      })
  }, [slug])

  // Set page meta when post loads; restore on unmount
  useEffect(() => {
    if (!post) return
    setPostMeta(post)
    return () => resetToSiteMeta()
  }, [post])

  // Lazy load images inside article body
  useEffect(() => {
    if (!contentRef.current) return
    contentRef.current.querySelectorAll('img').forEach(img => {
      if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy')
    })
  }, [post])

  async function loadRelated(postId: string, tags: string[] | null) {
    // Prefer posts sharing the same tags; fallback to recent
    if (tags && tags.length > 0) {
      const { data: tagged } = await supabase
        .from('posts')
        .select('id, slug, title, excerpt, cover_url, published_at, tags, view_count')
        .eq('published', true)
        .neq('id', postId)
        .overlaps('tags', tags)
        .order('published_at', { ascending: false })
        .limit(3)
      if (tagged && tagged.length >= 1) {
        setRelated(tagged as PostSummary[])
        return
      }
    }

    const { data } = await supabase
      .from('posts')
      .select('id, slug, title, excerpt, cover_url, published_at, tags, view_count')
      .eq('published', true)
      .neq('id', postId)
      .order('published_at', { ascending: false })
      .limit(3)
    if (data) setRelated(data as PostSummary[])
  }

  async function handleCopy() {
    const url = `https://wealbee.com/blog/${slug}/`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Fallback for older browsers
      const inp = document.createElement('input')
      inp.value = url
      document.body.appendChild(inp)
      inp.select()
      document.execCommand('copy')
      document.body.removeChild(inp)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <LoadingSkeleton />
  if (!post) return null

  const minutes = readTime(post.content)
  const date = formatDate(post.published_at)
  const shareUrl = `https://wealbee.com/blog/${slug}/`

  return (
    <div className="min-h-screen bg-white">
      <ReadingProgress />
      <Navbar />

      <main className="max-w-[740px] mx-auto px-4 sm:px-6 py-10 sm:py-12 pb-24">

        {/* Breadcrumb */}
        <nav aria-label="Điều hướng phụ" className="text-[13px] text-[#6b7280] mb-9">
          <ol className="flex items-center gap-1.5 flex-wrap font-medium">
            <li>
              <Link to="/" className="hover:text-[#0849ac] transition-colors">Wealbee</Link>
            </li>
            <li aria-hidden="true">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </li>
            <li>
              <Link to="/blog" className="hover:text-[#0849ac] transition-colors">Blog</Link>
            </li>
            <li aria-hidden="true">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </li>
            <li aria-current="page" className="text-[#4b5563] truncate max-w-[180px] sm:max-w-xs">
              {post.title}
            </li>
          </ol>
        </nav>

        {/* Article */}
        <article itemScope itemType="https://schema.org/Article">

          {/* Header */}
          <header className="mb-7">
            <div className="flex items-center gap-2 text-[13px] text-[#6b7280] mb-4 flex-wrap font-medium">
              <time dateTime={post.published_at} itemProp="datePublished">{date}</time>
              <span className="text-[#c7dffb]">·</span>
              <span>{minutes} phút đọc</span>
              {post.view_count && post.view_count > 0 && (
                <>
                  <span className="text-[#c7dffb]">·</span>
                  <span>{post.view_count.toLocaleString('vi-VN')} lượt xem</span>
                </>
              )}
            </div>

            <h1
              className="text-[clamp(22px,4.5vw,36px)] font-extrabold text-[#111827] leading-tight tracking-tight mb-4"
              itemProp="headline"
            >
              {post.title}
            </h1>

            {post.excerpt && (
              <p
                className="text-[17px] text-[#4b5563] leading-relaxed"
                itemProp="description"
              >
                {post.excerpt}
              </p>
            )}

            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4" aria-label="Chủ đề">
                {post.tags.map(tag => (
                  <Link
                    key={tag}
                    to={`/blog?tag=${encodeURIComponent(tag)}`}
                    className="text-[12px] font-semibold text-[#0849ac] bg-[#e8f2ff] hover:bg-[#d1e5fb] px-3 py-1 rounded-full transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}
          </header>

          {/* Cover image */}
          {post.cover_url ? (
            <img
              src={post.cover_url}
              alt={post.title}
              className="w-full aspect-video object-cover rounded-2xl mb-10"
              itemProp="image"
            />
          ) : (
            <div
              className="w-full aspect-video rounded-2xl mb-10 bg-gradient-to-br from-[#1d4ed8] via-[#0849ac] to-[#2563eb]"
              aria-hidden="true"
            />
          )}

          {/* Article body */}
          <div
            ref={contentRef}
            className="blog-prose"
            itemProp="articleBody"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(post.content || ''),
            }}
          />

          {/* Share */}
          <div className="mt-11 pt-6 border-t border-[#e8f2ff]">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#6b7280] mb-3">
              Chia sẻ bài viết
            </p>
            <div className="flex gap-2 flex-wrap">
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  onClick={() =>
                    (navigator as Navigator & { share: (d: object) => Promise<void> })
                      .share({ title: post.title, url: shareUrl })
                      .catch(() => {})
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#e8f2ff] text-[13px] font-semibold text-[#4b5563] hover:bg-[#f0f6ff] transition-all cursor-pointer"
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                  Chia sẻ
                </button>
              )}
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#e8f2ff] text-[13px] font-semibold text-[#4b5563] hover:bg-[#f0f6ff] transition-all cursor-pointer"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                {copied ? '✓ Đã sao chép!' : 'Sao chép link'}
              </button>
            </div>
          </div>

          {/* Article footer */}
          <footer className="mt-12 pt-6 border-t border-[#e8f2ff] flex items-center justify-between gap-4 flex-wrap">
            <Link
              to="/blog"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#e8f2ff] text-[13px] font-semibold text-[#4b5563] hover:bg-[#f0f6ff] transition-all"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="m15 18-6-6 6-6" />
              </svg>
              Tất cả bài viết
            </Link>
            {post.view_count && post.view_count > 0 && (
              <div className="flex items-center gap-1.5 text-[13px] text-[#6b7280] font-medium">
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {post.view_count.toLocaleString('vi-VN')} lượt xem
              </div>
            )}
          </footer>
        </article>

        {/* CTA block */}
        <BlogCTA />

        {/* Related posts */}
        <RelatedPosts posts={related} />
      </main>

      <Footer />
    </div>
  )
}
