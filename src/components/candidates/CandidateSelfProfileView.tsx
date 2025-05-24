
// src/components/candidates/CandidateSelfProfileView.tsx
"use client";

import type { Candidate } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { UserCircle, FileText, Mail, Phone, GraduationCap, Briefcase, Sparkles } from "lucide-react";
import Image from "next/image";
import { format } from 'date-fns';

interface CandidateSelfProfileViewProps {
  candidate: Candidate;
}

export function CandidateSelfProfileView({ candidate }: CandidateSelfProfileViewProps) {
  return (
    <div className="space-y-6">
      <Card className="shadow-md overflow-hidden">
        <CardHeader className="bg-muted/30 p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Image
              src={`https://placehold.co/100x100.png?text=${candidate.candidateName ? candidate.candidateName[0] : 'C'}`}
              alt={candidate.candidateName || "Candidate"}
              width={100}
              height={100}
              className="rounded-full border-4 border-background shadow-md"
              data-ai-hint="person avatar"
            />
            <div className="text-center sm:text-left">
              <CardTitle className="text-2xl font-bold">{candidate.candidateName || "N/A"}</CardTitle>
              {candidate.email && (
                <CardDescription className="text-md flex items-center justify-center sm:justify-start gap-2 mt-1">
                  <Mail size={16} /> {candidate.email}
                </CardDescription>
              )}
              {candidate.phone && (
                <CardDescription className="text-sm flex items-center justify-center sm:justify-start gap-2 mt-1">
                  <Phone size={16} /> {candidate.phone}
                </CardDescription>
              )}
            </div>
          </div>
            {candidate.resumeFileName && (
                <p className="text-xs text-muted-foreground italic mt-3 text-center sm:text-right">
                    Original resume: {candidate.resumeFileName}
                </p>
            )}
            {candidate.profileLastUpdatedAt && (
                <p className="text-xs text-muted-foreground italic mt-1 text-center sm:text-right">
                    Profile last updated: {format(new Date(candidate.profileLastUpdatedAt), "PPP p")}
                </p>
            )}
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles /> Extracted Skills</CardTitle>
        </CardHeader>
        <CardContent>
          {candidate.skills && candidate.skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {candidate.skills.map((skill, i) => (
                <Badge key={i} variant="secondary" className="text-sm px-3 py-1">{skill}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No skills were extracted from your resume, or they are not yet processed.</p>
          )}
        </CardContent>
      </Card>

      <Accordion type="multiple" className="w-full space-y-3">
        {candidate.experience && candidate.experience.length > 0 && (
          <AccordionItem value="experience" className="border rounded-md shadow-sm bg-card">
            <AccordionTrigger className="text-lg font-semibold px-4 py-3 hover:no-underline flex items-center gap-2">
              <Briefcase className="text-primary"/> Experience
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-3 space-y-3">
              {candidate.experience.map((exp, i) => (
                <div key={i} className="p-3 bg-muted/50 rounded-md text-sm whitespace-pre-line border-l-2 border-primary">
                  {exp}
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        )}

        {candidate.education && candidate.education.length > 0 && (
          <AccordionItem value="education" className="border rounded-md shadow-sm bg-card">
            <AccordionTrigger className="text-lg font-semibold px-4 py-3 hover:no-underline flex items-center gap-2">
              <GraduationCap className="text-primary"/> Education
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-3 space-y-3">
              {candidate.education.map((edu, i) => (
                <div key={i} className="p-3 bg-muted/50 rounded-md text-sm whitespace-pre-line border-l-2 border-primary">
                  {edu}
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      {!candidate.experience?.length && !candidate.education?.length && !candidate.skills?.length && (
         <Card className="text-center py-8">
            <CardContent>
                <FileText size={48} className="mx-auto text-muted-foreground mb-4"/>
                <CardTitle className="text-xl mb-2">Resume Not Processed Yet?</CardTitle>
                <CardDescription>
                If you've just uploaded your resume, the information might still be processing. <br />
                Otherwise, please try uploading your resume if you haven't already.
                </CardDescription>
                <Button asChild variant="link" className="mt-2">
                    <Link href="/candidate/dashboard/resume-upload">Upload/Update Resume</Link>
                </Button>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
