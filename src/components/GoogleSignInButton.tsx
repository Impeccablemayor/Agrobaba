import { useEffect, useRef, useState, useId } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from '../lib/toastBus';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: number | string;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  acceptedTerms?: boolean;
  onSuccess?: () => void;
  disabled?: boolean;
  label?: string;
}

export function GoogleSignInButton({
  acceptedTerms = false,
  onSuccess,
  disabled = false,
  label = 'Continue with Google',
}: GoogleSignInButtonProps) {
  const { loginWithGoogle, linkGoogleAccount } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [pendingIdToken, setPendingIdToken] = useState<string | null>(null);

  // Modals
  const [showLinkingModal, setShowLinkingModal] = useState(false);
  const [linkingPassword, setLinkingPassword] = useState('');
  const [showLinkingPassword, setShowLinkingPassword] = useState(false);
  const [linkingError, setLinkingError] = useState<string | null>(null);
  const [linkingBusy, setLinkingBusy] = useState(false);

  const [showTermsModal, setShowTermsModal] = useState(false);
  const [modalTermsChecked, setModalTermsChecked] = useState(false);

  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  const containerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Handle credential token returned by Google
  async function handleCredential(idToken: string, termsConsent: boolean) {
    if (submitting || linkingBusy) return;
    setSubmitting(true);

    try {
      const result = await loginWithGoogle(idToken, termsConsent);

      if (result.outcome === 'success') {
        onSuccess?.();
        return;
      }

      if (result.outcome === 'linking-required') {
        setPendingIdToken(idToken);
        setLinkingPassword('');
        setLinkingError(null);
        setShowLinkingModal(true);
        return;
      }

      if (result.outcome === 'terms-required') {
        setPendingIdToken(idToken);
        setModalTermsChecked(false);
        setShowTermsModal(true);
        return;
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Link Account submission with password
  async function handleLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingIdToken || !linkingPassword || linkingBusy) return;

    setLinkingBusy(true);
    setLinkingError(null);

    try {
      const ok = await linkGoogleAccount(pendingIdToken, linkingPassword);
      if (ok) {
        setShowLinkingModal(false);
        setPendingIdToken(null);
        onSuccess?.();
      } else {
        setLinkingError('Invalid password. Please check your password and try again.');
      }
    } catch {
      setLinkingError('Unable to link account. Please check your password and try again.');
    } finally {
      setLinkingBusy(false);
    }
  }

  // Handle Terms Modal acceptance
  function handleTermsAccept(e: React.FormEvent) {
    e.preventDefault();
    if (!modalTermsChecked || !pendingIdToken) {
      showToast('Please agree to the Terms of Service to continue.', 'error');
      return;
    }
    setShowTermsModal(false);
    const idToken = pendingIdToken;
    setPendingIdToken(null);
    void handleCredential(idToken, true);
  }

  // Fallback interactive click when clicked directly
  function handleButtonClick() {
    if (disabled || submitting) return;

    if (!clientId) {
      showToast('Google Sign-In is not configured. Please set VITE_GOOGLE_CLIENT_ID.', 'error');
      return;
    }

    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      showToast('Loading Google Sign-In. Please wait a moment...', 'info');
    }
  }

  useEffect(() => {
    if (!clientId) return;

    // Load Google Identity Services script if not already present
    let script = document.getElementById('google-gsi-script') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = 'google-gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    function initGsi() {
      if (!window.google?.accounts?.id || !containerRef.current) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response?.credential) {
            void handleCredential(response.credential, acceptedTerms);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // Render official GSI button in container with responsive width
      containerRef.current.innerHTML = '';
      const containerWidth = containerRef.current.clientWidth || 300;
      // Google Identity Services accepts width between 200 and 400 pixels
      const buttonWidth = Math.max(200, Math.min(380, Math.floor(containerWidth)));

      window.google.accounts.id.renderButton(containerRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: buttonWidth,
      });
    }

    let resizeTimer: ReturnType<typeof setTimeout>;
    function handleResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!containerRef.current || !window.google?.accounts?.id) return;
        const currentW = Math.max(200, Math.min(380, Math.floor(containerRef.current.clientWidth || 300)));
        containerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: currentW,
        });
      }, 200);
    }

    window.addEventListener('resize', handleResize);

    if (window.google?.accounts?.id) {
      initGsi();
    } else {
      script.addEventListener('load', initGsi);
      return () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(resizeTimer);
        script?.removeEventListener('load', initGsi);
      };
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, [clientId, acceptedTerms]);

  return (
    <div style={{ width: '100%', maxWidth: '100%', marginBottom: 16 }}>
      {/* Container for Google's official GSI button if script is ready */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          maxWidth: '100%',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          minHeight: 40,
        }}
      >
        {/* Styled fallback button displayed while GSI script loads or as fallback */}
        <button
          type="button"
          onClick={handleButtonClick}
          disabled={disabled || submitting}
          aria-label={label}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            width: '100%',
            padding: '10px 16px',
            backgroundColor: '#ffffff',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: disabled || submitting ? 'not-allowed' : 'pointer',
            opacity: disabled || submitting ? 0.7 : 1,
            transition: 'background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          }}
          onMouseEnter={(e) => {
            if (!disabled && !submitting) {
              e.currentTarget.style.backgroundColor = '#f9fafb';
              e.currentTarget.style.borderColor = '#9ca3af';
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled && !submitting) {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.borderColor = '#d1d5db';
            }
          }}
        >
          {submitting ? (
            <>
              <i className="fa-solid fa-spinner fa-spin" style={{ color: 'var(--primary, #059669)' }}></i>
              <span>Authenticating with Google…</span>
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"
                />
                <path
                  fill="#34A853"
                  d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
                />
                <path
                  fill="#FBBC05"
                  d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
                />
                <path
                  fill="#EA4335"
                  d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"
                />
              </svg>
              <span>{label}</span>
            </>
          )}
        </button>
      </div>

      {/* Account Linking Modal (Required when Google email matches existing password account) */}
      {showLinkingModal && (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <div className="confirm-dialog" style={{ maxWidth: 440, textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: 'color-mix(in srgb, var(--primary, #059669) 15%, transparent)',
                  color: 'var(--primary, #059669)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                }}
              >
                <i className="fa-solid fa-link"></i>
              </div>
              <h3 id={titleId} style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                Link Your Account
              </h3>
            </div>

            <p style={{ fontSize: 13.5, color: 'var(--muted, #6b7280)', lineHeight: 1.5, marginBottom: 16 }}>
              An AgroBaba account already exists with this email address. To protect your account and orders,
              please enter your existing password to link your Google identity.
            </p>

            {linkingError && (
              <div
                role="alert"
                style={{
                  marginBottom: 14,
                  padding: '10px 12px',
                  borderRadius: 6,
                  fontSize: 13,
                  backgroundColor: 'color-mix(in srgb, #ef4444 12%, transparent)',
                  color: '#dc2626',
                  border: '1px solid color-mix(in srgb, #ef4444 30%, transparent)',
                }}
              >
                <i className="fa-solid fa-circle-exclamation" style={{ marginRight: 6 }}></i>
                {linkingError}
              </div>
            )}

            <form onSubmit={handleLinkSubmit}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Current Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showLinkingPassword ? 'text' : 'password'}
                    placeholder="Enter your AgroBaba password"
                    required
                    autoComplete="current-password"
                    style={{ width: '100%', paddingRight: 40 }}
                    value={linkingPassword}
                    onChange={(e) => setLinkingPassword(e.target.value)}
                    disabled={linkingBusy}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLinkingPassword((s) => !s)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--muted)',
                      cursor: 'pointer',
                      padding: 4,
                    }}
                  >
                    <i className={showLinkingPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'}></i>
                  </button>
                </div>
              </div>

              <div className="confirm-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setShowLinkingModal(false);
                    setPendingIdToken(null);
                  }}
                  disabled={linkingBusy}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={linkingBusy || !linkingPassword}>
                  {linkingBusy && <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }}></i>}
                  {linkingBusy ? 'Verifying…' : 'Link & Sign In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Terms Acceptance Modal (Required for new Google users who haven't accepted terms) */}
      {showTermsModal && (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <div className="confirm-dialog" style={{ maxWidth: 440, textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: 'color-mix(in srgb, var(--primary, #059669) 15%, transparent)',
                  color: 'var(--primary, #059669)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                }}
              >
                <i className="fa-solid fa-shield-halved"></i>
              </div>
              <h3 id={titleId} style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                Accept Terms & Conditions
              </h3>
            </div>

            <p style={{ fontSize: 13.5, color: 'var(--muted, #6b7280)', lineHeight: 1.5, marginBottom: 16 }}>
              Welcome to AgroBaba! To complete your registration using Google, please accept our terms:
            </p>

            <form onSubmit={handleTermsAccept}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20 }}>
                <input
                  type="checkbox"
                  id="google-terms-check"
                  style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0, cursor: 'pointer' }}
                  checked={modalTermsChecked}
                  onChange={(e) => setModalTermsChecked(e.target.checked)}
                />
                <label
                  htmlFor="google-terms-check"
                  style={{ fontSize: 12.5, color: 'var(--text)', cursor: 'pointer', lineHeight: 1.5 }}
                >
                  I agree to AgroBaba's{' '}
                  <a href="#" style={{ color: 'var(--primary, #059669)', fontWeight: 600 }}>
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" style={{ color: 'var(--primary, #059669)', fontWeight: 600 }}>
                    Privacy Policy
                  </a>
                  . I understand that all transactions on AgroBaba are escrow-protected.
                </label>
              </div>

              <div className="confirm-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setShowTermsModal(false);
                    setPendingIdToken(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={!modalTermsChecked}>
                  Agree & Continue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
