import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';

// Color constants
const COLORS = [
  { id: 'red', bg: 'bg-red-500', ring: 'ring-red-400' },
  { id: 'orange', bg: 'bg-orange-500', ring: 'ring-orange-400' },
  { id: 'yellow', bg: 'bg-yellow-500', ring: 'ring-yellow-400' },
  { id: 'green', bg: 'bg-green-500', ring: 'ring-green-400' },
  { id: 'blue', bg: 'bg-blue-500', ring: 'ring-blue-400' },
  { id: 'purple', bg: 'bg-purple-500', ring: 'ring-purple-400' },
  { id: 'pink', bg: 'bg-pink-500', ring: 'ring-pink-400' },
];

function getColorClass(colorId) {
  const color = COLORS.find(c => c.id === colorId);
  return color ? color.bg : 'bg-red-500';
}

// Time limit presets
const TIME_PRESETS = [
  { value: 0, label: 'Unlimited' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
];

// Hour options for time window
const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`,
}));

// Format minutes to human readable
function formatMinutes(mins) {
  if (mins === 0) return 'Unlimited';
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

// Format relative time
function formatTimeAgo(timestamp) {
  if (!timestamp) return '';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

// Confirm Modal component
function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// Expandable Kid Card component
function KidCard({ kid, userId, allTimeLimits, recentHistory, onDelete }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showTimeWindow, setShowTimeWindow] = useState(false);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: kid.name,
    color: kid.color || 'red',
    requestsEnabled: kid.requestsEnabled !== false,
  });

  // Time limit form state
  const [timeLimitForm, setTimeLimitForm] = useState({
    dailyLimitMinutes: 60,
    weekendLimitMinutes: undefined,
    allowedStartHour: undefined,
    allowedEndHour: undefined,
  });

  const updateProfile = useMutation(api.kidProfiles.updateKidProfile);
  const setTimeLimit = useMutation(api.timeLimits.setTimeLimit);
  const deleteTimeLimit = useMutation(api.timeLimits.deleteTimeLimit);

  // Get current time limit data
  const timeLimit = allTimeLimits?.find(t => t.kidProfileId === kid._id);
  const kidHistory = recentHistory?.filter(h => h.kidProfileId === kid._id) || [];
  const lastWatch = kidHistory.length > 0 ? kidHistory[0] : null;

  // Initialize time limit form when expanded
  useEffect(() => {
    if (isExpanded && timeLimit?.limit) {
      setTimeLimitForm({
        dailyLimitMinutes: timeLimit.limit.dailyLimitMinutes,
        weekendLimitMinutes: timeLimit.limit.weekendLimitMinutes,
        allowedStartHour: timeLimit.limit.allowedStartHour,
        allowedEndHour: timeLimit.limit.allowedEndHour,
      });
      setShowTimeWindow(timeLimit.limit.allowedStartHour !== undefined);
    } else if (isExpanded) {
      setTimeLimitForm({
        dailyLimitMinutes: 60,
        weekendLimitMinutes: undefined,
        allowedStartHour: undefined,
        allowedEndHour: undefined,
      });
      setShowTimeWindow(false);
    }
  }, [isExpanded, timeLimit]);

  // Reset profile form when not editing
  useEffect(() => {
    if (!isEditing) {
      setProfileForm({
        name: kid.name,
        color: kid.color || 'red',
        requestsEnabled: kid.requestsEnabled !== false,
      });
    }
  }, [isEditing, kid]);

  const handleSaveProfile = async () => {
    if (!profileForm.name.trim()) return;
    setSaving(true);
    try {
      await updateProfile({
        profileId: kid._id,
        name: profileForm.name.trim(),
        icon: 'none',
        color: profileForm.color,
        requestsEnabled: profileForm.requestsEnabled,
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTimeLimit = async () => {
    setSaving(true);
    try {
      await setTimeLimit({
        kidProfileId: kid._id,
        dailyLimitMinutes: timeLimitForm.dailyLimitMinutes,
        weekendLimitMinutes: timeLimitForm.weekendLimitMinutes,
        allowedStartHour: showTimeWindow ? timeLimitForm.allowedStartHour : undefined,
        allowedEndHour: showTimeWindow ? timeLimitForm.allowedEndHour : undefined,
      });
    } catch (err) {
      console.error('Failed to save time limit:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveTimeLimit = async () => {
    setSaving(true);
    try {
      await deleteTimeLimit({ kidProfileId: kid._id });
      setTimeLimitForm({
        dailyLimitMinutes: 60,
        weekendLimitMinutes: undefined,
        allowedStartHour: undefined,
        allowedEndHour: undefined,
      });
      setShowTimeWindow(false);
    } catch (err) {
      console.error('Failed to remove time limit:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Card Header - Always visible */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${getColorClass(kid.color)}`}>
              {kid.name.charAt(0).toUpperCase()}
            </div>
            {/* Info */}
            <div>
              <h3 className="font-semibold text-gray-900">{kid.name}</h3>
              <div className="flex items-center gap-3 mt-0.5 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {timeLimit?.limit ? formatMinutes(timeLimit.limit.dailyLimitMinutes) : 'No limit'}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-xs ${kid.requestsEnabled !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {kid.requestsEnabled !== false ? 'Requests on' : 'Requests off'}
                </span>
              </div>
            </div>
          </div>
          {/* Chevron */}
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-100">
          {/* Profile Settings Section */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile Settings
              </h4>
              {!isEditing && (
                <button
                  onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Edit
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-4">
                {/* Preview */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${getColorClass(profileForm.color)}`}>
                    {profileForm.name ? profileForm.name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Preview</p>
                    <p className="font-medium text-gray-900">{profileForm.name || "Kid's Name"}</p>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                    maxLength={20}
                  />
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map((colorOption) => (
                      <button
                        key={colorOption.id}
                        type="button"
                        onClick={() => setProfileForm({ ...profileForm, color: colorOption.id })}
                        className={`w-8 h-8 rounded-full ${colorOption.bg} transition-transform ${
                          profileForm.color === colorOption.id
                            ? `ring-2 ${colorOption.ring} ring-offset-2 scale-110`
                            : 'hover:scale-110'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Requests Toggle */}
                <div className="flex items-center justify-between py-2">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Allow Content Requests</label>
                    <p className="text-xs text-gray-500">Let this kid search and request videos</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProfileForm({ ...profileForm, requestsEnabled: !profileForm.requestsEnabled })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      profileForm.requestsEnabled ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        profileForm.requestsEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving || !profileForm.name.trim()}
                    className="flex-1 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-400 text-white px-4 py-2 rounded-lg font-medium transition"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-600">
                <p>Name: <span className="font-medium text-gray-900">{kid.name}</span></p>
                <p className="mt-1">Content Requests: <span className={kid.requestsEnabled !== false ? 'text-green-600' : 'text-gray-500'}>{kid.requestsEnabled !== false ? 'Enabled' : 'Disabled'}</span></p>
              </div>
            )}
          </div>

          {/* Time Limits Section */}
          <div className="p-4 border-b border-gray-100">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Time Limits
            </h4>

            {/* Daily limit */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Daily Limit (Weekdays)</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {TIME_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => setTimeLimitForm(s => ({ ...s, dailyLimitMinutes: preset.value }))}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition ${
                      timeLimitForm.dailyLimitMinutes === preset.value
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Weekend limit toggle */}
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={timeLimitForm.weekendLimitMinutes !== undefined}
                  onChange={(e) => setTimeLimitForm(s => ({
                    ...s,
                    weekendLimitMinutes: e.target.checked ? s.dailyLimitMinutes : undefined,
                  }))}
                  className="w-4 h-4 text-red-500 border-gray-300 rounded focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-700">Different limit on weekends</span>
              </label>
              {timeLimitForm.weekendLimitMinutes !== undefined && (
                <div className="mt-2 ml-6 grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {TIME_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => setTimeLimitForm(s => ({ ...s, weekendLimitMinutes: preset.value }))}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium transition ${
                        timeLimitForm.weekendLimitMinutes === preset.value
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Time window toggle */}
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTimeWindow}
                  onChange={(e) => {
                    setShowTimeWindow(e.target.checked);
                    if (e.target.checked && timeLimitForm.allowedStartHour === undefined) {
                      setTimeLimitForm(s => ({ ...s, allowedStartHour: 8, allowedEndHour: 20 }));
                    }
                  }}
                  className="w-4 h-4 text-red-500 border-gray-300 rounded focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-700">Restrict to specific hours</span>
              </label>
              {showTimeWindow && (
                <div className="mt-2 ml-6 flex items-center gap-2 flex-wrap">
                  <select
                    value={timeLimitForm.allowedStartHour ?? 8}
                    onChange={(e) => setTimeLimitForm(s => ({ ...s, allowedStartHour: parseInt(e.target.value) }))}
                    className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg px-2 py-1.5 text-sm focus:ring-red-500 focus:border-red-500"
                  >
                    {HOURS.map((h) => (
                      <option key={h.value} value={h.value}>{h.label}</option>
                    ))}
                  </select>
                  <span className="text-gray-500 text-sm">to</span>
                  <select
                    value={timeLimitForm.allowedEndHour ?? 20}
                    onChange={(e) => setTimeLimitForm(s => ({ ...s, allowedEndHour: parseInt(e.target.value) }))}
                    className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg px-2 py-1.5 text-sm focus:ring-red-500 focus:border-red-500"
                  >
                    {HOURS.map((h) => (
                      <option key={h.value} value={h.value}>{h.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Save Time Limit */}
            <div className="flex gap-2">
              <button
                onClick={handleSaveTimeLimit}
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                {saving ? 'Saving...' : 'Save Time Limit'}
              </button>
              {timeLimit?.limit && (
                <button
                  onClick={handleRemoveTimeLimit}
                  disabled={saving}
                  className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg text-sm font-medium transition"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* Recent Activity Section */}
          <div className="p-4 border-b border-gray-100">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Recent Activity
            </h4>
            {kidHistory.length > 0 ? (
              <div className="space-y-2">
                {kidHistory.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    {item.thumbnailUrl && (
                      <img
                        src={item.thumbnailUrl}
                        alt=""
                        className="w-16 h-10 object-cover rounded flex-shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{item.title}</p>
                      <p className="text-xs text-gray-500">{formatTimeAgo(item.watchedAt)}</p>
                    </div>
                  </div>
                ))}
                {kidHistory.length > 3 && (
                  <p className="text-xs text-gray-500 text-center">+{kidHistory.length - 3} more</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No watch history yet</p>
            )}
          </div>

          {/* Delete Profile */}
          <div className="p-4">
            <button
              onClick={() => onDelete(kid._id, kid.name)}
              className="w-full text-sm text-red-600 hover:text-red-700 hover:bg-red-50 py-2 rounded-lg font-medium transition"
            >
              Delete Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Main KidsManager component
export default function KidsManager({ userId, kidProfiles }) {
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [formData, setFormData] = useState({ name: '', color: 'red', requestsEnabled: true });

  const createProfile = useMutation(api.kidProfiles.createKidProfile);
  const deleteProfile = useMutation(api.kidProfiles.deleteKidProfile);

  // Get recent watch history
  const recentHistory = useQuery(
    api.watchHistory.getRecentHistory,
    userId ? { userId, limit: 50 } : 'skip'
  );

  // Get time limits for all kids
  const allTimeLimits = useQuery(
    api.timeLimits.getAllTimeLimits,
    userId ? { userId } : 'skip'
  );

  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    setIsLoading(true);
    try {
      await createProfile({
        userId,
        name: formData.name.trim(),
        icon: 'none',
        color: formData.color,
        requestsEnabled: formData.requestsEnabled,
      });
      setFormData({ name: '', color: 'red', requestsEnabled: true });
      setIsCreating(false);
    } catch (err) {
      console.error('Failed to create profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (profileId, profileName) => {
    setConfirmModal({
      title: 'Delete Profile',
      message: `Delete ${profileName}'s profile? This will also delete all their approved content and watch history.`,
      onConfirm: async () => {
        try {
          await deleteProfile({ profileId });
        } catch (err) {
          console.error('Failed to delete profile:', err);
        }
        setConfirmModal(null);
      },
    });
  };

  const startCreate = () => {
    setIsCreating(true);
    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)].id;
    setFormData({ name: '', color: randomColor, requestsEnabled: true });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Kids</h2>
          <p className="text-sm sm:text-base text-gray-600">Manage profiles, time limits, and settings for each kid</p>
        </div>
        {!isCreating && (
          <button
            onClick={startCreate}
            className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white px-4 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 shadow-md"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Kid
          </button>
        )}
      </div>

      {/* Create New Profile Form */}
      {isCreating && (
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Kid</h3>

          <div className="space-y-4">
            {/* Preview */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md ${getColorClass(formData.color)}`}>
                {formData.name ? formData.name.charAt(0).toUpperCase() : '?'}
              </div>
              <div>
                <p className="text-sm text-gray-500">Preview</p>
                <p className="font-semibold text-gray-900">{formData.name || "Kid's Name"}</p>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Kid's name"
                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                maxLength={20}
                autoFocus
              />
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
              <div className="flex flex-wrap gap-3">
                {COLORS.map((colorOption) => (
                  <button
                    key={colorOption.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: colorOption.id })}
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${colorOption.bg} transition-transform ${
                      formData.color === colorOption.id
                        ? `ring-2 ${colorOption.ring} ring-offset-2 scale-110 shadow-lg`
                        : 'hover:scale-110'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Content Settings */}
            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Content Settings</h4>

              <div className="flex items-center justify-between py-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">Allow Content Requests</label>
                  <p className="text-xs text-gray-500">Let this kid search and request videos</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, requestsEnabled: !formData.requestsEnabled })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    formData.requestsEnabled ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      formData.requestsEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCreate}
                disabled={isLoading || !formData.name.trim()}
                className="flex-1 sm:flex-none bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium transition shadow-md"
              >
                {isLoading ? 'Creating...' : 'Create Profile'}
              </button>
              <button
                onClick={() => setIsCreating(false)}
                className="flex-1 sm:flex-none bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2.5 rounded-lg font-medium transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kid Cards */}
      {kidProfiles && kidProfiles.length > 0 ? (
        <div className="space-y-4">
          {kidProfiles.map((kid) => (
            <KidCard
              key={kid._id}
              kid={kid}
              userId={userId}
              allTimeLimits={allTimeLimits}
              recentHistory={recentHistory}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : !isCreating ? (
        <div className="bg-white rounded-xl p-8 sm:p-12 text-center shadow-sm border border-gray-100">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No kids yet</h3>
          <p className="text-sm sm:text-base text-gray-500 mb-6">
            Create a profile for each of your kids to get started
          </p>
          <button
            onClick={startCreate}
            className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white px-6 py-3 rounded-lg font-medium transition shadow-md"
          >
            Add First Kid
          </button>
        </div>
      ) : null}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={!!confirmModal}
        title={confirmModal?.title}
        message={confirmModal?.message}
        onConfirm={confirmModal?.onConfirm}
        onCancel={() => setConfirmModal(null)}
      />
    </div>
  );
}
