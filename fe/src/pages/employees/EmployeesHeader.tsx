import { Plus, Search, X } from 'lucide-react';
import type { CompanyOut } from '../../api/companies';
import type { DeptOut } from '../../api/departments';

type Props = {
  filteredCount: number;
  totalCount: number;
  searchText: string;
  onSearchTextChange: (v: string) => void;
  filterCompanyId: string | null;
  filterDeptId: string | null;
  companies: CompanyOut[];
  departments: DeptOut[];
  onRemoveFilter: (key: 'company_id' | 'department_id') => void;
  onClearAllFilters: () => void;
  onNewEmployee: () => void;
};

export function EmployeesHeader({
  filteredCount,
  totalCount,
  searchText,
  onSearchTextChange,
  filterCompanyId,
  filterDeptId,
  companies,
  departments,
  onRemoveFilter,
  onClearAllFilters,
  onNewEmployee,
}: Props) {
  return (
    <div className="flex items-start justify-between mb-6 gap-4">
      <div className="flex-1">
        <h2 className="text-xl font-medium text-text-main">Employees</h2>
        <p className="text-sm text-text-muted mt-0.5">
          {filteredCount} of {totalCount} shown
        </p>
        <div className="relative mt-3 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchText}
            onChange={e => onSearchTextChange(e.target.value)}
            placeholder="Search by name, email, title..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
          />
          {searchText && (
            <button
              onClick={() => onSearchTextChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
        {(filterCompanyId || filterDeptId) && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {filterCompanyId && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                Company:{' '}
                {companies.find(c => c.id === Number(filterCompanyId))?.name || `#${filterCompanyId}`}
                <button
                  onClick={() => onRemoveFilter('company_id')}
                  className="ml-1 hover:text-blue-900 transition-colors cursor-pointer"
                  title="Remove company filter"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {filterDeptId && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">
                Dept:{' '}
                {departments.find(d => d.id === Number(filterDeptId))?.name || `#${filterDeptId}`}
                <button
                  onClick={() => onRemoveFilter('department_id')}
                  className="ml-1 hover:text-purple-900 transition-colors cursor-pointer"
                  title="Remove department filter"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            <button
              onClick={onClearAllFilters}
              className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-main transition-colors cursor-pointer"
              title="Clear all filters"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
      <button
        onClick={onNewEmployee}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition cursor-pointer shrink-0"
      >
        <Plus size={15} />
        New employee
      </button>
    </div>
  );
}
