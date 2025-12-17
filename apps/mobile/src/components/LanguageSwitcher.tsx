import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react-native';
import { locales, localeNames, localeFlags, changeLanguage, type Locale } from '../i18n';

interface LanguageSwitcherProps {
  variant?: 'button' | 'modal';
}

export default function LanguageSwitcher({ variant = 'button' }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const currentLocale = i18n.language as Locale;

  const handleLanguageChange = async (locale: Locale) => {
    await changeLanguage(locale);
    setIsModalVisible(false);
  };

  const renderLanguageItem = ({ item }: { item: Locale }) => {
    const isSelected = currentLocale === item;

    return (
      <TouchableOpacity
        style={[styles.languageItem, isSelected && styles.languageItemSelected]}
        onPress={() => handleLanguageChange(item)}
      >
        <Text style={styles.languageFlag}>{localeFlags[item]}</Text>
        <Text style={[styles.languageName, isSelected && styles.languageNameSelected]}>
          {localeNames[item]}
        </Text>
        {isSelected && <Check size={20} color="#3b82f6" />}
      </TouchableOpacity>
    );
  };

  if (variant === 'modal') {
    return (
      <>
        <TouchableOpacity style={styles.triggerButton} onPress={() => setIsModalVisible(true)}>
          <Globe size={20} color="#64748b" />
          <Text style={styles.triggerText}>
            {localeFlags[currentLocale]} {localeNames[currentLocale]}
          </Text>
        </TouchableOpacity>

        <Modal
          visible={isModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Language</Text>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                  <Text style={styles.closeButton}>Close</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={locales}
                renderItem={renderLanguageItem}
                keyExtractor={(item) => item}
                style={styles.languageList}
              />
            </View>
          </View>
        </Modal>
      </>
    );
  }

  return (
    <TouchableOpacity style={styles.compactButton} onPress={() => setIsModalVisible(true)}>
      <Globe size={18} color="#64748b" />
      <Text style={styles.compactText}>{localeFlags[currentLocale]}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  triggerText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
  },
  compactText: {
    fontSize: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  closeButton: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '500',
  },
  languageList: {
    paddingHorizontal: 20,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 4,
  },
  languageItemSelected: {
    backgroundColor: '#eff6ff',
  },
  languageFlag: {
    fontSize: 24,
  },
  languageName: {
    flex: 1,
    fontSize: 16,
    color: '#334155',
    fontWeight: '500',
  },
  languageNameSelected: {
    color: '#3b82f6',
    fontWeight: '600',
  },
});
