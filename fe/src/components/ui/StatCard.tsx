import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  iconClass?: string;
  /** When set, the card navigates here on click. */
  to?: string;
}

export function StatCard({ icon: Icon, label, value, iconClass = 'text-primary-500', to }: StatCardProps) {
  const body = (
    <>
      <div className={`mb-3 ${iconClass}`}>
        <Icon size={20} />
      </div>
      <div className="text-2xl font-semibold text-text-main">{value}</div>
      <div className="text-sm text-text-muted mt-1">{label}</div>
    </>
  );
  const shell =
    'bg-surface border border-border rounded-xl p-5' +
    (to ? ' transition-colors hover:border-primary-300 hover:bg-primary-50/30 cursor-pointer' : '');

  if (to) {
    return (
      <Link to={to} className={`block ${shell}`}>
        {body}
      </Link>
    );
  }
  return <div className={shell}>{body}</div>;
}
