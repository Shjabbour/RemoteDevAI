'use client';

import { useState, useEffect } from 'react';
import { X, Command, Search } from 'lucide-react';

interface Shortcut {
  category: string;
  shortcuts: Array<{
    keys: string[];
    description: string;
  }>;
}

const SHORTCUTS: Shortcut[] = [
  {
    category: 'General',
    shortcuts: [
      { keys: ['Cmd', 'K'], description: 'Open command palette' },
      { keys: ['Cmd', 'S'], description: 'Save current work' },
      { keys: ['Cmd', '/'], description: 'Toggle sidebar' },
      { keys: ['Cmd', 'Shift', 'P'], description: 'Open settings' },
      { keys: ['Esc'], description: 'Close modal/panel' },
    ],
  },
  {
    category: 'Voice & Recording',
    shortcuts: [
      { keys: ['Cmd', 'M'], description: 'Toggle microphone' },
      { keys: ['Cmd', 'R'], description: 'Start/stop recording' },
      { keys: ['Space'], description: 'Push to talk (hold)' },
    ],
  },
  {
    category: 'Navigation',
    shortcuts: [
      { keys: ['Cmd', '1'], description: 'Go to Dashboard' },
      { keys: ['Cmd', '2'], description: 'Go to Projects' },
      { keys: ['Cmd', '3'], description: 'Go to Recordings' },
      { keys: ['Cmd', '4'], description: 'Go to Settings' },
    ],
  },
  {
    category: 'Sessions',
    shortcuts: [
      { keys: ['Cmd', 'N'], description: 'New session' },
      { keys: ['Cmd', 'E'], description: 'End session' },
      { keys: ['Cmd', 'Enter'], description: 'Send message' },
      { keys: ['Cmd', 'L'], description: 'Clear conversation' },
    ],
  },
  {
    category: 'Editor',
    shortcuts: [
      { keys: ['Cmd', 'F'], description: 'Find in code' },
      { keys: ['Cmd', 'D'], description: 'Duplicate line' },
      { keys: ['Cmd', 'Z'], description: 'Undo' },
      { keys: ['Cmd', 'Shift', 'Z'], description: 'Redo' },
    ],
  },
];

export default function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    // Detect OS
    setIsMac(navigator.platform.toLowerCase().includes('mac'));

    // Listen for Cmd+K or Ctrl+K
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    // Listen for custom event from Help component
    const handleOpenShortcuts = () => {
      setIsOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-shortcuts', handleOpenShortcuts);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-shortcuts', handleOpenShortcuts);
    };
  }, []);

  const formatKey = (key: string) => {
    if (!isMac && key === 'Cmd') return 'Ctrl';
    return key;
  };

  const filteredShortcuts = searchQuery
    ? SHORTCUTS.map((category) => ({
        ...category,
        shortcuts: category.shortcuts.filter((shortcut) =>
          shortcut.description.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter((category) => category.shortcuts.length > 0)
    : SHORTCUTS;

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl max-h-[80vh] bg-white rounded-2xl shadow-2xl z-50 overflow-hidden">
        <div className="flex flex-col h-full max-h-[80vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Command className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Keyboard Shortcuts
              </h2>
            </div>
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
                placeholder="Search shortcuts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
          </div>

          {/* Shortcuts List */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {filteredShortcuts.map((category) => (
                <div key={category.category}>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                    {category.category}
                  </h3>
                  <div className="space-y-2">
                    {category.shortcuts.map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <span className="text-gray-900">
                          {shortcut.description}
                        </span>
                        <div className="flex items-center space-x-1">
                          {shortcut.keys.map((key, keyIndex) => (
                            <span key={keyIndex} className="flex items-center">
                              <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono text-gray-700 shadow-sm">
                                {formatKey(key)}
                              </kbd>
                              {keyIndex < shortcut.keys.length - 1 && (
                                <span className="mx-1 text-gray-400">+</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {filteredShortcuts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No shortcuts found</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                Press{' '}
                <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">
                  {isMac ? 'Cmd' : 'Ctrl'}
                </kbd>{' '}
                +{' '}
                <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">
                  K
                </kbd>{' '}
                to open this panel anytime
              </span>
              <a
                href="/docs/shortcuts"
                target="_blank"
                className="text-blue-600 hover:underline"
              >
                View full documentation
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
