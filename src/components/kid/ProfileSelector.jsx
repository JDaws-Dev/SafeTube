import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ProfileSelector({ profiles, onSelect, familyCode, onChangeCode }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSelect = async (profile) => {
    setIsLoading(true);
    // Small delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 200));
    onSelect(profile);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="font-bold text-gray-900 text-lg">SafeTube</span>
        </div>
        <button
          onClick={onChangeCode}
          className="text-gray-500 hover:text-gray-700 text-sm transition flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
          Change Code
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Who's Watching?</h1>
        <p className="text-gray-600 mb-8">Select your profile</p>

        {profiles.length === 0 ? (
          <div className="text-center bg-white rounded-2xl p-8 shadow-sm border border-gray-100 max-w-sm">
            <div className="w-20 h-20 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-gray-700 font-medium mb-2">No profiles found for this family code.</p>
            <p className="text-gray-500 text-sm">Ask your parent to create a profile for you.</p>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-6 max-w-2xl">
            {profiles.map((profile) => (
              <button
                key={profile._id}
                onClick={() => handleSelect(profile)}
                disabled={isLoading}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white shadow-sm border border-gray-100 hover:shadow-lg hover:border-red-200 transition transform hover:scale-105 disabled:opacity-50"
              >
                <div
                  className="w-20 h-20 rounded-full shadow-md"
                  style={{ backgroundColor: profile.color || '#ef4444' }}
                />
                <span className="text-gray-900 font-semibold text-lg">{profile.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Family Code Display */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm">Family Code</p>
          <p className="text-gray-400 font-mono text-lg tracking-widest">{familyCode}</p>
        </div>

        {/* Parent Login Link */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-center text-gray-500 text-sm">
            Are you a parent?{' '}
            <Link to="/login" className="text-red-500 hover:text-red-600 font-medium">
              Log in here →
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
