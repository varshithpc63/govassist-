import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { loginWithEmail, signUpWithEmail } from '../firebase';

interface AuthModalProps {
  onClose: () => void;
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const [authMobile, setAuthMobile] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authError, setAuthError] = useState('');
  const [authErrorField, setAuthErrorField] = useState<'mobile' | 'password' | 'general' | 'name' | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthErrorField(null);
    setIsAuthLoading(true);

    // Basic mobile validation
    const mobileRegex = /^[0-9]{10,15}$/;
    if (!mobileRegex.test(authMobile)) {
      setAuthError('Please enter a valid mobile number (10-15 digits).');
      setAuthErrorField('mobile');
      setIsAuthLoading(false);
      return;
    }

    // Transform mobile to dummy email for Firebase Auth
    const dummyEmail = `${authMobile}@mobile.app`;

    try {
      if (isLoginMode) {
        await loginWithEmail(dummyEmail, authPassword);
      } else {
        if (!authName.trim()) {
          setAuthError('Please enter your name.');
          setAuthErrorField('name');
          setIsAuthLoading(false);
          return;
        }
        await signUpWithEmail(dummyEmail, authPassword, authName.trim());
      }
      onClose();
    } catch (err: any) {
      let errorMessage = err.message || 'Authentication failed';
      try {
        const parsed = JSON.parse(errorMessage);
        if (parsed.error) {
          errorMessage = parsed.error;
        }
      } catch (e) {
        // Not a JSON string
      }
      
      let friendlyMessage = errorMessage;
      let field: 'mobile' | 'password' | 'general' = 'general';

      if (errorMessage.includes('auth/invalid-email')) {
        friendlyMessage = 'Invalid mobile format.';
        field = 'mobile';
      } else if (errorMessage.includes('auth/user-not-found') || errorMessage.includes('auth/invalid-credential')) {
        friendlyMessage = 'Incorrect mobile number or password. Please try again.';
        field = 'general';
      } else if (errorMessage.includes('auth/wrong-password')) {
        friendlyMessage = 'Incorrect password. Please try again.';
        field = 'password';
      } else if (errorMessage.includes('auth/email-already-in-use')) {
        friendlyMessage = 'This mobile number is already registered. Please sign in instead.';
        field = 'mobile';
      } else if (errorMessage.includes('auth/weak-password')) {
        friendlyMessage = 'Password should be at least 6 characters.';
        field = 'password';
      }

      setAuthError(friendlyMessage);
      setAuthErrorField(field);
    } finally {
      setIsAuthLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 id="auth-modal-title" className="text-xl font-bold text-gray-900">{isLoginMode ? 'Sign In' : 'Create Account'}</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close modal"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        
        {authError && (
          <div 
            className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100"
            role="alert"
          >
            {authError}
          </div>
        )}
        
        <form onSubmit={handleAuth} className="space-y-4">
          {!isLoginMode && (
            <div>
              <label htmlFor="auth-name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input 
                id="auth-name"
                type="text" 
                value={authName} 
                onChange={e => {
                  setAuthName(e.target.value);
                  if (authErrorField === 'name' || authErrorField === 'general') {
                    setAuthError('');
                    setAuthErrorField(null);
                  }
                }} 
                required 
                className={`w-full border ${authErrorField === 'name' || authErrorField === 'general' ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-teal-500'} rounded-xl p-3 focus:ring-2 outline-none transition-all`} 
                placeholder="John Doe"
              />
            </div>
          )}
          <div>
            <label htmlFor="auth-mobile" className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
            <input 
              id="auth-mobile"
              type="tel" 
              value={authMobile} 
              onChange={e => {
                setAuthMobile(e.target.value.replace(/\D/g, ''));
                if (authErrorField === 'mobile' || authErrorField === 'general') {
                  setAuthError('');
                  setAuthErrorField(null);
                }
              }} 
              required 
              className={`w-full border ${authErrorField === 'mobile' || authErrorField === 'general' ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-teal-500'} rounded-xl p-3 focus:ring-2 outline-none transition-all`} 
              placeholder="9876543210"
            />
          </div>
          <div>
            <label htmlFor="auth-password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              id="auth-password"
              type="password" 
              value={authPassword} 
              onChange={e => {
                setAuthPassword(e.target.value);
                if (authErrorField === 'password' || authErrorField === 'general') {
                  setAuthError('');
                  setAuthErrorField(null);
                }
              }} 
              required 
              className={`w-full border ${authErrorField === 'password' || authErrorField === 'general' ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-teal-500'} rounded-xl p-3 focus:ring-2 outline-none transition-all`} 
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit" 
            disabled={isAuthLoading} 
            className="w-full bg-[#00796b] text-white rounded-xl p-3 font-medium hover:bg-teal-800 disabled:opacity-50 transition-colors flex justify-center items-center"
          >
            {isAuthLoading ? <Loader2 size={20} className="animate-spin" aria-hidden="true" /> : (isLoginMode ? 'Sign In' : 'Sign Up')}
          </button>
        </form>
        
        <div className="mt-5 text-center text-sm text-gray-600">
          {isLoginMode ? "Don't have an account? " : "Already have an account? "}
          <button 
            type="button" 
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setAuthError('');
            }} 
            className="text-[#00796b] font-medium hover:underline"
          >
            {isLoginMode ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}
