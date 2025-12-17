import { useState, useEffect, useMemo } from 'react';
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

  // Active tab - consolidated from 8 to 4 tabs
  const [activeTab, setActiveTab] = useState('home');
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Content tab has sub-tabs: 'add' or 'library'
  const [contentSubTab, setContentSubTab] = useState('add');

  // Selected kid profile for adding content
  const [selectedKidId, setSelectedKidId] = useState(null);

  // Get kid profiles
  const kidProfiles = useQuery(
    api.kidProfiles.getKidProfiles,
    userData?._id ? { userId: userData._id } : 'skip'
  );

  // Get pending requests count for badge
  const pendingVideoRequests = useQuery(
    api.videoRequests.getPendingRequests,
    userData?._id ? { userId: userData._id } : 'skip'
  );
  const pendingChannelRequests = useQuery(
    api.channelRequests.getPendingRequests,
    userData?._id ? { userId: userData._id } : 'skip'
  );

  const pendingRequestsCount = (pendingVideoRequests?.length || 0) + (pendingChannelRequests?.length || 0);

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

          {/* Desktop Tabs - Consolidated to 4 tabs */}
          <div className="hidden md:block">
            <nav className="flex gap-1 -mb-px">
              {/* Home Tab */}
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

              {/* Content Tab (merged Add + Library) */}
              <button
                onClick={() => setActiveTab('content')}
                className={`${
                  activeTab === 'content'
                    ? 'border-b-2 border-red-500 text-red-600'
                    : 'text-gray-600 hover:text-gray-900 hover:border-gray-300 border-b-2 border-transparent'
                } py-3 px-6 font-medium text-sm transition-all duration-200 flex items-center gap-2`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>Content</span>
              </button>

              {/* Requests Tab */}
              <button
                onClick={() => setActiveTab('requests')}
                className={`${
                  activeTab === 'requests'
                    ? 'border-b-2 border-red-500 text-red-600'
                    : 'text-gray-600 hover:text-gray-900 hover:border-gray-300 border-b-2 border-transparent'
                } py-3 px-6 font-medium text-sm transition-all duration-200 flex items-center gap-2 relative`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span>Requests</span>
                {pendingRequestsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-medium">
                    {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                  </span>
                )}
              </button>

              {/* Account Tab (renamed from Settings) */}
              <button
                onClick={() => setActiveTab('account')}
                className={`${
                  activeTab === 'account'
                    ? 'border-b-2 border-red-500 text-red-600'
                    : 'text-gray-600 hover:text-gray-900 hover:border-gray-300 border-b-2 border-transparent'
                } ml-auto py-3 px-4 font-medium text-sm transition-all duration-200 flex items-center gap-2`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Account</span>
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
                setActiveTab('account');
                setShowMobileMenu(false);
              }}
              className="w-full px-4 py-3 text-left hover:bg-gray-100 transition flex items-center gap-3 text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="font-medium">Account</span>
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

      {/* Mobile Bottom Navigation - 4 tabs */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-inset-bottom">
        <div className="grid grid-cols-4">
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

          {/* Content (merged Add + Library) */}
          <button
            onClick={() => setActiveTab('content')}
            className={`relative flex flex-col items-center justify-center gap-0.5 py-2 transition-all ${
              activeTab === 'content' ? 'bg-red-50' : ''
            }`}
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'content' ? 2.5 : 2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className={`text-[10px] ${activeTab === 'content' ? 'font-semibold text-red-600' : 'text-gray-600'}`}>Content</span>
            {activeTab === 'content' && <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500"></div>}
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
              {pendingRequestsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-medium">
                  {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] ${activeTab === 'requests' ? 'font-semibold text-red-600' : 'text-gray-600'}`}>Requests</span>
            {activeTab === 'requests' && <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500"></div>}
          </button>

          {/* Account */}
          <button
            onClick={() => setActiveTab('account')}
            className={`relative flex flex-col items-center justify-center gap-0.5 py-2 transition-all ${
              activeTab === 'account' ? 'bg-red-50' : ''
            }`}
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'account' ? 2.5 : 2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className={`text-[10px] ${activeTab === 'account' ? 'font-semibold text-red-600' : 'text-gray-600'}`}>Account</span>
            {activeTab === 'account' && <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500"></div>}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        {/* HOME TAB - includes kids management and getting started */}
        {activeTab === 'home' && (
          <HomeTab
            userData={userData}
            kidProfiles={kidProfiles}
            userId={userData._id}
            onNavigate={setActiveTab}
            onCopyCode={copyFamilyCode}
            codeCopied={copiedCode}
          />
        )}

        {/* CONTENT TAB - Add and Library combined with sub-tabs */}
        {activeTab === 'content' && (
          <div className="space-y-6">
            {/* Sub-tab toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setContentSubTab('add')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  contentSubTab === 'add'
                    ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-red-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add
                </span>
              </button>
              <button
                onClick={() => setContentSubTab('library')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  contentSubTab === 'library'
                    ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-red-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Library
                </span>
              </button>
            </div>

            {/* Content sub-tabs content */}
            {contentSubTab === 'add' && (
              <YouTubeSearch
                userId={userData._id}
                kidProfiles={kidProfiles}
                selectedKidId={selectedKidId}
                onSelectKid={setSelectedKidId}
              />
            )}
            {contentSubTab === 'library' && (
              <ContentLibrary
                userId={userData._id}
                kidProfiles={kidProfiles}
                selectedKidId={selectedKidId}
                onSelectKid={setSelectedKidId}
              />
            )}
          </div>
        )}

        {/* REQUESTS TAB */}
        {activeTab === 'requests' && (
          <VideoRequests userId={userData._id} />
        )}

        {/* ACCOUNT TAB */}
        {activeTab === 'account' && (
          <Settings userData={userData} onLogout={handleLogout} />
        )}
      </main>
    </div>
  );
}

// Home tab component - now includes Kids management
function HomeTab({ userData, kidProfiles, userId, onNavigate, onCopyCode, codeCopied }) {
  const [expandedKidId, setExpandedKidId] = useState(null);
  const [showAddKid, setShowAddKid] = useState(false);
  const [showGettingStarted, setShowGettingStarted] = useState(() => {
    // Show getting started by default if no kid profiles
    return !kidProfiles || kidProfiles.length === 0;
  });

  return (
    <div className="space-y-6">
      {/* Header with Welcome and Family Code */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome, {userData.name || 'Parent'}!
          </h1>
          <p className="text-gray-600 text-sm">
            Your command center for managing kids' YouTube access
          </p>
        </div>
        <button
          onClick={onCopyCode}
          className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 px-4 py-2 rounded-xl transition flex items-center gap-2 shadow-md"
        >
          <span className="text-lg font-mono font-bold text-white tracking-wider">
            {userData.familyCode}
          </span>
          {codeCopied ? (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      </div>

      {/* Your Kids Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Your Kids</h2>
          <button
            onClick={() => setShowAddKid(true)}
            className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Kid
          </button>
        </div>

        {!kidProfiles || kidProfiles.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No kids yet</h3>
            <p className="text-gray-500 text-sm mb-4">Add a profile for each child to get started</p>
            <button
              onClick={() => setShowAddKid(true)}
              className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white px-6 py-2 rounded-lg font-medium transition shadow-md"
            >
              Add Your First Kid
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {kidProfiles.map((kid) => (
              <KidCard
                key={kid._id}
                kid={kid}
                isExpanded={expandedKidId === kid._id}
                onToggle={() => setExpandedKidId(expandedKidId === kid._id ? null : kid._id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => onNavigate('content')}
          className="bg-white hover:bg-gray-50 rounded-xl p-4 text-left transition shadow-sm border border-gray-100 hover:shadow-md hover:border-red-200"
        >
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mb-2">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 text-sm">Add Content</h3>
          <p className="text-gray-500 text-xs mt-0.5">Search & add videos</p>
        </button>
        <button
          onClick={() => onNavigate('requests')}
          className="bg-white hover:bg-gray-50 rounded-xl p-4 text-left transition shadow-sm border border-gray-100 hover:shadow-md hover:border-red-200"
        >
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-2">
            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 text-sm">View Requests</h3>
          <p className="text-gray-500 text-xs mt-0.5">Approve or deny</p>
        </button>
      </div>

      {/* Getting Started (collapsible) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <button
          onClick={() => setShowGettingStarted(!showGettingStarted)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Getting Started</h2>
          </div>
          <svg className={`w-5 h-5 text-gray-400 transition-transform ${showGettingStarted ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showGettingStarted && (
          <div className="px-6 pb-6">
            <ol className="space-y-3 text-gray-600 text-sm">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white text-xs font-medium">1</span>
                <span>Add a profile for each of your kids above</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white text-xs font-medium">2</span>
                <span>Go to Content tab and search for YouTube channels/videos to approve</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white text-xs font-medium">3</span>
                <span>Share your family code <strong className="font-mono text-red-600">{userData.familyCode}</strong> with your kids</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white text-xs font-medium">4</span>
                <span>Kids visit <Link to="/play" className="text-red-600 hover:underline font-medium">getsafetube.com/play</Link> and enter the code</span>
              </li>
            </ol>
          </div>
        )}
      </div>

      {/* Add Kid Modal */}
      {showAddKid && (
        <AddKidModal userId={userId} onClose={() => setShowAddKid(false)} />
      )}
    </div>
  );
}

// Kid Card with expandable details
function KidCard({ kid, isExpanded, onToggle }) {
  return (
    <div>
      {/* Main card row */}
      <div
        className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition"
        onClick={onToggle}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
          style={{ backgroundColor: kid.color || '#ef4444' }}
        >
          {kid.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900">{kid.name}</h3>
          <p className="text-gray-500 text-sm truncate">
            {kid.timeLimitMinutes ? `${kid.timeLimitMinutes} min daily limit` : 'No time limit'}
          </p>
        </div>
        <svg className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            {/* Time Limit */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Daily Time Limit</span>
              <span className="text-sm font-medium text-gray-900">
                {kid.timeLimitMinutes ? `${kid.timeLimitMinutes} minutes` : 'Unlimited'}
              </span>
            </div>
            {/* Requests Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Can Request Videos</span>
              <span className={`text-sm font-medium ${kid.canRequest !== false ? 'text-green-600' : 'text-gray-400'}`}>
                {kid.canRequest !== false ? 'Yes' : 'No'}
              </span>
            </div>
            {/* PIN */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">PIN Protection</span>
              <span className={`text-sm font-medium ${kid.pin ? 'text-green-600' : 'text-gray-400'}`}>
                {kid.pin ? 'Enabled' : 'None'}
              </span>
            </div>
          </div>
          {/* Edit button placeholder - links to full KidsManager */}
          <button className="w-full py-2 text-sm text-red-600 hover:text-red-700 font-medium">
            Edit Profile Settings →
          </button>
        </div>
      )}
    </div>
  );
}

// Add Kid Modal
function AddKidModal({ userId, onClose }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#ef4444');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createKidProfile = useMutation(api.kidProfiles.createKidProfile);

  const colors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await createKidProfile({
        userId,
        name: name.trim(),
        color,
      });
      onClose();
    } catch (err) {
      console.error('Failed to create profile:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Add Kid Profile</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter kid's name"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition ${color === c ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-xl font-medium transition"
            >
              {isSubmitting ? 'Adding...' : 'Add Kid'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
