import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signUp } from '../lib/auth-client';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

export default function SignupPage() {
  const navigate = useNavigate();
  const syncUser = useMutation(api.users.syncUser);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    promoCode: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPromoCode, setShowPromoCode] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      // Create auth account
      const result = await signUp.email({
        email: formData.email,
        password: formData.password,
        name: formData.name,
      });

      if (result.error) {
        setError(result.error.message || 'Unable to create account');
        return;
      }

      // Sync user to our database (with promo code if provided)
      // This also triggers welcome emails from the backend
      await syncUser({
        email: formData.email,
        name: formData.name,
        promoCode: formData.promoCode.trim() || undefined,
      });

      // Navigate to onboarding
      navigate('/onboarding');
    } catch (err) {
      console.error('Signup error:', err);
      setError('Unable to create account. Please try again.');
    } finally {
      setIsLoading(false);
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
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
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

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Your Name
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Parent Name"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Confirm your password"
                required
              />
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
                    className={`w-full border rounded-lg px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent ${
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
              disabled={isLoading}
              className={`w-full py-3 rounded-lg font-semibold transition shadow-md text-white ${
                isLifetimeCode
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                  : 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600'
              } disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed`}
            >
              {isLoading ? 'Creating account...' : isLifetimeCode ? 'Get Lifetime Access' : 'Start Free Trial'}
            </button>
          </form>

          <p className="text-center text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-red-600 hover:text-red-700 font-medium">
              Log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
