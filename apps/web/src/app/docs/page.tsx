import { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { BookOpen, Laptop, Smartphone, Code, ArrowRight } from 'lucide-react'
import Card from '@/components/ui/Card'

export const metadata: Metadata = {
  title: 'Documentation',
  description: 'Learn how to use RemoteDevAI to code from anywhere with AI assistance.',
}

const docs = [
  {
    icon: BookOpen,
    title: 'Getting Started',
    description: 'Learn the basics and get up and running in minutes.',
    href: '/docs/getting-started',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Laptop,
    title: 'Desktop Agent',
    description: 'Install and configure the desktop agent on your development machine.',
    href: '/docs/desktop-agent',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: Smartphone,
    title: 'Mobile App',
    description: 'Download and set up the mobile app to control your development environment.',
    href: '/docs/mobile-app',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Code,
    title: 'API Reference',
    description: 'Integrate RemoteDevAI into your workflow with our API.',
    href: '/docs/api',
    color: 'from-orange-500 to-red-500',
  },
]

export default function DocsPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl lg:text-6xl font-bold mb-6 text-white">
              Documentation
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Everything you need to know to get started with RemoteDevAI
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid md:grid-cols-2 gap-6">
            {docs.map((doc, index) => (
              <Link key={index} href={doc.href}>
                <Card hover className="h-full group">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${doc.color} flex items-center justify-center mb-4`}>
                    <doc.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white group-hover:text-primary-600 transition-colors">
                    {doc.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    {doc.description}
                  </p>
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
