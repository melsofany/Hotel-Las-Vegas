import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

export function StatusBadge({ status, className }: { status: string, className?: string }) {
  const normalizedStatus = status.toLowerCase();
  
  const statusConfig: Record<string, { label: string, className: string }> = {
    available: { label: 'متاح', className: 'bg-status-available/10 text-status-available border-status-available/20' },
    occupied: { label: 'مشغول', className: 'bg-status-occupied/10 text-status-occupied border-status-occupied/20' },
    reserved: { label: 'محجوز', className: 'bg-status-reserved/10 text-status-reserved border-status-reserved/20' },
    maintenance: { label: 'صيانة', className: 'bg-status-maintenance/10 text-status-maintenance border-status-maintenance/20' },
    pending: { label: 'قيد الانتظار', className: 'bg-status-maintenance/10 text-status-maintenance border-status-maintenance/20' },
    confirmed: { label: 'مؤكد', className: 'bg-status-reserved/10 text-status-reserved border-status-reserved/20' },
    checked_in: { label: 'تم تسجيل الدخول', className: 'bg-status-checked-in/10 text-status-checked-in border-status-checked-in/20' },
    checked_out: { label: 'تم تسجيل الخروج', className: 'bg-status-checked-out/10 text-status-checked-out border-status-checked-out/20' },
    cancelled: { label: 'ملغى', className: 'bg-status-cancelled/10 text-status-cancelled border-status-cancelled/20' },
    all: { label: 'الكل', className: 'bg-muted text-muted-foreground border-border' }
  };

  const config = statusConfig[normalizedStatus] || { label: status, className: 'bg-muted text-muted-foreground' };

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', config.className, className)}>
      {config.label}
    </span>
  );
}

export function PageHeader({ title, description, action }: { title: string, description?: string, action?: ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-primary">{title}</h1>
        {description && <p className="text-muted-foreground mt-1">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function DataCard({ title, value, icon, description, valueClassName }: { title: string, value: ReactNode, icon?: ReactNode, description?: string, valueClassName?: string }) {
  return (
    <div className="bg-card border border-card-border rounded-lg p-6 shadow-sm relative overflow-hidden group">
      {/* Decorative gradient */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-medium text-muted-foreground">{title}</h3>
        {icon && <div className="text-primary/70">{icon}</div>}
      </div>
      <div className="mt-2">
        <div className={cn("text-3xl font-bold tracking-tight", valueClassName)}>{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </div>
    </div>
  );
}
