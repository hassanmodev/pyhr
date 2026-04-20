export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div
      className={`inline-block animate-spin rounded-full border-2 border-border border-t-primary-500 ${className}`}
    />
  );
}
