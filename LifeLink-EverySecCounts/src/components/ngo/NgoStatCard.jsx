import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const NgoStatCard = ({
  title,
  subtitle,
  value,
  icon: Icon,
  variant,
}) => {
  const variantStyles = {
    primary: {
      bg: 'bg-primary/10',
      iconBg: 'bg-primary/20',
      iconColor: 'text-primary',
      valueColor: 'text-primary',
    },
    warning: {
      bg: 'bg-warning/10',
      iconBg: 'bg-warning/20',
      iconColor: 'text-warning',
      valueColor: 'text-warning',
    },
    success: {
      bg: 'bg-success/10',
      iconBg: 'bg-success/20',
      iconColor: 'text-success',
      valueColor: 'text-success',
    },
    info: {
      bg: 'bg-blue-500/10',
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-600',
      valueColor: 'text-blue-600',
    },
  };

  const styles = variantStyles[variant] || variantStyles.primary;

  return (
    <Card className={cn("border-0 shadow-sm", styles.bg)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className={cn("text-3xl font-bold", styles.valueColor)}>
              {value}
            </p>
            <h3 className="font-semibold text-foreground mt-1">{title}</h3>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", styles.iconBg)}>
            <Icon className={cn("w-6 h-6", styles.iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NgoStatCard;