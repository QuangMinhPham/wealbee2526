/**
 * blogMeta.ts
 * Imperatively updates document.head meta tags for blog pages.
 * Used inside useEffect — works for Googlebot (which renders JS).
 * Social bots (Facebook/Zalo) need SSR to see these tags.
 */

const SITE_URL = 'https://wealbee.com'

// ── Helpers ───────────────────────────────────────────────────

function setMeta(attrName: string, attrValue: string, content: string) {
  let el = document.querySelector(
    `meta[${attrName}="${attrValue}"]`
  ) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attrName, attrValue)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(url: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', url)
}

function setJsonLd(id: string, data: object) {
  let el = document.getElementById(id) as HTMLScriptElement | null
  if (!el) {
    el = document.createElement('script')
    el.id = id
    el.type = 'application/ld+json'
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(data)
}

function removeJsonLd(id: string) {
  document.getElementById(id)?.remove()
}

// ── Blog listing page ─────────────────────────────────────────

export function setBlogListMeta() {
  const url = `${SITE_URL}/blog/`
  const title = 'Blog đầu tư | Wealbee'
  const description =
    'Phân tích chứng khoán, tin tức đầu tư, hướng dẫn quản lý danh mục và chiến lược tài chính cá nhân từ đội ngũ Wealbee.'

  document.title = title
  setMeta('name', 'description', description)
  setMeta('property', 'og:type', 'website')
  setMeta('property', 'og:title', title)
  setMeta('property', 'og:description', description)
  setMeta('property', 'og:url', url)
  setMeta('property', 'og:locale', 'vi_VN')
  setMeta('property', 'og:site_name', 'Wealbee')
  setMeta('name', 'twitter:title', title)
  setMeta('name', 'twitter:description', description)
  setCanonical(url)

  setJsonLd('blog-website-schema', {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Wealbee Blog',
    description,
    url,
    publisher: { '@type': 'Organization', name: 'Wealbee', url: SITE_URL },
  })
}

// ── Single post page ──────────────────────────────────────────

export interface PostMetaOptions {
  slug: string
  title: string
  excerpt: string | null
  cover_url: string | null
  published_at: string
  updated_at: string | null
  tags: string[] | null
}

export function setPostMeta(post: PostMetaOptions) {
  const url = `${SITE_URL}/blog/${post.slug}/`
  const pageTitle = `${post.title} | Wealbee Blog`
  const description = post.excerpt || post.title

  document.title = pageTitle
  setMeta('name', 'description', description)
  setMeta('property', 'og:type', 'article')
  setMeta('property', 'og:title', post.title)
  setMeta('property', 'og:description', description)
  setMeta('property', 'og:url', url)
  setMeta('property', 'og:locale', 'vi_VN')
  setMeta('property', 'og:site_name', 'Wealbee')
  setMeta('property', 'article:published_time', post.published_at)
  if (post.updated_at) setMeta('property', 'article:modified_time', post.updated_at)
  if (post.cover_url) {
    setMeta('property', 'og:image', post.cover_url)
    setMeta('name', 'twitter:image', post.cover_url)
  }
  setMeta('name', 'twitter:title', post.title)
  setMeta('name', 'twitter:description', description)
  setCanonical(url)

  // article:tag — one per tag
  document.querySelectorAll('meta[property="article:tag"]').forEach(el => el.remove())
  if (post.tags) {
    post.tags.forEach(tag => {
      const el = document.createElement('meta')
      el.setAttribute('property', 'article:tag')
      el.setAttribute('content', tag)
      document.head.appendChild(el)
    })
  }

  // Article JSON-LD
  setJsonLd('blog-post-schema', {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description,
    datePublished: post.published_at,
    dateModified: post.updated_at || post.published_at,
    url,
    ...(post.cover_url && {
      image: { '@type': 'ImageObject', url: post.cover_url, width: 1200, height: 630 },
    }),
    ...(post.tags && post.tags.length > 0 && { keywords: post.tags.join(', ') }),
    author: { '@type': 'Organization', name: 'Wealbee', url: SITE_URL },
    publisher: { '@type': 'Organization', name: 'Wealbee', url: SITE_URL },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  })

  // BreadcrumbList JSON-LD
  setJsonLd('blog-breadcrumb-schema', {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Wealbee', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog/` },
      { '@type': 'ListItem', position: 3, name: post.title, item: url },
    ],
  })
}

// ── Cleanup — called on page unmount ─────────────────────────

export function resetToSiteMeta() {
  document.title = 'Wealbee – Tin tức cá nhân hoá cho danh mục đầu tư của bạn'
  document.querySelectorAll('meta[property="article:tag"]').forEach(el => el.remove())
  removeJsonLd('blog-post-schema')
  removeJsonLd('blog-breadcrumb-schema')
  removeJsonLd('blog-website-schema')
  setCanonical('https://wealbee.com/')
  setMeta('property', 'og:type', 'website')
}
