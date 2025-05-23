
// src/app/candidate/layout.tsx
import type { ReactNode } from 'react';
import { BrainCircuit } from 'lucide-react';
import Link from 'next/link';
import { AuthButton } from '@/components/auth/AuthButton'; // Candidates might also want to log out

export default function CandidateLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 sm:px-6 bg-background/80 backdrop-blur-sm border-b">
        <Link href="/candidate/dashboard" className="flex items-center gap-2">
          <BrainCircuit color="hsl(var(--primary))" style={{ width: '28px', height: '28px' }} />
          <span className="font-bold text-2xl text-primary">TalentFlow AI - Candidate Portal</span>
        </Link>
        <AuthButton /> {/* This will show user avatar & logout if logged in */}
      </header>
      <main className="flex-1 p-4 sm:p-6">
        {children}
      </main>
      <footer className="p-4 text-center text-xs text-muted-foreground border-t">
        &copy; {new Date().getFullYear()} TalentFlow AI. All rights reserved.
      </footer>
    </div>
  );
}
