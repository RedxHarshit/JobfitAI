// src/components/ui/loader.tsx
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoaderProps {
  size?: number;
  className?: string;
}

export function Loader({ size = 24, className }: LoaderProps) {
  return (
    <Loader2
      style={{ width: `${size}px`, height: `${size}px` }}
      className={cn('animate-spin text-primary', className)}
    />
  );
}
