// src/app/dashboard/page.tsx
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, Users, Briefcase, FileText, BarChart3, Sparkles } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import Image from 'next/image';

export default function DashboardPage() {
  const { candidates, jobs } = useAppContext();

  const stats = [
    { title: "Total Candidates", value: candidates.length, icon: Users, color: "text-primary" },
    { title: "Total Jobs Posted", value: jobs.length, icon: Briefcase, color: "text-accent-foreground" },
    // Add more relevant stats as app evolves
  ];

  const actions = [
    { href: "/dashboard/candidates/new", label: "Upload Resume", icon: UploadCloud, description: "Parse and add a new candidate." },
    { href: "/dashboard/jobs/new", label: "Post New Job", icon: FileText, description: "Create a new job listing." },
    { href: "/dashboard/candidates", label: "View Candidates", icon: Users, description: "Browse all candidate profiles." },
    { href: "/dashboard/jobs", label: "Manage Jobs", icon: Briefcase, description: "View and manage job postings." },
  ];

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Welcome to TalentFlow AI</CardTitle>
          <CardDescription className="text-lg">
            Streamline your recruitment process with the power of AI.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6 items-center">
          <div>
            <p className="mb-6 text-muted-foreground leading-relaxed">
              TalentFlow AI helps you find the best talent faster by leveraging artificial intelligence for resume parsing, candidate matching, and interview preparation. Get started by uploading a resume or posting a new job.
            </p>
            <div className="flex gap-4">
              <Button asChild size="lg">
                <Link href="/dashboard/candidates/new">
                  <UploadCloud className="mr-2 h-5 w-5" /> Upload Resume
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/dashboard/jobs/new">
                  <FileText className="mr-2 h-5 w-5" /> Post Job
                </Link>
              </Button>
            </div>
          </div>
          <div className="hidden md:flex justify-center">
            <Image 
              src="https://placehold.co/400x300.png" 
              alt="AI Recruitment Illustration" 
              width={400} 
              height={300} 
              className="rounded-lg shadow-md"
              data-ai-hint="recruitment technology"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
         <Card className="shadow-md hover:shadow-lg transition-shadow col-span-2 lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Powered Insights</CardTitle>
              <Sparkles className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Leverage AI for resume parsing, candidate matching, and generating interview questions.
              </p>
            </CardContent>
          </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {actions.map((action) => (
          <Card key={action.label} className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <action.icon className="h-8 w-8 text-primary" />
                <CardTitle>{action.label}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{action.description}</p>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href={action.href}>Go to {action.label}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
