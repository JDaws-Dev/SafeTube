import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signIn, useSession } from '../lib/auth-client';

export default function LoginPage() {
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect when session is available
  useEffect(() => {
    if (session?.user && !isPending) {
      console.log('Session detected, navigating to /admin');
      navigate('/admin');
    }
  }, [session, isPending, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    console.log('Login attempt:', formData.email);

    try {
      console.log('Calling signIn.email...');
      const result = await signIn.email({
        email: formData.email,
        password: formData.password,
      });
      console.log('signIn result:', result);

      if (result.error) {
        console.log('Login error from result:', result.error);
        // Show appropriate error message
        const errorMsg = result.error.message || '';
        if (errorMsg.includes('Invalid') || errorMsg.includes('credentials') || errorMsg.includes('password')) {
          setError('Invalid email or password. Please try again.');
        } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
          setError('Network error. Please check your connection and try again.');
        } else {
          setError(errorMsg || 'Login failed. Please try again.');
        }
        setIsLoading(false);
      } else {
        console.log('Login successful, navigating to /admin');
        // Navigate immediately - session cookie is now same-origin so it works
        navigate('/admin');
      }
    } catch (err) {
      console.error('Login error (catch):', err);
      // Provide more specific error messages
      const errorMessage = err?.message || '';
      if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
        setError('Network error. Please check your connection and try again.');
      } else if (errorMessage.includes('timeout')) {
        setError('Request timed out. Please try again.');
      } else {
        setError('Unable to log in. Please try again.');
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4">
        <Link to="/" className="flex items-center gap-2 w-fit">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900">SafeTube</span>
        </Link>
      </header>

      {/* Login Form */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">Welcome Back</h1>
          <p className="text-gray-500 text-center mb-8">Log in to manage your kids' content</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
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
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition shadow-md"
            >
              {isLoading ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <p className="text-center text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-cyan-600 hover:text-cyan-700 font-medium">
              Sign up
            </Link>
          </p>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-center text-gray-500 text-sm">
              Are you a kid?{' '}
              <Link to="/play" className="text-cyan-600 hover:text-cyan-700">
                Go to player →
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
