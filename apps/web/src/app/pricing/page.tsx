import { Metadata } from 'next'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Pricing from '@/components/landing/Pricing'
import FAQ from '@/components/landing/FAQ'

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Choose the RemoteDevAI plan that fits your needs. All plans include a 14-day free trial.',
}

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl lg:text-6xl font-bold mb-6 text-white">
              Choose Your Plan
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Start with a 14-day free trial. No credit card required. Cancel anytime.
            </p>
          </div>
        </div>
        <div className="-mt-12">
          <Pricing />
        </div>
        <FAQ />
      </main>
      <Footer />
    </div>
  )
}
