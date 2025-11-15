'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const sessionId = searchParams.get('session_id');
  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const scope = searchParams.get('scope');
  const state = searchParams.get('state');
  
  useEffect(() => {
    // Initialize Firebase Auth here
    // For now, just log the parameters
    console.log('Login page loaded with params:', {
      sessionId,
      clientId,
      redirectUri,
      scope,
      state
    });
  }, [sessionId, clientId, redirectUri, scope, state]);
  
  const handleLogin = async (email: string, password: string) => {
    setLoading(true);
    setError('');
    
    try {
      // In production, integrate with Firebase Auth
      // For demo purposes, simulate login
      await simulateLogin(email, password);
      
      // Generate authorization code
      const authCode = generateAuthorizationCode();
      
      // Redirect back to client with authorization code
      const callbackUrl = new URL(redirectUri!);
      callbackUrl.searchParams.set('code', authCode);
      if (state) {
        callbackUrl.searchParams.set('state', state);
      }
      
      window.location.href = callbackUrl.toString();
      
    } catch (error) {
      setError('Login failed. Please try again.');
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Application: {clientId}
          </p>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target as HTMLFormElement);
          const email = formData.get('email') as string;
          const password = formData.get('password') as string;
          handleLogin(email, password);
        }}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Password"
              />
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
        
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Demo credentials: any email/password combination
          </p>
        </div>
      </div>
    </div>
  );
}

async function simulateLogin(email: string, password: string): Promise<void> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // In production, validate with Firebase Auth
  if (email.length === 0 || password.length === 0) {
    throw new Error('Invalid credentials');
  }
}

function generateAuthorizationCode(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}