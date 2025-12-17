import { Metadata } from 'next'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Features from '@/components/landing/Features'
import CTA from '@/components/landing/CTA'

export const metadata: Metadata = {
  title: 'Features',
  description: 'Explore all the powerful features that make RemoteDevAI the best way to code remotely.',
}

export default function FeaturesPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl lg:text-6xl font-bold mb-6 text-white">
              Powerful Features for
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                Remote Development
              </span>
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Everything you need to work on your projects from anywhere with AI assistance.
            </p>
          </div>
        </div>
        <Features />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
