import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Wider panel + padding for dense forms (default: compact dialogs). */
  size?: 'sm' | 'lg';
}

const panelBySize: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm p-6',
  lg: 'max-w-lg p-7',
};

export function Modal({ title, onClose, children, size = 'sm' }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className={`bg-surface border border-border rounded-xl shadow-lg w-full ${panelBySize[size]}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-medium text-text-main">{title}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-main transition-colors">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
