export function LoadingSpinner({ label = "Loading" }: { label?: string }) {
  return (
    <span className="loading-spinner" role="status" aria-label={label}>
      <span />
    </span>
  );
}

export function PageLoader({ label = "Loading the collection" }: { label?: string }) {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <LoadingSpinner label={label} />
      <p>{label}</p>
    </div>
  );
}

export function CardSkeletons({ count = 6 }: { count?: number }) {
  return (
    <div className="skeleton-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div className="card-skeleton" key={index}>
          <span />
          <i />
          <i />
        </div>
      ))}
    </div>
  );
}
