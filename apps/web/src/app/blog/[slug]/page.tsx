import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Link from 'next/link'
import { ArrowLeft, Calendar, Clock, User } from 'lucide-react'

const posts: Record<string, any> = {
  'introducing-remotedevai': {
    title: 'Introducing RemoteDevAI: Code From Anywhere',
    author: 'John Doe',
    date: '2024-01-15',
    readTime: '5 min read',
    content: `
We're excited to introduce RemoteDevAI, a revolutionary way to work on your development projects from anywhere using AI-powered voice and video assistance.

## The Problem

As developers, we've all been there: you're away from your desk, but you need to check something in your code, fix a bug, or help a colleague. Traditional remote desktop solutions are clunky on mobile devices, and you can't easily navigate code or make changes with just your fingers.

## Our Solution

RemoteDevAI combines three powerful technologies:

1. **Screen Streaming**: See your desktop in real-time on your mobile device
2. **Voice Control**: Navigate and control your development environment using natural language
3. **AI Assistance**: An AI that can see your screen and help you code hands-free

## How It Works

Simply install our desktop agent on your development machine, pair it with our mobile app, and start coding. Talk naturally to your AI assistant while seeing your desktop screen. The AI can:

- Navigate your codebase
- Make code changes
- Run commands
- Answer questions about your code
- Help you debug issues

## Get Started Today

We're offering a 14-day free trial with no credit card required. Try RemoteDevAI and experience the future of remote development.
    `,
  },
}

type Props = {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = posts[params.slug]

  if (!post) {
    return {
      title: 'Post Not Found',
    }
  }

  return {
    title: post.title,
    description: post.content.substring(0, 160),
  }
}

export default function BlogPostPage({ params }: Props) {
  const post = posts[params.slug]

  if (!post) {
    notFound()
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>

          <h1 className="text-4xl lg:text-5xl font-bold mb-6 text-slate-900 dark:text-white">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-slate-600 dark:text-slate-400 mb-8 pb-8 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {post.author}
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {new Date(post.date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {post.readTime}
            </div>
          </div>

          <div className="prose prose-lg dark:prose-invert max-w-none">
            {post.content.split('\n\n').map((paragraph: string, index: number) => {
              if (paragraph.startsWith('## ')) {
                return <h2 key={index}>{paragraph.replace('## ', '')}</h2>
              } else if (paragraph.match(/^\d+\./)) {
                const items = paragraph.split('\n')
                return (
                  <ol key={index}>
                    {items.map((item, i) => (
                      <li key={i}>{item.replace(/^\d+\.\s\*\*/, '').replace(/\*\*:/, ':')}</li>
                    ))}
                  </ol>
                )
              } else if (paragraph.startsWith('- ')) {
                const items = paragraph.split('\n')
                return (
                  <ul key={index}>
                    {items.map((item, i) => (
                      <li key={i}>{item.replace(/^- /, '')}</li>
                    ))}
                  </ul>
                )
              }
              return <p key={index}>{paragraph}</p>
            })}
          </div>
        </article>
      </main>
      <Footer />
    </div>
  )
}

export function generateStaticParams() {
  return Object.keys(posts).map((slug) => ({
    slug,
  }))
}
