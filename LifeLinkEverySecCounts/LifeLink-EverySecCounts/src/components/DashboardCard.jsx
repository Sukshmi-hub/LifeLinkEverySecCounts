import React from 'react';
import { cn } from '@/lib/utils';

const DashboardCard = ({
  title,
  value,
  description,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  onClick,
  className,
}) => {
  const variantStyles = {
    default: {
      card: 'bg-card border-border',
      icon: 'bg-muted text-muted-foreground',
      value: 'text-foreground',
    },
    primary: {
      card: 'bg-primary-light border-primary/20',
      icon: 'bg-primary text-primary-foreground',
      value: 'text-primary',
    },
    success: {
      card: 'bg-success-light border-success/20',
      icon: 'bg-success text-success-foreground',
      value: 'text-success',
    },
    warning: {
      card: 'bg-warning-light border-warning/20',
      icon: 'bg-warning text-warning-foreground',
      value: 'text-warning',
    },
    critical: {
      card: 'bg-critical-light border-critical/20',
      icon: 'bg-critical text-critical-foreground',
      value: 'text-critical',
    },
  };

  const styles = variantStyles[variant] || variantStyles.default;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border p-6 transition-all duration-200',
        styles.card,
        onClick && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className={cn('mt-2 text-3xl font-bold tracking-tight', styles.value)}>
            {value}
          </p>
          {(description || subtitle) && (
            <p className="mt-1 text-sm text-muted-foreground">{description || subtitle}</p>
          )}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={cn(
                  'text-xs font-medium',
                  trend.isPositive ? 'text-success' : 'text-destructive'
                )}
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-muted-foreground">from last month</span>
            </div>
          )}
        </div>
        <div className={cn('rounded-xl p-3', styles.icon)}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};

export default DashboardCard;