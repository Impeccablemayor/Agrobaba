interface BackendUnavailableProps {
  onRetry?: () => void;
}

/** Shown wherever the app cannot reach Spring Boot. The user is NOT treated as authenticated -
 *  the backend is the source of truth and it can't currently be reached to confirm the session. */
export function BackendUnavailable({ onRetry }: BackendUnavailableProps) {
  return (
    <div className="section">
      <div className="container">
        <div
          style={{
            minHeight: '50vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <div style={{ maxWidth: 460 }}>
            <i
              className="fa-solid fa-plug-circle-xmark"
              style={{ fontSize: 44, color: 'var(--danger)', marginBottom: 16, display: 'block' }}
            ></i>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
              Unable to connect to the server
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
              The frontend is running, but the Agro-baba backend can't be reached right now, so we
              can't verify your session. Please make sure the backend is running and try again.
            </p>
            {onRetry && (
              <button onClick={onRetry} className="btn-primary btn-inline">
                <i className="fa-solid fa-rotate-right"></i> Retry connection
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}