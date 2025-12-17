'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Upload, User, Briefcase } from 'lucide-react';
import StepCard from '@/components/onboarding/StepCard';

const ROLES = [
  { value: 'developer', label: 'Developer', icon: '👨‍💻' },
  { value: 'team_lead', label: 'Team Lead', icon: '👔' },
  { value: 'engineering_manager', label: 'Engineering Manager', icon: '👨‍💼' },
  { value: 'product_manager', label: 'Product Manager', icon: '📊' },
  { value: 'designer', label: 'Designer', icon: '🎨' },
  { value: 'student', label: 'Student', icon: '🎓' },
  { value: 'other', label: 'Other', icon: '🤝' },
];

export default function Step1Page() {
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.fullName || '',
    avatarUrl: user?.imageUrl || '',
    role: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Call API to complete step
      const response = await fetch('/api/onboarding/complete-step', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          step: 1,
          data: formData,
        }),
      });

      if (response.ok) {
        router.push('/onboarding/step-2');
      } else {
        throw new Error('Failed to complete step');
      }
    } catch (error) {
      console.error('Error completing step:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // In a real app, upload to cloud storage
    // For now, just use a local preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, avatarUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  return (
    <StepCard
      title="Welcome! Let's set up your profile"
      description="Tell us about yourself to personalize your experience"
      step={1}
      estimatedTime={2}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar Upload */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden ring-4 ring-blue-100">
              {formData.avatarUrl ? (
                <img
                  src={formData.avatarUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <User className="w-12 h-12" />
                </div>
              )}
            </div>
            <label
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors shadow-lg"
            >
              <Upload className="w-4 h-4" />
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </label>
          </div>
          <p className="mt-2 text-sm text-gray-500">Upload profile picture</p>
        </div>

        {/* Name Input */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Display Name *
          </label>
          <input
            id="name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="Enter your name"
          />
        </div>

        {/* Role Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            What best describes your role? *
          </label>
          <div className="grid grid-cols-2 gap-3">
            {ROLES.map((role) => (
              <button
                key={role.value}
                type="button"
                onClick={() => setFormData({ ...formData, role: role.value })}
                className={`
                  p-4 rounded-lg border-2 transition-all text-left
                  ${
                    formData.role === role.value
                      ? 'border-blue-600 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{role.icon}</span>
                  <span className="font-medium text-gray-900">{role.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading || !formData.name || !formData.role}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-xl"
          >
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </div>
      </form>
    </StepCard>
  );
}
