'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Download, Upload, Search, Edit, Save, X } from 'lucide-react';
import { locales, localeNames, type Locale } from '@/i18n/config';

interface TranslationEntry {
  key: string;
  values: Record<Locale, string>;
}

export default function TranslationsAdminPage() {
  const t = useTranslations();
  const [selectedLocale, setSelectedLocale] = useState<Locale>('en');
  const [translations, setTranslations] = useState<TranslationEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<Record<Locale, string>>({} as Record<Locale, string>);
  const [showMissingOnly, setShowMissingOnly] = useState(false);

  useEffect(() => {
    loadTranslations();
  }, []);

  const loadTranslations = async () => {
    try {
      // In a real implementation, this would load from the messages directory
      // For now, we'll simulate it
      const mockTranslations: TranslationEntry[] = [];

      // This is a placeholder - in production, you'd load actual translation files
      setTranslations(mockTranslations);
    } catch (error) {
      console.error('Error loading translations:', error);
    }
  };

  const flattenObject = (obj: any, prefix = ''): Record<string, string> => {
    const flattened: Record<string, string> = {};

    Object.keys(obj).forEach((key) => {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(flattened, flattenObject(obj[key], fullKey));
      } else {
        flattened[fullKey] = String(obj[key]);
      }
    });

    return flattened;
  };

  const handleEdit = (key: string, values: Record<Locale, string>) => {
    setEditingKey(key);
    setEditedValues({ ...values });
  };

  const handleSave = async (key: string) => {
    try {
      // In production, this would save to the backend/file system
      const updatedTranslations = translations.map((t) =>
        t.key === key ? { ...t, values: editedValues } : t
      );
      setTranslations(updatedTranslations);
      setEditingKey(null);

      // TODO: Implement actual save to file system or database
      console.log('Saving translations for key:', key, editedValues);
    } catch (error) {
      console.error('Error saving translation:', error);
    }
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditedValues({} as Record<Locale, string>);
  };

  const handleExport = (locale: Locale) => {
    const data: any = {};

    translations.forEach((entry) => {
      const keys = entry.key.split('.');
      let current = data;

      keys.forEach((key, index) => {
        if (index === keys.length - 1) {
          current[key] = entry.values[locale] || '';
        } else {
          current[key] = current[key] || {};
          current = current[key];
        }
      });
    });

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${locale}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (locale: Locale) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const flattened = flattenObject(data);

        const updatedTranslations = translations.map((entry) => ({
          ...entry,
          values: {
            ...entry.values,
            [locale]: flattened[entry.key] || entry.values[locale],
          },
        }));

        setTranslations(updatedTranslations);
      } catch (error) {
        console.error('Error importing translations:', error);
        alert('Error importing file. Please check the format.');
      }
    };
    input.click();
  };

  const filteredTranslations = translations.filter((entry) => {
    const matchesSearch = searchQuery
      ? entry.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        Object.values(entry.values).some((v) =>
          v.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : true;

    const matchesFilter = showMissingOnly
      ? locales.some((locale) => !entry.values[locale])
      : true;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Translation Management
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage translations for all supported languages
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search translations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            {/* Locale selector */}
            <select
              value={selectedLocale}
              onChange={(e) => setSelectedLocale(e.target.value as Locale)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              {locales.map((locale) => (
                <option key={locale} value={locale}>
                  {localeNames[locale]}
                </option>
              ))}
            </select>

            {/* Show missing filter */}
            <label className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={showMissingOnly}
                onChange={(e) => setShowMissingOnly(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-slate-900 dark:text-white">Show missing only</span>
            </label>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => handleImport(selectedLocale)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Import
              </button>
              <button
                onClick={() => handleExport(selectedLocale)}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Translations table */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100 dark:bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Key
                  </th>
                  {locales.map((locale) => (
                    <th
                      key={locale}
                      className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                    >
                      {localeNames[locale]}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredTranslations.length === 0 ? (
                  <tr>
                    <td
                      colSpan={locales.length + 2}
                      className="px-6 py-12 text-center text-slate-500 dark:text-slate-400"
                    >
                      {searchQuery || showMissingOnly
                        ? 'No translations found matching your criteria'
                        : 'No translations available. Import a translation file to get started.'}
                    </td>
                  </tr>
                ) : (
                  filteredTranslations.map((entry) => (
                    <tr key={entry.key} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 text-sm font-mono text-slate-900 dark:text-white">
                        {entry.key}
                      </td>
                      {locales.map((locale) => (
                        <td key={locale} className="px-6 py-4 text-sm">
                          {editingKey === entry.key ? (
                            <input
                              type="text"
                              value={editedValues[locale] || ''}
                              onChange={(e) =>
                                setEditedValues({ ...editedValues, [locale]: e.target.value })
                              }
                              className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            />
                          ) : (
                            <span
                              className={
                                entry.values[locale]
                                  ? 'text-slate-900 dark:text-white'
                                  : 'text-red-500 italic'
                              }
                            >
                              {entry.values[locale] || 'Missing'}
                            </span>
                          )}
                        </td>
                      ))}
                      <td className="px-6 py-4 text-right text-sm">
                        {editingKey === entry.key ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSave(entry.key)}
                              className="p-1 text-green-600 hover:text-green-700"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancel}
                              className="p-1 text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEdit(entry.key, entry.values)}
                            className="p-1 text-blue-600 hover:text-blue-700"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Keys</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {translations.length}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              Missing Translations
            </div>
            <div className="text-2xl font-bold text-red-600">
              {translations.filter((t) => locales.some((l) => !t.values[l])).length}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              Supported Languages
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {locales.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
