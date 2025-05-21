// src/components/layout/Logo.tsx
import { BrainCircuit } from 'lucide-react';
import Link from 'next/link';

interface LogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
}

export function Logo({ className, iconSize = 28, textSize = "text-2xl" }: LogoProps) {
  return (
    <Link href="/dashboard" className={`flex items-center gap-2 ${className}`}>
      <BrainCircuit color="hsl(var(--primary))" style={{ width: `${iconSize}px`, height: `${iconSize}px` }} />
      <span className={`font-bold ${textSize} text-primary`}>TalentFlow AI</span>
    </Link>
  );
}
