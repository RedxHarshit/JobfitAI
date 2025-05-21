// src/app/dashboard/candidates/page.tsx
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useAppContext } from '@/contexts/AppContext';
import { Users, UserPlus, Eye, FileText, Mail, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Loader } from '@/components/ui/loader';

export default function CandidatesPage() {
  const { candidates, loadingData } = useAppContext();

  if (loadingData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader size={48} />
        <p className="mt-4 text-muted-foreground">Loading candidates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
           <Users className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Candidate Profiles</h1>
        </div>
        <Button asChild>
          <Link href="/dashboard/candidates/new">
            <UserPlus className="mr-2 h-5 w-5" /> Add New Candidate
          </Link>
        </Button>
      </div>

      {candidates.length === 0 ? (
         <Card className="text-center py-12 shadow-md">
          <CardHeader>
            <Users className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <CardTitle className="text-2xl">No Candidates Added Yet</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-lg mb-6">
              Upload candidate resumes to start building your talent pool.
            </CardDescription>
            <Button asChild size="lg">
              <Link href="/dashboard/candidates/new">
                <UserPlus className="mr-2 h-5 w-5" /> Add Your First Candidate
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {candidates.map((candidate) => (
            <Card key={candidate.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Image 
                    src={`https://placehold.co/64x64.png?text=${candidate.candidateName ? candidate.candidateName[0] : 'C'}`} 
                    alt={candidate.candidateName || "Candidate"} 
                    width={64} 
                    height={64} 
                    className="rounded-full"
                    data-ai-hint="person avatar" 
                  />
                  <div>
                    <CardTitle className="text-xl">{candidate.candidateName || "N/A"}</CardTitle>
                    {candidate.email && (
                      <CardDescription className="flex items-center gap-1 text-xs">
                        <Mail size={12} /> {candidate.email}
                      </CardDescription>
                    )}
                     {candidate.phone && (
                      <CardDescription className="flex items-center gap-1 text-xs">
                        <Phone size={12} /> {candidate.phone}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-grow space-y-2">
                {candidate.resumeFileName && (
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                     <FileText size={14} /> Original file: {candidate.resumeFileName}
                  </div>
                )}
                <div>
                  <h4 className="font-semibold text-sm mb-1">Top Skills:</h4>
                  <div className="flex flex-wrap gap-1">
                    {candidate.skills.slice(0, 5).map((skill, index) => (
                      <Badge key={index} variant="secondary">{skill}</Badge>
                    ))}
                    {candidate.skills.length > 5 && <Badge variant="outline">+{candidate.skills.length - 5} more</Badge>}
                    {candidate.skills.length === 0 && <span className="text-xs text-muted-foreground">No skills listed.</span>}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/dashboard/candidates/${candidate.id}`}>
                    <Eye className="mr-2 h-4 w-4" /> View Profile
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
