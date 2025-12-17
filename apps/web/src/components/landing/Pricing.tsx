'use client'

import { motion } from 'framer-motion'
import { Check, Sparkles } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Link from 'next/link'

const plans = [
  {
    name: 'Free',
    price: '$0',
    description: 'Perfect for trying out RemoteDevAI',
    features: [
      '1 project',
      '30 minutes of voice time per month',
      'Basic screen sharing',
      '720p video quality',
      '7 days of recording history',
      'Community support',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$29',
    description: 'For professional developers',
    features: [
      'Unlimited projects',
      '20 hours of voice time per month',
      'HD screen sharing',
      '1080p video quality',
      '90 days of recording history',
      'Priority support',
      'Advanced AI features',
      'Custom voice commands',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Team',
    price: '$99',
    description: 'For development teams',
    features: [
      'Everything in Pro',
      'Unlimited voice time',
      'Team collaboration',
      '4K video quality',
      'Unlimited recording history',
      'Dedicated support',
      'Team analytics',
      'SSO & advanced security',
      'Custom integrations',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
]

export default function Pricing() {
  return (
    <section className="py-24 bg-white dark:bg-slate-900" id="pricing">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">
            Simple,
            <span className="text-gradient"> transparent pricing</span>
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
            Choose the plan that&apos;s right for you. All plans include a 14-day free trial.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              className="relative"
            >
              {plan.popular && (
                <div className="absolute -top-4 left-0 right-0 flex justify-center">
                  <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 text-white text-sm font-medium shadow-lg">
                    <Sparkles className="w-4 h-4" />
                    Most Popular
                  </div>
                </div>
              )}

              <Card
                hover
                className={`h-full ${plan.popular ? 'border-2 border-primary-500 shadow-xl' : ''}`}
              >
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">
                    {plan.name}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    {plan.description}
                  </p>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-5xl font-bold text-slate-900 dark:text-white">
                      {plan.price}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">/month</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="text-slate-700 dark:text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href={plan.name === 'Team' ? '/contact' : '/pricing'}>
                  <Button
                    variant={plan.popular ? 'primary' : 'outline'}
                    className="w-full"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-12 text-center"
        >
          <p className="text-slate-600 dark:text-slate-400">
            All plans include 14-day free trial. No credit card required.
            <br />
            Need a custom plan?{' '}
            <Link href="/contact" className="text-primary-600 hover:text-primary-700 font-medium">
              Contact us
            </Link>
          </p>
        </motion.div>
      </div>
    </section>
  )
}
