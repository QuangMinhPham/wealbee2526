export interface Post {
  id: string
  slug: string
  title: string
  excerpt: string | null
  content: string | null
  cover_url: string | null
  published_at: string
  updated_at: string | null
  tags: string[] | null
  view_count: number | null
  published: boolean
}

export type PostSummary = Pick<
  Post,
  'id' | 'slug' | 'title' | 'excerpt' | 'cover_url' | 'published_at' | 'tags' | 'view_count'
>
