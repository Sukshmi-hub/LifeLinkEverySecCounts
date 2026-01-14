import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

const AdminStatCard = ({
  title,
  subtitle,
  value,
  icon: Icon,
  variant = 'default',
}) => {
  // Mapping variants to Tailwind CSS classes
  const variantStyles = {
    default: 'bg-card border-border',
    primary: 'bg-primary/5 border-primary/20',
    success: 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800',
    warning: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800',
    critical: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800',
  };

  const iconStyles = {
    default: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    critical: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <Card className={`border ${variantStyles[variant]} transition-shadow hover:shadow-md`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <h3 className="text-sm font-semibold text-foreground mt-1">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
          <div className={`p-3 rounded-xl ${iconStyles[variant]}`}>
            {/* Render the icon if it exists */}
            {Icon && <Icon className="h-6 w-6" />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminStatCard;