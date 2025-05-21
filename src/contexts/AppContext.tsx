// src/contexts/AppContext.tsx
"use client";

import type { Candidate, Job } from "@/types";
import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { useAuth } from "./AuthContext"; // To associate data with users

interface AppContextType {
  candidates: Candidate[];
  jobs: Job[];
  addCandidate: (candidateData: Omit<Candidate, "id" | "userId">) => Promise<Candidate | null>;
  addJob: (jobData: Omit<Job, "id" | "userId" | "createdAt">) => Promise<Job | null>;
  updateCandidate: (candidate: Candidate) => Promise<void>;
  getCandidateById: (id: string) => Candidate | undefined;
  getJobById: (id: string) => Job | undefined;
  loadingData: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth(); // Get current authenticated user
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const fetchData = useCallback(async (currentUserId: string) => {
    setLoadingData(true);
    try {
      // Fetch Candidates
      const candidatesQuery = query(collection(db, "candidates"), where("userId", "==", currentUserId));
      const candidatesSnapshot = await getDocs(candidatesQuery);
      const fetchedCandidates: Candidate[] = candidatesSnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          ...data,
          // Ensure nested objects like matchData are correctly typed if necessary
          matchData: data.matchData ? {
            ...data.matchData,
            jobId: data.matchData.jobId || null, // handle if jobId is not present
          } : undefined,
          interviewQuestions: data.interviewQuestions || [],
        } as Candidate;
      });
      setCandidates(fetchedCandidates);

      // Fetch Jobs
      const jobsQuery = query(collection(db, "jobs"), where("userId", "==", currentUserId));
      const jobsSnapshot = await getDocs(jobsQuery);
      const fetchedJobs: Job[] = jobsSnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          title: data.title,
          description: data.description,
          createdAt: (data.createdAt as Timestamp).toDate(), // Convert Firestore Timestamp to Date
          userId: data.userId,
        } as Job;
      });
      setJobs(fetchedJobs);

    } catch (error) {
      console.error("Error fetching data from Firestore:", error);
      // Optionally set an error state here
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchData(user.uid);
    } else {
      // Clear data if user logs out
      setCandidates([]);
      setJobs([]);
      setLoadingData(false);
    }
  }, [user, fetchData]);

  const addCandidate = async (candidateData: Omit<Candidate, "id" | "userId">): Promise<Candidate | null> => {
    if (!user) {
      console.error("User not authenticated to add candidate");
      return null;
    }
    try {
      const docRef = await addDoc(collection(db, "candidates"), {
        ...candidateData,
        userId: user.uid, // Associate candidate with the current user
      });
      const newCandidate: Candidate = { ...candidateData, id: docRef.id, userId: user.uid };
      setCandidates((prev) => [...prev, newCandidate]);
      return newCandidate;
    } catch (error) {
      console.error("Error adding candidate to Firestore:", error);
      return null;
    }
  };

  const addJob = async (jobData: Omit<Job, "id" | "userId" | "createdAt">): Promise<Job | null> => {
    if (!user) {
      console.error("User not authenticated to add job");
      return null;
    }
    try {
      const newJobWithTimestamp = {
        ...jobData,
        createdAt: Timestamp.fromDate(new Date()),
        userId: user.uid, // Associate job with the current user
      };
      const docRef = await addDoc(collection(db, "jobs"), newJobWithTimestamp);
      const newJob: Job = {
        id: docRef.id,
        title: jobData.title,
        description: jobData.description,
        createdAt: newJobWithTimestamp.createdAt.toDate(),
        userId: user.uid,
      };
      setJobs((prev) => [...prev, newJob]);
      return newJob;
    } catch (error) {
      console.error("Error adding job to Firestore:", error);
      return null;
    }
  };

  const updateCandidate = async (updatedCandidate: Candidate) => {
     if (!user || user.uid !== updatedCandidate.userId) {
      console.error("User not authenticated or not authorized to update this candidate");
      return;
    }
    try {
      const candidateRef = doc(db, "candidates", updatedCandidate.id);
      // Ensure we don't try to write undefined fields if they are optional in the type
      // but should be removed if not present for Firestore.
      const dataToUpdate = { ...updatedCandidate };
      delete (dataToUpdate as any).id; // Don't store firestore ID in the document itself

      await updateDoc(candidateRef, dataToUpdate);
      setCandidates((prev) =>
        prev.map(c => c.id === updatedCandidate.id ? updatedCandidate : c)
      );
    } catch (error) {
      console.error("Error updating candidate in Firestore:", error);
    }
  };

  const getCandidateById = (id: string) => candidates.find(c => c.id === id);
  const getJobById = (id: string) => jobs.find(j => j.id === id);

  return (
    <AppContext.Provider value={{ candidates, jobs, addCandidate, addJob, updateCandidate, getCandidateById, getJobById, loadingData }}>
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
