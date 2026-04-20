import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  iconClass?: string;
}

export function StatCard({ icon: Icon, label, value, iconClass = 'text-primary-500' }: StatCardProps) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className={`mb-3 ${iconClass}`}>
        <Icon size={20} />
      </div>
      <div className="text-2xl font-semibold text-text-main">{value}</div>
      <div className="text-sm text-text-muted mt-1">{label}</div>
    </div>
  );
}
