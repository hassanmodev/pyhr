import { useEffect, useState } from 'react';
import { UserCircle, Calendar, Briefcase, Mail, Phone, MapPin, Clock, Building2 } from 'lucide-react';
import { getMyProfile, type EmployeeOut } from '../api/employees';
import { Spinner } from '../components/ui/Spinner';

function Row({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-start gap-3">
      <Icon size={14} className="text-text-muted mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-text-muted">{label}</p>
        <p className="text-sm text-text-main">{value}</p>
      </div>
    </div>
  );
}

export function Profile() {
  const [profile, setProfile] = useState<EmployeeOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyProfile()
      .then(setProfile)
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center gap-2 text-text-muted text-sm">
      <Spinner className="w-4 h-4" /> Loading…
    </div>
  );

  if (error) return <p className="text-sm text-red-500">{error}</p>;
  if (!profile) return null;

  const hireDate = new Date(profile.hire_date).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="max-w-md">
      <h2 className="text-xl font-medium text-text-main mb-6">My Profile</h2>

      <div className="bg-surface border border-border rounded-xl p-6">
        {/* Header */}
        <div className="flex items-center gap-4 pb-5 mb-5 border-b border-border">
          <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
            <UserCircle size={26} className="text-primary-500" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-medium text-text-main truncate">{profile.full_name}</p>
            <p className="text-sm text-text-muted">{profile.title}</p>
          </div>
          <span className={`ml-auto shrink-0 text-xs px-2.5 py-0.5 rounded-full font-medium ${
            profile.status === 'active'
              ? 'bg-primary-50 text-primary-600'
              : 'bg-gray-100 text-gray-500'
          }`}>
            {profile.status}
          </span>
        </div>

        {/* Days employed */}
        <div className="flex items-center gap-2 text-sm mb-6">
          <Clock size={14} className="text-primary-500 shrink-0" />
          <span className="text-text-muted">
            <strong className="text-text-main font-medium">{profile.days_employed}</strong> days employed
          </span>
        </div>

        {/* Details */}
        <div className="space-y-4">
          <Row icon={Building2} label="Company" value={profile.company_name} />
          <Row icon={Mail} label="Email" value={profile.email} />
          <Row icon={Phone} label="Mobile" value={profile.mobile} />
          <Row icon={MapPin} label="Address" value={profile.address} />
          <Row icon={Briefcase} label="Title" value={profile.title} />
          <Row icon={Calendar} label="Hire Date" value={hireDate} />
        </div>
      </div>
    </div>
  );
}
