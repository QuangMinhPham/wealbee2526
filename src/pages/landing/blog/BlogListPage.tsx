import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router'
import { Navbar } from '../../../components/landing/Navbar'
import { Footer } from '../../../components/landing/Footer'

import { blogSupabase as supabase } from '../../../lib/landing/blogSupabase'
import { PostCard } from './components/PostCard'
import { setBlogListMeta, resetToSiteMeta } from './lib/blogMeta'
import type { PostSummary } from './lib/blogTypes'

const MAX_VISIBLE_TAGS = 8
const POSTS_PER_PAGE = 12

function SkeletonCard() {
  return (
    <div className="bg-white border border-[#e8f2ff] rounded-2xl overflow-hidden animate-pulse">
      <div className="aspect-video bg-[#e8f2ff]" />
      <div className="p-5 space-y-3">
        <div className="h-3 bg-[#e8f2ff] rounded-full w-1/3" />
        <div className="h-4 bg-[#e8f2ff] rounded-full w-full" />
        <div className="h-4 bg-[#e8f2ff] rounded-full w-3/4" />
        <div className="h-3 bg-[#e8f2ff] rounded-full w-1/2" />
      </div>
    </div>
  )
}

function Pagination({
  currentPage,
  totalPages,
  onChange,
}: {
  currentPage: number
  totalPages: number
  onChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  const pages: (number | '...')[] = []
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2) {
      if (pages.length > 0 && typeof pages[pages.length - 1] === 'number') {
        const last = pages[pages.length - 1] as number
        if (p - last > 1) pages.push('...')
      }
      pages.push(p)
    }
  }

  return (
    <div className="flex justify-center items-center gap-2 mt-12 flex-wrap">
      <button
        onClick={() => onChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-4 py-2 rounded-xl border border-[#e8f2ff] text-[13px] font-semibold text-[#4b5563] hover:bg-[#f0f6ff] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        ← Trước
      </button>

      {pages.map((item, i) =>
        item === '...' ? (
          <span key={`ellipsis-${i}`} className="w-9 text-center text-[#6b7280] text-[13px]">
            …
          </span>
        ) : (
          <button
            key={item}
            onClick={() => onChange(item as number)}
            className={`w-9 h-9 rounded-xl text-[13px] font-semibold transition-all ${
              currentPage === item
                ? 'bg-[#0849ac] text-white shadow-sm'
                : 'border border-[#e8f2ff] text-[#4b5563] hover:bg-[#f0f6ff]'
            }`}
          >
            {item}
          </button>
        )
      )}

      <button
        onClick={() => onChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-4 py-2 rounded-xl border border-[#e8f2ff] text-[13px] font-semibold text-[#4b5563] hover:bg-[#f0f6ff] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        Tiếp →
      </button>
    </div>
  )
}

export default function BlogListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const activeTag = searchParams.get('tag') || ''

  const [posts, setPosts] = useState<PostSummary[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [allTags, setAllTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showMoreTags, setShowMoreTags] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const totalPages = Math.ceil(totalCount / POSTS_PER_PAGE)
  const visibleTags = allTags.slice(0, MAX_VISIBLE_TAGS)
  const hiddenTags = allTags.slice(MAX_VISIBLE_TAGS)
  const activeTagIsHidden = activeTag && hiddenTags.includes(activeTag)

  // Meta tags
  useEffect(() => {
    setBlogListMeta()
    return () => resetToSiteMeta()
  }, [])

  // Fetch all tags, sorted by frequency (most used first)
  useEffect(() => {
    supabase
      .from('posts')
      .select('tags')
      .eq('published', true)
      .then(({ data }) => {
        if (!data) return
        const freq: Record<string, number> = {}
        data.forEach(row =>
          row.tags?.forEach((t: string) => {
            freq[t] = (freq[t] || 0) + 1
          })
        )
        const sorted = Object.keys(freq).sort((a, b) => freq[b] - freq[a])
        setAllTags(sorted)
      })
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowMoreTags(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch posts with pagination
  useEffect(() => {
    setLoading(true)
    setError('')
    const from = (currentPage - 1) * POSTS_PER_PAGE
    const to = from + POSTS_PER_PAGE - 1

    let query = supabase
      .from('posts')
      .select('id, slug, title, excerpt, cover_url, published_at, tags, view_count', {
        count: 'exact',
      })
      .eq('published', true)
      .order('published_at', { ascending: false })
      .range(from, to)

    if (activeTag) {
      query = query.contains('tags', [activeTag])
    }

    query.then(({ data, count, error: err }) => {
      if (err) {
        setError('Không thể tải bài viết. Vui lòng thử lại.')
        setLoading(false)
        return
      }
      setPosts(data || [])
      setTotalCount(count || 0)
      setLoading(false)
    })
  }, [currentPage, activeTag])

  function handleTagClick(tag: string) {
    setShowMoreTags(false)
    setSearchParams(tag ? { tag } : {})
  }

  function handlePageChange(page: number) {
    const params: Record<string, string> = { page: String(page) }
    if (activeTag) params.tag = activeTag
    setSearchParams(params)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const tagPillClass = (tag: string) =>
    `text-[12px] font-semibold px-3.5 py-1.5 rounded-full transition-all ${
      activeTag === tag
        ? 'bg-[#0849ac] text-white shadow-sm'
        : 'bg-[#e8f2ff] text-[#0849ac] hover:bg-[#d1e5fb]'
    }`

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Page header */}
      <header className="bg-gradient-to-b from-[#f0f6ff] to-white border-b border-[#e8f2ff] py-12 sm:py-16">
        <div className="max-w-[740px] mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-[#e8f2ff] border border-[rgba(132,166,252,0.2)] rounded-full px-4 py-2 mb-6">
            <div className="w-2 h-2 bg-[#0849ac] rounded-full" />
            <span className="text-[12px] text-[#032d6b] font-medium">Wealbee Blog</span>
          </div>
          <h1 className="text-[28px] sm:text-[36px] font-extrabold text-[#111827] leading-tight tracking-tight mb-4">
            Phân tích đầu tư chứng khoán
          </h1>
          <p className="text-[15px] sm:text-[16px] text-[#4b5563] leading-relaxed max-w-[480px] mx-auto">
            Tin tức, phân tích và chiến lược tài chính được nghiên cứu kỹ lưỡng từ đội ngũ Wealbee.
          </p>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-4 sm:px-6 py-10 sm:py-14">

        {/* Tag filter */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-8">
            {/* All */}
            <button
              onClick={() => handleTagClick('')}
              className={`text-[12px] font-semibold px-3.5 py-1.5 rounded-full transition-all ${
                !activeTag
                  ? 'bg-[#0849ac] text-white shadow-sm'
                  : 'bg-[#e8f2ff] text-[#0849ac] hover:bg-[#d1e5fb]'
              }`}
            >
              Tất cả
            </button>

            {/* Top tags */}
            {visibleTags.map(tag => (
              <button key={tag} onClick={() => handleTagClick(tag)} className={tagPillClass(tag)}>
                {tag}
              </button>
            ))}

            {/* "More" dropdown — only shown when there are hidden tags */}
            {hiddenTags.length > 0 && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowMoreTags(prev => !prev)}
                  className={`text-[12px] font-semibold px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1 ${
                    activeTagIsHidden
                      ? 'bg-[#0849ac] text-white shadow-sm'
                      : 'bg-[#e8f2ff] text-[#0849ac] hover:bg-[#d1e5fb]'
                  }`}
                >
                  {activeTagIsHidden ? activeTag : `+${hiddenTags.length} chủ đề`}
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className={`transition-transform ${showMoreTags ? 'rotate-180' : ''}`}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {showMoreTags && (
                  <div className="absolute left-0 top-full mt-2 z-20 bg-white border border-[#e8f2ff] rounded-2xl shadow-lg py-2 min-w-[160px]">
                    {hiddenTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => handleTagClick(tag)}
                        className={`w-full text-left text-[13px] font-medium px-4 py-2 transition-colors ${
                          activeTag === tag
                            ? 'text-[#0849ac] bg-[#f0f6ff] font-semibold'
                            : 'text-[#4b5563] hover:bg-[#f0f6ff] hover:text-[#0849ac]'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Active tag banner */}
        {activeTag && (
          <div className="flex items-center gap-3 mb-6 px-4 py-3 bg-[#f0f6ff] rounded-xl border border-[#e8f2ff]">
            <span className="text-[13px] text-[#4b5563]">
              Đang xem:{' '}
              <strong className="text-[#0849ac] font-semibold">{activeTag}</strong>
            </span>
            <button
              onClick={() => handleTagClick('')}
              className="ml-auto text-[12px] text-[#6b7280] hover:text-[#111827] transition-colors"
            >
              ✕ Xoá bộ lọc
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-20">
            <p className="text-[15px] text-[#4b5563] mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-[13px] text-[#0849ac] hover:underline"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Post grid */}
        {!error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {loading
              ? Array.from({ length: POSTS_PER_PAGE }).map((_, i) => <SkeletonCard key={i} />)
              : posts.map(post => <PostCard key={post.id} post={post} />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && posts.length === 0 && (
          <div className="text-center py-20">
            <p className="text-[32px] mb-4">📭</p>
            <p className="text-[15px] text-[#4b5563]">
              {activeTag
                ? `Chưa có bài viết về "${activeTag}".`
                : 'Chưa có bài viết nào.'}
            </p>
          </div>
        )}

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onChange={handlePageChange}
        />

        {/* Count info */}
        {!loading && totalCount > 0 && (
          <p className="text-center text-[12px] text-[#6b7280] mt-4">
            Hiển thị{' '}
            {(currentPage - 1) * POSTS_PER_PAGE + 1}–
            {Math.min(currentPage * POSTS_PER_PAGE, totalCount)} trong {totalCount} bài viết
          </p>
        )}
      </main>

      <Footer />
    </div>
  )
}
