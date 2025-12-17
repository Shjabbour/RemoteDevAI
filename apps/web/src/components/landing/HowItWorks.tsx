'use client'

import { motion } from 'framer-motion'
import { Download, Smartphone, Code } from 'lucide-react'

const steps = [
  {
    icon: Download,
    title: 'Install Desktop Agent',
    description: 'Download and install our lightweight desktop agent on your development machine. It runs in the background and handles screen streaming.',
    step: '01',
  },
  {
    icon: Smartphone,
    title: 'Connect Mobile App',
    description: 'Install our mobile app on your phone and pair it with your desktop agent. Start a voice session whenever you need.',
    step: '02',
  },
  {
    icon: Code,
    title: 'Code From Anywhere',
    description: 'Talk to your AI assistant while seeing your desktop screen. Navigate code, make edits, run commands - all hands-free.',
    step: '03',
  },
]

export default function HowItWorks() {
  return (
    <section className="py-24 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">
            Get started in
            <span className="text-gradient"> 3 simple steps</span>
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
            Set up RemoteDevAI in minutes and start coding from anywhere
          </p>
        </motion.div>

        <div className="relative">
          {/* Connection line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-secondary-500 transform -translate-y-1/2" />

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2, duration: 0.6 }}
                className="relative"
              >
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-shadow">
                  {/* Step number */}
                  <div className="absolute -top-4 left-8 w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold">{step.step}</span>
                  </div>

                  {/* Icon */}
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-100 to-secondary-100 dark:from-primary-900/30 dark:to-secondary-900/30 flex items-center justify-center mb-6 mt-4">
                    <step.icon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                  </div>

                  <h3 className="text-2xl font-bold mb-3 text-slate-900 dark:text-white">
                    {step.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
