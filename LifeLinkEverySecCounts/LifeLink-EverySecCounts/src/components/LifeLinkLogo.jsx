import React from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

const LifeLinkLogo = ({ 
  size = 'md', 
  showSubtext = true,
  className 
}) => {
  const sizes = {
    sm: { icon: 'w-8 h-8', iconInner: 'w-4 h-4', title: 'text-lg', subtext: 'text-[10px]' },
    md: { icon: 'w-10 h-10', iconInner: 'w-5 h-5', title: 'text-xl', subtext: 'text-xs' },
    lg: { icon: 'w-12 h-12', iconInner: 'w-6 h-6', title: 'text-2xl', subtext: 'text-sm' },
  };

  const s = sizes[size];

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Red rounded square with heart icon */}
      <div className={cn(
        "rounded-xl bg-destructive flex items-center justify-center shadow-md",
        s.icon
      )}>
        <Heart className={cn("text-white fill-white", s.iconInner)} />
      </div>
      
      {/* Text */}
      <div className="flex flex-col">
        <span className={cn("font-bold text-foreground tracking-tight leading-tight", s.title)}>
          LifeLink
        </span>
        {showSubtext && (
          <span className={cn("text-muted-foreground tracking-widest uppercase font-medium", s.subtext)}>
            Every Second Counts
          </span>
        )}
      </div>
    </div>
  );
};

export default LifeLinkLogo;