'use client'

import { motion } from 'framer-motion'
import { Mic, Video, Folder, Cloud, Smartphone, Zap, Lock, Globe } from 'lucide-react'
import Card from '@/components/ui/Card'

const features = [
  {
    icon: Mic,
    title: 'Voice Control',
    description: 'Navigate your codebase, make edits, and run commands using natural language voice commands.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Video,
    title: 'Live Screen Sharing',
    description: 'See your desktop in real-time on mobile. Your AI assistant can see what you see.',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: Folder,
    title: 'Multi-Project Support',
    description: 'Work on multiple projects simultaneously. Switch between them seamlessly with voice commands.',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    icon: Cloud,
    title: 'Cloud Sync',
    description: 'All your conversations and recordings are automatically synced and backed up to the cloud.',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    icon: Smartphone,
    title: 'Mobile App',
    description: 'Control your development environment from anywhere using our iOS and Android apps.',
    gradient: 'from-indigo-500 to-blue-500',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Low-latency streaming and real-time AI responses for a seamless development experience.',
    gradient: 'from-yellow-500 to-orange-500',
  },
  {
    icon: Lock,
    title: 'Secure & Private',
    description: 'End-to-end encryption ensures your code and conversations remain completely private.',
    gradient: 'from-red-500 to-pink-500',
  },
  {
    icon: Globe,
    title: 'Works Everywhere',
    description: 'Access your development environment from anywhere in the world with internet connection.',
    gradient: 'from-teal-500 to-green-500',
  },
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function Features() {
  return (
    <section className="py-24 bg-white dark:bg-slate-900" id="features">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">
            Everything you need to
            <span className="text-gradient"> code remotely</span>
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
            Powerful features designed for developers who want to work from anywhere
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={item}>
              <Card hover className="h-full">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  {feature.description}
                </p>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
