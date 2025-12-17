'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  HelpCircle,
  X,
  Search,
  Book,
  MessageCircle,
  ExternalLink,
  Keyboard,
} from 'lucide-react';

const HELP_CONTENT: Record<string, Array<{ question: string; answer: string }>> = {
  '/dashboard': [
    {
      question: 'How do I create a new project?',
      answer:
        'Click the "New Project" button in the top right, give your project a name, and select a project type.',
    },
    {
      question: 'How do I start a coding session?',
      answer:
        'Select a project and click "Start Session". You can then use voice commands or text to interact with AI.',
    },
  ],
  '/dashboard/projects': [
    {
      question: 'How do I delete a project?',
      answer:
        'Click the three dots menu on a project card and select "Delete". This action cannot be undone.',
    },
    {
      question: 'Can I import from GitHub?',
      answer:
        'Yes! Click "Import from GitHub" and authorize the connection to sync your repositories.',
    },
  ],
  '/dashboard/recordings': [
    {
      question: 'How long are recordings stored?',
      answer:
        'Recordings are stored based on your subscription plan: Free (7 days), Pro (90 days), Enterprise (unlimited).',
    },
    {
      question: 'Can I download my recordings?',
      answer:
        'Yes, click the download icon on any recording to save it locally as an MP4 file.',
    },
  ],
  default: [
    {
      question: 'How do I use voice commands?',
      answer:
        'Click the microphone button or press Cmd+M (Mac) / Ctrl+M (Windows), speak your command, and release.',
    },
    {
      question: 'How do I connect the desktop agent?',
      answer:
        'Download and install the desktop agent, then scan the QR code from Settings > Desktop Agent.',
    },
  ],
};

const QUICK_LINKS = [
  { icon: Book, label: 'Documentation', href: '/docs' },
  { icon: Keyboard, label: 'Keyboard Shortcuts', action: 'shortcuts' },
  { icon: MessageCircle, label: 'Contact Support', href: '/support' },
];

export default function Help() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();

  const contextualHelp = HELP_CONTENT[pathname || ''] || HELP_CONTENT.default;

  const filteredHelp = searchQuery
    ? contextualHelp.filter(
        (item) =>
          item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : contextualHelp;

  return (
    <>
      {/* Help Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 z-40 flex items-center justify-center"
        aria-label="Open help"
      >
        <HelpCircle className="w-6 h-6" />
      </button>

      {/* Help Panel */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">Help Center</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Search */}
              <div className="p-6 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search for help..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Contextual Help */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                    Common Questions
                  </h3>
                  <div className="space-y-3">
                    {filteredHelp.map((item, index) => (
                      <details
                        key={index}
                        className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <summary className="font-medium text-gray-900">
                          {item.question}
                        </summary>
                        <p className="mt-2 text-sm text-gray-600">{item.answer}</p>
                      </details>
                    ))}
                  </div>
                </div>

                {/* Quick Links */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                    Quick Links
                  </h3>
                  <div className="space-y-2">
                    {QUICK_LINKS.map((link) => (
                      <a
                        key={link.label}
                        href={link.href || '#'}
                        onClick={(e) => {
                          if (link.action === 'shortcuts') {
                            e.preventDefault();
                            // Open keyboard shortcuts modal
                            window.dispatchEvent(new CustomEvent('open-shortcuts'));
                          }
                        }}
                        className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
                      >
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <link.icon className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="flex-1 font-medium text-gray-900">
                          {link.label}
                        </span>
                        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-600 text-center">
                  Can't find what you're looking for?
                </p>
                <a
                  href="/support"
                  className="mt-2 block w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-center font-medium hover:bg-blue-700 transition-colors"
                >
                  Contact Support
                </a>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
