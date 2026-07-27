interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message = 'Loading…' }: LoadingSpinnerProps) {
  return (
    <div className="empty-cart">
      <i className="fa-solid fa-spinner" style={{ animation: 'spin 1s linear infinite' }}></i>
      <p>{message}</p>
    </div>
  );
}

export function PageLoadingSpinner({ message }: LoadingSpinnerProps) {
  return (
    <div className="section"><div className="container">
      <LoadingSpinner message={message} />
    </div></div>
  );
}