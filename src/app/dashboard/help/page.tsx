// src/app/dashboard/help/page.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, LifeBuoy, BookOpen, Mail } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function HelpPage() {
  const supportEmail = "harshit14012018@gmail.com";
  const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${supportEmail}&su=JobFit AI Support`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LifeBuoy className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Help & Support</h1>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Link>
        </Button>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Get Help</CardTitle>
          <CardDescription>
            Find answers to your questions and learn more about JobFit AI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>How do I upload a candidate resume?</AccordionTrigger>
              <AccordionContent>
                Navigate to the "Add Candidate" page from the sidebar. You can then drag and drop or select a resume file (PDF, DOCX, TXT). The AI will parse the resume and extract key information.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>How does the AI matching work?</AccordionTrigger>
              <AccordionContent>
                On a candidate's profile page, select the "AI Matching" tab. You can choose an existing job posting or provide a custom job description. The AI will analyze the candidate's resume against the job requirements and provide a match score and explanation.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>Can I generate interview questions?</AccordionTrigger>
              <AccordionContent>
                Yes! In the "Interview Insights" tab on a candidate's profile, you can use the AI to generate tailored interview questions based on the candidate's profile and the job context (from a matched job or custom description).
              </AccordionContent>
            </AccordionItem>
             <AccordionItem value="item-4">
              <AccordionTrigger>Is my data secure?</AccordionTrigger>
              <AccordionContent>
                We take data security seriously. Your data is stored securely using Firebase Firestore, and access is controlled based on user authentication. Ensure your Firebase project security rules are configured appropriately for production.
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><BookOpen size={20} /> Documentation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  For more detailed information, visit our comprehensive documentation site.
                </p>
                <Button variant="outline" disabled>Visit Docs (Coming Soon)</Button>
              </CardContent>
            </Card>
             <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><Mail size={20} /> Contact Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Can't find an answer? Reach out to our support team.
                </p>
                <Button asChild variant="outline">
                  <a href={gmailComposeUrl} target="_blank" rel="noopener noreferrer">
                    <Mail className="mr-2 h-4 w-4" /> Email Support via Gmail
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
