import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  getVerificationStatus, resendVerificationOtp, verifyEmail, verifyEmailOtp,
} from '../../lib/auth';
import { applyOtpPaste, formatCooldown, isCompleteOtp, normalizeOtpInput, OTP_LENGTH, secondsUntil } from '../../lib/otp';

type Mode = 'otp' | 'link';
type OtpStatus = 'idle' | 'checking-status' | 'submitting' | 'success' | 'error';

/** Matches the backend's per-email resend cooldown so the UI never fires a request the server
 *  would only reject with 429. */
const RESEND_COOLDOWN_MS = 60_000;

interface LocationState {
  email?: string;
  notice?: string;
}

/**
 * Email verification screen. Two flows share the page:
 *  - OTP (default): the post-registration / pre-login path. Six digit boxes, auto-advance,
 *    paste support, a resend button guarded by a local 60s cooldown, and a status check on
 *    mount so a returning user who already verified is sent straight to sign-in.
 *  - Legacy link (`?token=`): still honored for emails sent before the OTP rollout.
 */
export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const token = searchParams.get('token') || '';
  const emailFromQuery = searchParams.get('email') || '';
  const stateEmail = (location.state as LocationState | null)?.email || '';
  const notice = (location.state as LocationState | null)?.notice || '';

  const mode: Mode = token ? 'link' : 'otp';
  const [email, setEmail] = useState((stateEmail || emailFromQuery).toLowerCase());

  // ---- legacy link flow ----
  const [linkStatus, setLinkStatus] = useState<'verifying' | 'success' | 'error' | 'missing'>(
    token ? 'verifying' : 'missing',
  );
  const linkStarted = useRef(false);

  useEffect(() => {
    if (!token || linkStarted.current) return;
    linkStarted.current = true;
    verifyEmail(token).then((ok) => setLinkStatus(ok ? 'success' : 'error'));
  }, [token]);

  // ---- OTP flow ----
  const [code, setCode] = useState('');
  const [otpStatus, setOtpStatus] = useState<OtpStatus>('idle');
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [nowMs, setNowMs] = useState(Date.now());
  const [resending, setResending] = useState(false);
  const boxesRef = useRef<Array<HTMLInputElement | null>>([]);

  // Tick the cooldown countdown once a second while a resend lock is active.
  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  // Returning-user path: if this address is already verified, show success immediately instead
  // of asking for a code that cannot exist anymore.
  const statusChecked = useRef(false);
  useEffect(() => {
    if (mode !== 'otp' || !email || statusChecked.current) return;
    statusChecked.current = true;
    setOtpStatus('checking-status');
    getVerificationStatus(email)
      .then((verified) => setOtpStatus(verified ? 'success' : 'idle'))
      .catch(() => setOtpStatus('idle'));
  }, [mode, email]);

  const startCooldown = useCallback(() => {
    setCooldownUntil(Date.now() + RESEND_COOLDOWN_MS);
    setNowMs(Date.now());
  }, []);

  const remaining = secondsUntil(cooldownUntil, nowMs);
  const cooling = remaining > 0;

  function updateCode(next: string, focusIndex?: number) {
    const normalized = normalizeOtpInput(next);
    setCode(normalized);
    if (otpStatus === 'error') setOtpStatus('idle');
    if (focusIndex != null) {
      boxesRef.current[focusIndex]?.focus();
    }
  }

  function handleBoxChange(index: number, value: string) {
    if (value.length > 1) {
      // Paste or fast typing landed in one box: consume digits from that position onward.
      updateCode(applyOtpPaste(value, index, code), Math.min(OTP_LENGTH - 1, index + normalizeOtpInput(value).length));
      return;
    }
    const digits = code.split('');
    digits[index] = normalizeOtpInput(value)[0] ?? '';
    updateCode(digits.join(''), value && index < OTP_LENGTH - 1 ? index + 1 : index);
  }

  function handleBoxKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      e.preventDefault();
      const digits = code.split('');
      digits[index - 1] = '';
      updateCode(digits.join(''), index - 1);
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      boxesRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      e.preventDefault();
      boxesRef.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const index = Number(e.currentTarget.dataset.index ?? 0);
    updateCode(applyOtpPaste(e.clipboardData.getData('text'), index, code), Math.min(OTP_LENGTH - 1, index + 6));
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    if (otpStatus === 'submitting' || !isCompleteOtp(code) || !email) return;
    setOtpStatus('submitting');
    const ok = await verifyEmailOtp(email, code);
    if (ok) {
      setOtpStatus('success');
    } else {
      setCode('');
      setOtpStatus('error');
      boxesRef.current[0]?.focus();
    }
  }

  async function handleResend() {
    if (resending || cooling) return;
    setResending(true);
    const ok = await resendVerificationOtp(email || undefined);
    setResending(false);
    // Start the local cooldown regardless of outcome: a 429 would only come back as a toast,
    // and re-arming keeps the button honest either way.
    if (ok) startCooldown();
    else startCooldown();
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  if (mode === 'link') {
    return (
      <div className="auth-page-container">
        <div className="auth-single-card">
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <i
              className={
                linkStatus === 'success' ? 'fa-solid fa-circle-check'
                  : linkStatus === 'verifying' ? 'fa-solid fa-envelope-open-text'
                    : 'fa-solid fa-circle-exclamation'
              }
              style={{
                fontSize: 28,
                color: linkStatus === 'error' || linkStatus === 'missing' ? 'var(--danger)' : 'var(--text)',
                marginBottom: 10,
                display: 'block',
              }}
            ></i>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
              {linkStatus === 'success' ? 'Email verified'
                : linkStatus === 'verifying' ? 'Verifying your email…'
                  : 'Verification problem'}
            </h2>
          </div>

          {linkStatus === 'verifying' && (
            <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
              Just a moment while we confirm your email address.
            </p>
          )}

          {linkStatus === 'success' && (
            <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
              Your email address is confirmed and your account is now fully active.
            </p>
          )}

          {linkStatus === 'missing' && (
            <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
              This page is opened from the link in your verification email, which is missing its token.
              {' Please log in and request a new verification email.'}
            </p>
          )}

          {linkStatus === 'error' && (
            <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
              This verification link is invalid or has expired. Please log in and request a new verification email.
            </p>
          )}

          <p className="form-footer">
            <Link to="/login">Back to login</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page-container">
      <div className="auth-single-card">
        {otpStatus === 'success' ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <i className="fa-solid fa-circle-check" style={{ fontSize: 28, color: 'var(--primary)', marginBottom: 10, display: 'block' }}></i>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Email verified</h2>
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', marginBottom: 20 }}>
              Your email address is confirmed and your account is fully active. You can now sign in.
            </p>
            <button type="button" className="btn-primary w-100" onClick={() => navigate('/login', { state: { email }, replace: true })}>
              <i className="fa-solid fa-right-to-bracket"></i> Continue to login
            </button>
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <i className="fa-solid fa-envelope-circle-check" style={{ fontSize: 28, color: 'var(--primary)', marginBottom: 10, display: 'block' }}></i>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Verify your email</h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>
                {email
                  ? <>We sent a 6-digit code to <strong>{email}</strong>. Enter it below to activate your account.</>
                  : 'Enter the email you registered with and we will send a verification code.'}
              </p>
            </div>

            {notice && (
              <div
                role="status"
                style={{
                  marginBottom: 16, padding: '10px 14px', borderRadius: 8, fontSize: 13,
                  background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--primary) 30%, transparent)',
                }}
              >
                <i className="fa-solid fa-circle-info" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
                {notice}
              </div>
            )}

            {!email && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const value = new FormData(e.currentTarget).get('email');
                  if (typeof value === 'string' && value.trim()) setEmail(value.trim().toLowerCase());
                }}
                style={{ marginBottom: 16 }}
              >
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" name="email" required autoComplete="email" placeholder="you@example.com" />
                </div>
                <button type="submit" className="btn-primary w-100">
                  <i className="fa-solid fa-paper-plane"></i> Send code
                </button>
              </form>
            )}

            {email && (
              <form onSubmit={handleVerify}>
                <div
                  className="otp-inputs-wrapper"
                  style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16, width: '100%', maxWidth: '100%' }}
                  onPaste={handlePaste}
                  role="group"
                  aria-label={`Enter the ${OTP_LENGTH}-digit verification code`}
                >
                  {Array.from({ length: OTP_LENGTH }, (_, i) => (
                    <input
                      key={i}
                      ref={(el) => { boxesRef.current[i] = el; }}
                      data-index={i}
                      className="otp-box"
                      type="text"
                      inputMode="numeric"
                      autoComplete={i === 0 ? 'one-time-code' : 'off'}
                      maxLength={OTP_LENGTH}
                      aria-label={`Digit ${i + 1}`}
                      disabled={otpStatus === 'submitting' || otpStatus === 'checking-status'}
                      value={code[i] ?? ''}
                      onChange={(e) => handleBoxChange(i, e.target.value)}
                      onKeyDown={(e) => handleBoxKeyDown(i, e)}
                      style={{
                        width: '100%',
                        maxWidth: 44,
                        minWidth: 32,
                        height: 52,
                        textAlign: 'center',
                        fontSize: 20,
                        fontWeight: 700,
                        borderRadius: 8,
                        border: '1px solid var(--border, #d8dce3)',
                        padding: 0,
                      }}
                    />
                  ))}
                </div>

                {otpStatus === 'error' && (
                  <p role="alert" style={{ fontSize: 12.5, color: 'var(--danger)', textAlign: 'center', marginBottom: 12 }}>
                    Invalid or expired code. Check the digits and try again, or request a new code.
                  </p>
                )}

                <button
                  type="submit"
                  className="btn-primary w-100"
                  disabled={otpStatus === 'submitting' || otpStatus === 'checking-status' || !isCompleteOtp(code)}
                >
                  {(otpStatus === 'submitting' || otpStatus === 'checking-status') && (
                    <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
                  )}
                  {otpStatus === 'submitting' ? ' Verifying…'
                    : otpStatus === 'checking-status' ? ' Checking…'
                      : 'Verify email'}
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending || cooling}
                    style={{
                      background: 'none', border: 'none', padding: 0, cursor: (resending || cooling) ? 'default' : 'pointer',
                      fontSize: 12.5, fontWeight: 600, color: cooling || resending ? 'var(--muted)' : 'var(--primary)',
                    }}
                  >
                    {resending ? 'Sending…' : cooling ? `Resend code in ${formatCooldown(remaining)}` : 'Resend code'}
                  </button>
                  <Link to="/login" style={{ fontSize: 12.5 }}>Back to login</Link>
                </div>
              </form>
            )}
          </>
        )}

        {otpStatus !== 'success' && !email && (
          <p className="form-footer">
            Already verified? <Link to="/login">Log in here</Link>
          </p>
        )}
      </div>
    </div>
  );
}
