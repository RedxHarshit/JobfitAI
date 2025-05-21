// src/contexts/AppContext.tsx
"use client";

import type { Candidate, Job } from "@/types";
import { createContext, useContext, useState, ReactNode } from "react";

interface AppContextType {
  candidates: Candidate[];
  jobs: Job[];
  addCandidate: (candidate: Candidate) => void;
  addJob: (job: Job) => void;
  updateCandidate: (candidate: Candidate) => void;
  getCandidateById: (id: string) => Candidate | undefined;
  getJobById: (id: string) => Job | undefined;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  const addCandidate = (candidate: Candidate) => {
    setCandidates((prev) => [...prev, candidate]);
  };

  const addJob = (job: Job) => {
    setJobs((prev) => [...prev, job]);
  };

  const updateCandidate = (updatedCandidate: Candidate) => {
    setCandidates((prev) => 
      prev.map(c => c.id === updatedCandidate.id ? updatedCandidate : c)
    );
  };

  const getCandidateById = (id: string) => candidates.find(c => c.id === id);
  const getJobById = (id: string) => jobs.find(j => j.id === id);

  return (
    <AppContext.Provider value={{ candidates, jobs, addCandidate, addJob, updateCandidate, getCandidateById, getJobById }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
