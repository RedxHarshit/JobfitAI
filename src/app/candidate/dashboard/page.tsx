
// src/app/candidate/dashboard/page.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader } from '@/components/ui/loader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button'; // For potential actions
import Link from 'next/link'; // For potential links

export default function CandidateDashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/candidate/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Welcome, {user.displayName || user.email || 'Candidate'}!</CardTitle>
          <CardDescription className="text-lg">
            This is your candidate dashboard. Manage your applications and profile here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Your profile information and application statuses will appear here.</p>
          {/* Example action:
          <div className="mt-6">
            <Button asChild>
              <Link href="/candidate/applications">View My Applications</Link>
            </Button>
          </div>
          */}
        </CardContent>
      </Card>
      {/* More content for the candidate dashboard can be added here */}
    </div>
  );
}
