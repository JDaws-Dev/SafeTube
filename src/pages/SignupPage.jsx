import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import { useConvexAuth } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '../../convex/_generated/api';

export default function SignupPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: isPending } = useConvexAuth();
  const { signIn } = useAuthActions();
  const applyCouponCode = useMutation(api.userSync.applyCouponCode);

  // Get current user to check if onboarding is completed
  const currentUser = useQuery(api.userSync.getCurrentUser);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    promoCode: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPromoCode, setShowPromoCode] = useState(false);
  const [passwordMismatch, setPasswordMismatch] = useState(false);

  // Refs for accessibility - focus management on errors
  const nameInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const confirmPasswordInputRef = useRef(null);
  const errorRef = useRef(null);

  // Handle password field changes with real-time validation
  const handlePasswordChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    // Only show mismatch if confirm field has content
    if (newFormData.confirmPassword.length > 0) {
      setPasswordMismatch(newFormData.password !== newFormData.confirmPassword);
    } else {
      setPasswordMismatch(false);
    }
  };

  // Check if promo code is valid for lifetime access
  const lifetimeCodes = ['DAWSFRIEND', 'DEWITT'];
  const promoTrimmed = formData.promoCode.trim().toUpperCase();
  const isLifetimeCode = lifetimeCodes.includes(promoTrimmed);
  const hasInvalidCode = promoTrimmed.length > 0 && !isLifetimeCode;

  // Calculate trial end date (7 days from now)
  const trialEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });

  // Redirect to onboarding if already logged in
  useEffect(() => {
    if (isAuthenticated && currentUser && !isPending) {
      navigate('/onboarding');
    }
  }, [isAuthenticated, currentUser, isPending, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      confirmPasswordInputRef.current?.focus();
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Validate password strength
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      passwordInputRef.current?.focus();
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsLoading(true);

    try {
      // Sign up with Convex Auth (Password provider)
      // The afterUserCreatedOrUpdated callback will initialize SafeTube fields
      await signIn('password', {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        flow: 'signUp',
      });

      // Apply coupon code if provided (after user is created)
      if (formData.promoCode) {
        try {
          await applyCouponCode({ couponCode: formData.promoCode });
        } catch (couponErr) {
          // Coupon failed but account was created - just log it
          console.warn('[SignupPage] Coupon code failed:', couponErr);
        }
      }

      // Navigate to onboarding
      navigate('/onboarding');
    } catch (err) {
      console.error('Signup error:', err);
      if (err.message?.includes('already exists') || err.message?.includes('Account already exists')) {
        setError('This email is already registered. Please log in instead.');
        emailInputRef.current?.focus();
      } else {
        setError('Unable to create account. Please try again.');
      }
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    setError('');

    try {
      await signIn('google', { redirectTo: '/onboarding' });
    } catch (err) {
      console.error('[SignupPage] Google signup error:', err);
      setError('Google sign-up failed. Please try again.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4">
        <Link to="/" className="flex items-center gap-2 w-fit">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900">SafeTube</span>
        </Link>
      </header>

      {/* Signup Form */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md min-w-0 bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">
            {isLifetimeCode ? 'Get Lifetime Access' : 'Start Your Free Trial'}
          </h1>
          <p className="text-gray-500 text-center mb-2">
            {isLifetimeCode ? 'Your promo code unlocks full access forever!' : '7 days free. No credit card required.'}
          </p>
          {!isLifetimeCode && (
            <p className="text-red-500 text-sm text-center mb-6">Your trial includes full access until {trialEndDate}</p>
          )}
          {isLifetimeCode && (
            <p className="text-green-600 text-sm text-center mb-6 font-medium">Lifetime access unlocked!</p>
          )}

          {error && (
            <div
              ref={errorRef}
              role="alert"
              aria-live="assertive"
              id="form-error"
              className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-6"
            >
              {error}
            </div>
          )}

          {/* Google Sign Up Button */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={googleLoading || isLoading}
            className="w-full min-h-[48px] flex items-center justify-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            {googleLoading ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {googleLoading ? 'Creating account...' : 'Continue with Google'}
          </button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or sign up with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" aria-busy={isLoading}>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Your Name
              </label>
              <input
                ref={nameInputRef}
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full min-h-[44px] bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Parent Name"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                ref={emailInputRef}
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                aria-invalid={error.includes('email') || error.includes('registered') ? 'true' : undefined}
                aria-describedby={error.includes('email') || error.includes('registered') ? 'form-error' : undefined}
                className="w-full min-h-[44px] bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                ref={passwordInputRef}
                id="password"
                type="password"
                autoComplete="new-password"
                value={formData.password}
                onChange={(e) => handlePasswordChange('password', e.target.value)}
                aria-invalid={error.includes('Password') && error.includes('8') ? 'true' : undefined}
                aria-describedby={error.includes('Password') && error.includes('8') ? 'form-error' : undefined}
                className="w-full min-h-[44px] bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="At least 8 characters"
                required
                minLength={8}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                ref={confirmPasswordInputRef}
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                aria-invalid={passwordMismatch || error.includes('match') ? 'true' : undefined}
                aria-describedby={passwordMismatch ? 'password-mismatch-error' : (error.includes('match') ? 'form-error' : undefined)}
                className={`w-full min-h-[44px] bg-gray-50 border rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                  passwordMismatch ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
                placeholder="Confirm your password"
                required
              />
              {passwordMismatch && (
                <p id="password-mismatch-error" role="alert" className="mt-1 text-sm text-red-600">Passwords do not match</p>
              )}
            </div>

            {/* Promo Code Section */}
            <div>
              {!showPromoCode ? (
                <button
                  type="button"
                  onClick={() => setShowPromoCode(true)}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Have a promo code?
                </button>
              ) : (
                <div>
                  <label htmlFor="promoCode" className="block text-sm font-medium text-gray-700 mb-1">
                    Promo Code
                  </label>
                  <input
                    id="promoCode"
                    type="text"
                    value={formData.promoCode}
                    onChange={(e) => setFormData({ ...formData, promoCode: e.target.value.toUpperCase() })}
                    className={`w-full min-h-[44px] border rounded-lg px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent ${
                      isLifetimeCode
                        ? 'bg-green-50 border-green-300 text-green-800 focus:ring-green-500'
                        : hasInvalidCode
                        ? 'bg-red-50 border-red-300 text-red-800 focus:ring-red-500'
                        : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-red-500'
                    }`}
                    placeholder="Enter code"
                  />
                  {isLifetimeCode && (
                    <p className="text-green-600 text-sm mt-1 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Lifetime access unlocked!
                    </p>
                  )}
                  {hasInvalidCode && (
                    <p className="text-red-500 text-sm mt-1">
                      Invalid code - you'll start with a 7-day trial
                    </p>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || googleLoading}
              className={`w-full min-h-[48px] py-3 rounded-lg font-semibold transition shadow-md text-white ${
                isLifetimeCode
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                  : 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600'
              } disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed`}
            >
              {isLoading ? 'Creating account...' : isLifetimeCode ? 'Get Lifetime Access' : 'Start Free Trial'}
            </button>
          </form>

          {/* Trust signals */}
          <div className="mt-6 flex items-center justify-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              No credit card
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Cancel anytime
            </span>
          </div>

          <p className="text-center text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-red-600 hover:text-red-700 font-medium">
              Sign in
            </Link>
          </p>

          {/* Bundle Upsell */}
          <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50/50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-orange-900">
                  Want all 3 apps? Save 33%
                </p>
                <p className="text-xs text-orange-700 mt-0.5">
                  Get SafeTube + SafeTunes + SafeReads for just $9.99/mo instead of $14.97
                </p>
                <a
                  href="https://getsafecontent.vercel.app/#pricing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-orange-600 hover:text-orange-700 mt-2"
                >
                  Learn about the Safe Suite
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              By signing up, you agree to our{' '}
              <Link to="/terms" className="text-red-600 hover:text-red-700">Terms</Link>
              {' '}and{' '}
              <Link to="/privacy" className="text-red-600 hover:text-red-700">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
