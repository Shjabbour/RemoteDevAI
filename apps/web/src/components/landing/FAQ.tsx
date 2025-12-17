'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

const faqs = [
  {
    question: 'How does RemoteDevAI work?',
    answer: 'RemoteDevAI consists of two parts: a desktop agent that runs on your development machine and streams your screen, and a mobile app that lets you view your screen and talk to an AI assistant. The AI can see your screen and help you navigate code, make edits, and run commands using voice.',
  },
  {
    question: 'Is my code secure?',
    answer: 'Yes! All communication between your desktop agent and mobile app is end-to-end encrypted. Your code never leaves your machine unless you explicitly make changes through voice commands. We use industry-standard encryption and security practices.',
  },
  {
    question: 'What programming languages are supported?',
    answer: 'RemoteDevAI works with any programming language since it streams your entire screen and IDE. The AI assistant is trained on popular languages including JavaScript, TypeScript, Python, Java, Go, Rust, and more.',
  },
  {
    question: 'Can I use this with my existing IDE?',
    answer: 'Absolutely! RemoteDevAI works with any IDE or editor - VS Code, IntelliJ, Vim, Emacs, Sublime Text, or any other tool you use. It streams your entire screen, so you can use whatever development environment you prefer.',
  },
  {
    question: 'How much bandwidth does screen streaming use?',
    answer: 'Screen streaming is optimized for low bandwidth usage. On average, it uses about 1-2 Mbps for 1080p quality. You can also adjust the quality settings to use less bandwidth if needed.',
  },
  {
    question: 'Can multiple team members share a session?',
    answer: 'Yes! Team plan subscribers can invite team members to join sessions. This is great for pair programming, code reviews, or getting help from colleagues.',
  },
  {
    question: 'What happens to my recordings?',
    answer: 'All voice conversations and screen recordings are automatically saved to the cloud (based on your plan\'s retention period). You can review them later, share them with team members, or download them for your records.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period, and you won\'t be charged again. All your data remains available for download for 30 days after cancellation.',
  },
]

function FAQItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className="border-b border-slate-200 dark:border-slate-700 last:border-0"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 flex items-start justify-between gap-4 text-left hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
      >
        <span className="font-semibold text-lg text-slate-900 dark:text-white">
          {question}
        </span>
        <ChevronDown
          className={`w-6 h-6 flex-shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-slate-600 dark:text-slate-400">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function FAQ() {
  return (
    <section className="py-24 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900/20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">
            Frequently asked
            <span className="text-gradient"> questions</span>
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400">
            Everything you need to know about RemoteDevAI
          </p>
        </motion.div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
