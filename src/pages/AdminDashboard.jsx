import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { signOut, useSession } from '../lib/auth-client';

// Components
import KidsManager from '../components/admin/KidsManager';
import YouTubeSearch from '../components/admin/YouTubeSearch';
import ContentLibrary from '../components/admin/ContentLibrary';
import VideoRequests from '../components/admin/VideoRequests';
import Settings from '../components/admin/Settings';
import GettingStarted from '../components/admin/GettingStarted';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { data: session, isPending: sessionPending } = useSession();
  const [copiedCode, setCopiedCode] = useState(false);

  // Sync user to our database on login
  const syncUser = useMutation(api.users.syncUser);

  const copyFamilyCode = async () => {
    if (userData?.familyCode) {
      await navigator.clipboard.writeText(userData.familyCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Get user data by email from session (not from auth component)
  const userData = useQuery(
    api.users.getUserByEmail,
    session?.user?.email ? { email: session.user.email } : 'skip'
  );

  // Active tab
  const [activeTab, setActiveTab] = useState('home');
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Selected kid profile for adding content
  const [selectedKidId, setSelectedKidId] = useState(null);

  // Get kid profiles
  const kidProfiles = useQuery(
    api.kidProfiles.getKidProfiles,
    userData?._id ? { userId: userData._id } : 'skip'
  );

  // Sync user when session is available but user doesn't exist yet
  useEffect(() => {
    if (session?.user?.email && userData === null) {
      syncUser({
        email: session.user.email,
        name: session.user.name,
      });
    }
  }, [session, userData, syncUser]);

  // Set first kid as selected by default
  useEffect(() => {
    if (kidProfiles?.length > 0 && !selectedKidId) {
      setSelectedKidId(kidProfiles[0]._id);
    }
  }, [kidProfiles, selectedKidId]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  // Redirect to login if no session after loading
  useEffect(() => {
    if (!sessionPending && !session) {
      navigate('/login');
    }
  }, [sessionPending, session, navigate]);

  if (sessionPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-gray-600 text-lg">Loading session...</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-gray-600 text-lg">Redirecting to login...</div>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-gray-600 text-lg">Loading profile...</div>
        </div>
      </div>
    );
  }

  // Redirect to onboarding if not completed (only for new users who have this field set to false)
  // Existing users without this field (undefined) should NOT be redirected
  if (userData.onboardingCompleted === false && userData.subscriptionStatus === "trial") {
    navigate('/onboarding');
    return null;
  }

  // Show trial expired screen
  if (userData.isTrialExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Free Trial Has Ended</h1>
          <p className="text-gray-600 mb-6">
            Your 7-day free trial has expired. Subscribe to continue using SafeTube and keep your kids safe on YouTube.
          </p>

          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-700 font-medium">Your kids can no longer access their approved content</p>
          </div>

          <div className="space-y-3">
            <a
              href="mailto:support@getsafetube.com?subject=SafeTube%20Subscription"
              className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white py-3 rounded-xl font-semibold transition shadow-md flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contact Us to Subscribe
            </a>

            <button
              onClick={handleLogout}
              className="w-full text-gray-500 hover:text-gray-700 py-2 transition"
            >
              Log Out
            </button>
          </div>

          <p className="text-gray-400 text-sm mt-6">
            Subscription options coming soon!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Bar */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">SafeTube</h1>
                <p className="text-xs text-gray-600">Parent Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Family Code Badge - Clickable to copy */}
              <button
                onClick={copyFamilyCode}
                className="hidden sm:flex items-center bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 px-4 py-2 rounded-lg transition group"
                title="Click to copy"
              >
                <span className="text-white/80 text-xs mr-2">Family Code:</span>
                <span className="text-white font-mono font-bold tracking-wider">
                  {userData.familyCode}
                </span>
                {copiedCode ? (
                  <svg className="w-4 h-4 text-white ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-white/60 ml-2 group-hover:text-white transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
              {/* Hamburger Menu - Mobile Only */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                title="Menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Desktop Tabs */}
          <div className="hidden md:block">
            <nav className="flex gap-1 -mb-px">
              <button
                onClick={() => setActiveTab('setup')}
                className={`${
                  activeTab === 'setup'
                    ? 'border-b-2 border-red-500 text-red-600'
                    : 'text-gray-600 hover:text-gray-900 hover:border-gray-300 border-b-2 border-transparent'
                } py-3 px-6 font-medium text-sm transition-all duration-200 flex items-center gap-2`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Setup</span>
              </button>
              <button
                onClick={() => setActiveTab('home')}
                className={`${
                  activeTab === 'home'
                    ? 'border-b-2 border-red-500 text-red-600'
                    : 'text-gray-600 hover:text-gray-900 hover:border-gray-300 border-b-2 border-transparent'
                } py-3 px-6 font-medium text-sm transition-all duration-200 flex items-center gap-2`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Home</span>
              </button>
              <button
                onClick={() => setActiveTab('search')}
                className={`${
                  activeTab === 'search'
                    ? 'border-b-2 border-red-500 text-red-600'
                    : 'text-gray-600 hover:text-gray-900 hover:border-gray-300 border-b-2 border-transparent'
                } py-3 px-6 font-medium text-sm transition-all duration-200 flex items-center gap-2`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Add Content</span>
              </button>
              <button
                onClick={() => setActiveTab('library')}
                className={`${
                  activeTab === 'library'
                    ? 'border-b-2 border-red-500 text-red-600'
                    : 'text-gray-600 hover:text-gray-900 hover:border-gray-300 border-b-2 border-transparent'
                } py-3 px-6 font-medium text-sm transition-all duration-200 flex items-center gap-2`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>Library</span>
              </button>
              <button
                onClick={() => setActiveTab('kids')}
                className={`${
                  activeTab === 'kids'
                    ? 'border-b-2 border-red-500 text-red-600'
                    : 'text-gray-600 hover:text-gray-900 hover:border-gray-300 border-b-2 border-transparent'
                } py-3 px-6 font-medium text-sm transition-all duration-200 flex items-center gap-2`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Kids</span>
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`${
                  activeTab === 'requests'
                    ? 'border-b-2 border-red-500 text-red-600'
                    : 'text-gray-600 hover:text-gray-900 hover:border-gray-300 border-b-2 border-transparent'
                } py-3 px-6 font-medium text-sm transition-all duration-200 flex items-center gap-2`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span>Requests</span>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`${
                  activeTab === 'settings'
                    ? 'border-b-2 border-red-500 text-red-600'
                    : 'text-gray-600 hover:text-gray-900 hover:border-gray-300 border-b-2 border-transparent'
                } ml-auto py-3 px-4 font-medium text-sm transition-all duration-200 flex items-center gap-2`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Settings</span>
              </button>
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900 py-3 px-4 font-medium text-sm transition-all duration-200 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Dropdown Menu */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setShowMobileMenu(false)}>
          <div className="absolute top-16 right-4 bg-white rounded-xl shadow-xl py-2 min-w-[200px]" onClick={(e) => e.stopPropagation()}>
            {/* Family Code - Clickable to copy */}
            <button
              onClick={() => {
                copyFamilyCode();
                setShowMobileMenu(false);
              }}
              className="w-full px-4 py-3 border-b border-gray-100 text-left hover:bg-gray-50 transition"
            >
              <p className="text-xs text-gray-500">Family Code (tap to copy)</p>
              <div className="flex items-center justify-between">
                <p className="font-mono font-bold text-red-600 tracking-wider">{userData.familyCode}</p>
                {copiedCode ? (
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab('setup');
                setShowMobileMenu(false);
              }}
              className="w-full px-4 py-3 text-left hover:bg-gray-100 transition flex items-center gap-3 text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="font-medium">Getting Started</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('settings');
                setShowMobileMenu(false);
              }}
              className="w-full px-4 py-3 text-left hover:bg-gray-100 transition flex items-center gap-3 text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-medium">Settings</span>
            </button>
            <button
              onClick={() => {
                handleLogout();
                setShowMobileMenu(false);
              }}
              className="w-full px-4 py-3 text-left hover:bg-gray-100 transition flex items-center gap-3 text-red-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-inset-bottom">
        <div className="grid grid-cols-5">
          {/* Home */}
          <button
            onClick={() => setActiveTab('home')}
            className={`relative flex flex-col items-center justify-center gap-0.5 py-2 transition-all ${
              activeTab === 'home' ? 'bg-red-50' : ''
            }`}
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'home' ? 2.5 : 2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className={`text-[10px] ${activeTab === 'home' ? 'font-semibold text-red-600' : 'text-gray-600'}`}>Home</span>
            {activeTab === 'home' && <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500"></div>}
          </button>

          {/* Add */}
          <button
            onClick={() => setActiveTab('search')}
            className={`relative flex flex-col items-center justify-center gap-0.5 py-2 transition-all ${
              activeTab === 'search' ? 'bg-red-50' : ''
            }`}
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'search' ? 2.5 : 2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className={`text-[10px] ${activeTab === 'search' ? 'font-semibold text-red-600' : 'text-gray-600'}`}>Add</span>
            {activeTab === 'search' && <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500"></div>}
          </button>

          {/* Library */}
          <button
            onClick={() => setActiveTab('library')}
            className={`relative flex flex-col items-center justify-center gap-0.5 py-2 transition-all ${
              activeTab === 'library' ? 'bg-red-50' : ''
            }`}
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'library' ? 2.5 : 2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className={`text-[10px] ${activeTab === 'library' ? 'font-semibold text-red-600' : 'text-gray-600'}`}>Library</span>
            {activeTab === 'library' && <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500"></div>}
          </button>

          {/* Requests (with badge) */}
          <button
            onClick={() => setActiveTab('requests')}
            className={`relative flex flex-col items-center justify-center gap-0.5 py-2 transition-all ${
              activeTab === 'requests' ? 'bg-red-50' : ''
            }`}
          >
            <div className="relative">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'requests' ? 2.5 : 2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <span className={`text-[10px] ${activeTab === 'requests' ? 'font-semibold text-red-600' : 'text-gray-600'}`}>Requests</span>
            {activeTab === 'requests' && <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500"></div>}
          </button>

          {/* Kids */}
          <button
            onClick={() => setActiveTab('kids')}
            className={`relative flex flex-col items-center justify-center gap-0.5 py-2 transition-all ${
              activeTab === 'kids' ? 'bg-red-50' : ''
            }`}
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'kids' ? 2.5 : 2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className={`text-[10px] ${activeTab === 'kids' ? 'font-semibold text-red-600' : 'text-gray-600'}`}>Kids</span>
            {activeTab === 'kids' && <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500"></div>}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        {activeTab === 'setup' && (
          <GettingStarted
            userData={userData}
            onNavigate={setActiveTab}
          />
        )}
        {activeTab === 'home' && (
          <HomeTab
            userData={userData}
            kidProfiles={kidProfiles}
            onNavigate={setActiveTab}
            onCopyCode={copyFamilyCode}
            codeCopied={copiedCode}
          />
        )}
        {activeTab === 'search' && (
          <YouTubeSearch
            userId={userData._id}
            kidProfiles={kidProfiles}
            selectedKidId={selectedKidId}
            onSelectKid={setSelectedKidId}
          />
        )}
        {activeTab === 'library' && (
          <ContentLibrary
            userId={userData._id}
            kidProfiles={kidProfiles}
            selectedKidId={selectedKidId}
            onSelectKid={setSelectedKidId}
          />
        )}
        {activeTab === 'kids' && (
          <KidsManager
            userId={userData._id}
            kidProfiles={kidProfiles}
          />
        )}
        {activeTab === 'requests' && (
          <VideoRequests userId={userData._id} />
        )}
        {activeTab === 'settings' && (
          <Settings userData={userData} onLogout={handleLogout} />
        )}
      </main>
    </div>
  );
}

// Home tab component
function HomeTab({ userData, kidProfiles, onNavigate, onCopyCode, codeCopied }) {
  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome, {userData.name || 'Parent'}!
        </h1>
        <p className="text-gray-600">
          Manage your kids' approved YouTube content from here.
        </p>
      </div>

      {/* Family Code Card */}
      <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white mb-1">Your Family Code</h2>
            <p className="text-white/80 text-sm">
              Give this code to your kids so they can access their approved videos
            </p>
          </div>
          <button
            onClick={onCopyCode}
            className="bg-white/20 backdrop-blur px-6 py-3 rounded-xl hover:bg-white/30 transition flex items-center gap-3 group"
          >
            <span className="text-3xl font-mono font-bold text-white tracking-wider">
              {userData.familyCode}
            </span>
            {codeCopied ? (
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-white/60 group-hover:text-white transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
        {codeCopied && (
          <p className="text-white/90 text-sm mt-3 text-center md:text-right">Copied to clipboard!</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigate('search')}
          className="bg-white hover:bg-gray-50 rounded-xl p-6 text-left transition shadow-sm border border-gray-100 hover:shadow-md hover:border-red-200"
        >
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Add Content</h3>
          <p className="text-gray-500 text-sm">
            Search YouTube and add channels or videos
          </p>
        </button>
        <button
          onClick={() => onNavigate('kids')}
          className="bg-white hover:bg-gray-50 rounded-xl p-6 text-left transition shadow-sm border border-gray-100 hover:shadow-md hover:border-red-200"
        >
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Manage Kids</h3>
          <p className="text-gray-500 text-sm">
            Add or edit kid profiles
          </p>
        </button>
        <button
          onClick={() => onNavigate('library')}
          className="bg-white hover:bg-gray-50 rounded-xl p-6 text-left transition shadow-sm border border-gray-100 hover:shadow-md hover:border-red-200"
        >
          <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">View Library</h3>
          <p className="text-gray-500 text-sm">
            See all approved content
          </p>
        </button>
      </div>

      {/* Kid Profiles Overview */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Kid Profiles</h2>
        {!kidProfiles || kidProfiles.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
            <div className="w-20 h-20 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No profiles yet</h3>
            <p className="text-gray-500 mb-4">
              Create a profile for each of your kids
            </p>
            <button
              onClick={() => onNavigate('kids')}
              className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white px-6 py-2 rounded-lg font-medium transition shadow-md"
            >
              Add First Profile
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {kidProfiles.map((profile) => (
              <div
                key={profile._id}
                className="bg-white rounded-xl p-4 flex items-center gap-4 shadow-sm border border-gray-100 hover:shadow-md transition"
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: profile.color || '#ef4444' }}
                >
                  {profile.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{profile.name}</h3>
                  <p className="text-gray-500 text-sm">
                    Created {new Date(profile.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">How to set up</h2>
        <ol className="space-y-3 text-gray-600">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white text-sm font-medium">1</span>
            <span>Create a profile for each of your kids (tap "Kids" tab)</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white text-sm font-medium">2</span>
            <span>Search for YouTube channels or videos and add them (tap "Add Content")</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white text-sm font-medium">3</span>
            <span>Give your kids the family code: <strong className="font-mono text-red-600">{userData.familyCode}</strong></span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white text-sm font-medium">4</span>
            <span>Kids go to <Link to="/play" className="text-red-600 hover:underline font-medium">getsafetube.com/play</Link> and enter the code</span>
          </li>
        </ol>
      </div>
    </div>
  );
}
