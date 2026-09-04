'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { STORE_CONFIG } from '@/lib/store-config';
import { useToast } from '@/components/shared/ToastProvider';
import { Eye, EyeOff, Mail, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import styles from './auth.module.css';

function AuthForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirect = searchParams.get('redirect') || '/';
  const { showToast } = useToast();
  const supabase = createClient();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [signupSuccessNotice, setSignupSuccessNotice] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const callbackUrl = `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(
        redirect
      )}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      showToast(err.message || 'Google sign in failed', 'error');
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!unconfirmedEmail && !email) return;
    const targetEmail = unconfirmedEmail || email;
    try {
      setResending(true);
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: targetEmail,
      });
      if (error) throw error;
      showToast(`Confirmation email resent to ${targetEmail}! Check inbox & spam folder.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to resend confirmation email', 'error');
    } finally {
      setResending(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnconfirmedEmail(null);
    setSignupSuccessNotice(null);

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      showToast('Please enter both email and password', 'error');
      return;
    }

    if (isSignUp && cleanPassword.length < 6) {
      showToast('Password must be at least 6 characters long', 'error');
      return;
    }

    try {
      setLoading(true);
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
          options: {
            data: {
              full_name: fullName.trim() || 'Customer',
              phone: phone.trim() || null,
            },
          },
        });

        if (error) throw error;

        // Auto-create or ensure profile in public.profiles table
        if (data.user) {
          try {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              full_name: fullName.trim() || 'Customer',
              phone: phone.trim() || null,
              role: 'customer',
              referral_code: data.user.id.slice(0, 8),
            });
          } catch {}
        }

        if (data.session) {
          showToast('Account created and signed in!', 'success');
          window.location.href = redirect;
        } else {
          setSignupSuccessNotice(cleanEmail);
          showToast('Account created! Please check your email inbox to verify.', 'info');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (error) {
          if (error.message.toLowerCase().includes('email not confirmed')) {
            setUnconfirmedEmail(cleanEmail);
            showToast('Email address has not been confirmed yet.', 'info');
            return;
          }
          if (error.message.toLowerCase().includes('invalid login credentials')) {
            showToast('Invalid email or password. Please try again or sign in with Google.', 'error');
            return;
          }
          throw error;
        }

        showToast('Signed in successfully!', 'success');
        window.location.href = redirect;
      }
    } catch (err: any) {
      showToast(err.message || 'Authentication failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authWrapper} suppressHydrationWarning>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <h1 className={styles.authTitle}>
            {isSignUp ? 'Create an Account' : `Welcome to ${STORE_CONFIG.name}`}
          </h1>
          <p className={styles.authSubtitle}>
            {isSignUp
              ? 'Join us to track orders, earn reward points, and checkout faster'
              : 'Sign in to access your orders, wishlist, and profile'}
          </p>
        </div>

        {/* Unconfirmed Email Alert Banner */}
        {unconfirmedEmail && (
          <div
            style={{
              padding: '14px',
              borderRadius: '12px',
              background: 'rgba(234, 179, 8, 0.1)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              color: '#854d0e',
              fontSize: '13px',
              textAlign: 'left',
              marginBottom: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
              <AlertCircle size={16} />
              <span>Email Confirmation Required</span>
            </div>
            <p style={{ margin: 0, lineHeight: 1.4 }}>
              Your account with <strong>{unconfirmedEmail}</strong> has not been verified yet. Please click the confirmation link sent to your inbox.
            </p>
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={resending}
              style={{
                alignSelf: 'flex-start',
                padding: '5px 12px',
                borderRadius: '6px',
                background: '#ca8a04',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '4px',
              }}
            >
              <RefreshCw size={12} className={resending ? 'animate-spin' : ''} />
              <span>{resending ? 'Resending...' : 'Resend Confirmation Email'}</span>
            </button>
          </div>
        )}

        {/* Signup Success Notice */}
        {signupSuccessNotice && (
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              color: '#15803d',
              fontSize: '13px',
              textAlign: 'left',
              marginBottom: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
              <CheckCircle2 size={18} />
              <span>Verification Email Sent!</span>
            </div>
            <p style={{ margin: 0, lineHeight: 1.4 }}>
              We sent a verification link to <strong>{signupSuccessNotice}</strong>. Please check your inbox and click the link to start shopping.
            </p>
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={resending}
              style={{
                alignSelf: 'flex-start',
                padding: '5px 12px',
                borderRadius: '6px',
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '4px',
              }}
            >
              <Mail size={12} />
              <span>{resending ? 'Sending...' : 'Resend Email'}</span>
            </button>
          </div>
        )}

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className={styles.oauthButton}
          id="google-signin-btn"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        <div className={styles.divider}>Or with Email</div>

        <form onSubmit={handleEmailAuth} className={styles.formSection}>
          {isSignUp && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="full-name-input">Full Name</label>
                <input
                  id="full-name-input"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Tanvir Ahmed"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required={isSignUp}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="phone-input">Phone Number (Optional)</label>
                <input
                  id="phone-input"
                  type="tel"
                  className="form-input"
                  placeholder="e.g. 01712345678"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="email-input">Email Address</label>
            <input
              id="email-input"
              type="email"
              className="form-input"
              placeholder="name@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password-input">Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                style={{ width: '100%', paddingRight: '42px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {isSignUp && (
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                At least 6 characters required.
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`btn btn-primary ${styles.submitBtn}`}
            id="auth-submit-btn"
          >
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className={styles.switchMode}>
          {isSignUp ? (
            <>
              Already have an account?
              <span
                role="button"
                tabIndex={0}
                className={styles.switchLink}
                onClick={() => {
                  setIsSignUp(false);
                  setUnconfirmedEmail(null);
                  setSignupSuccessNotice(null);
                }}
                onKeyDown={e => e.key === 'Enter' && setIsSignUp(false)}
              >
                Sign In
              </span>
            </>
          ) : (
            <>
              Don't have an account?
              <span
                role="button"
                tabIndex={0}
                className={styles.switchLink}
                onClick={() => {
                  setIsSignUp(true);
                  setUnconfirmedEmail(null);
                  setSignupSuccessNotice(null);
                }}
                onKeyDown={e => e.key === 'Enter' && setIsSignUp(true)}
              >
                Create one
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: '60px 0', textAlign: 'center' }}>Loading authentication...</div>}>
      <AuthForm />
    </Suspense>
  );
}
