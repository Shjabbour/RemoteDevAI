import { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Card from '@/components/ui/Card'
import { Calendar, Clock, ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Read the latest news, tutorials, and insights from the RemoteDevAI team.',
}

const posts = [
  {
    slug: 'introducing-remotedevai',
    title: 'Introducing RemoteDevAI: Code From Anywhere',
    excerpt: 'We\'re excited to introduce RemoteDevAI, a revolutionary way to work on your development projects from anywhere using AI-powered voice and video assistance.',
    author: 'John Doe',
    date: '2024-01-15',
    readTime: '5 min read',
    category: 'Announcement',
  },
  {
    slug: 'voice-coding-future',
    title: 'Voice Coding: The Future of Remote Development',
    excerpt: 'Explore how voice-controlled coding is changing the way developers work and why it\'s the future of remote development.',
    author: 'Jane Smith',
    date: '2024-01-10',
    readTime: '8 min read',
    category: 'Tutorial',
  },
  {
    slug: 'best-practices-remote-dev',
    title: 'Best Practices for Remote Development with AI',
    excerpt: 'Learn the best practices and tips for maximizing your productivity when coding remotely with AI assistance.',
    author: 'Mike Johnson',
    date: '2024-01-05',
    readTime: '6 min read',
    category: 'Guide',
  },
]

export default function BlogPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl lg:text-6xl font-bold mb-6 text-white">
              Blog
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              News, tutorials, and insights from the RemoteDevAI team
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`}>
                <Card hover className="h-full group">
                  <div className="mb-4">
                    <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                      {post.category}
                    </span>
                  </div>

                  <h2 className="text-2xl font-bold mb-3 text-slate-900 dark:text-white group-hover:text-primary-600 transition-colors">
                    {post.title}
                  </h2>

                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    {post.excerpt}
                  </p>

                  <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(post.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {post.readTime}
                    </div>
                  </div>

                  <div className="flex items-center text-primary-600 font-medium group-hover:gap-2 transition-all">
                    Read more
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
