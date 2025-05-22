
// src/contexts/AppContext.tsx
"use client";

import type { Candidate, Job, InterviewQuestionCategory } from "@/types";
import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc, // Added for delete functionality
  Timestamp,
  query,
  where,
  // writeBatch, // Not currently used, can be removed if not planned
} from "firebase/firestore";
import { useAuth } from "./AuthContext"; 

interface AppContextType {
  candidates: Candidate[];
  jobs: Job[];
  addCandidate: (candidateData: Omit<Candidate, "id" | "userId">) => Promise<Candidate | null>;
  addJob: (jobData: Omit<Job, "id" | "userId" | "createdAt">) => Promise<Job | null>;
  updateCandidate: (candidate: Candidate) => Promise<void>;
  deleteCandidate: (candidateId: string) => Promise<boolean>; // Added for delete
  getCandidateById: (id: string) => Candidate | undefined;
  getJobById: (id: string) => Job | undefined;
  loadingData: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth(); 
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const fetchData = useCallback(async (currentUserId: string) => {
    setLoadingData(true);
    try {
      const candidatesQuery = query(collection(db, "candidates"), where("userId", "==", currentUserId));
      const candidatesSnapshot = await getDocs(candidatesQuery);
      const fetchedCandidates: Candidate[] = candidatesSnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          candidateName: data.candidateName || "N/A",
          email: data.email,
          phone: data.phone,
          skills: Array.isArray(data.skills) ? data.skills : [],
          experience: Array.isArray(data.experience) ? data.experience : [],
          education: Array.isArray(data.education) ? data.education : [],
          resumeFileName: data.resumeFileName,
          parsedText: data.parsedText,
          matchData: data.matchData ? {
            ...data.matchData,
            jobId: data.matchData.jobId || null,
          } : undefined,
          interviewQuestions: Array.isArray(data.interviewQuestions) && 
                              data.interviewQuestions.every((item: any) => typeof item === 'object' && item.category && Array.isArray(item.questions)) 
                              ? data.interviewQuestions 
                              : [], // Ensure correct type or default
          userId: data.userId,
        } as Candidate;
      });
      setCandidates(fetchedCandidates);

      const jobsQuery = query(collection(db, "jobs"), where("userId", "==", currentUserId));
      const jobsSnapshot = await getDocs(jobsQuery);
      const fetchedJobs: Job[] = jobsSnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          title: data.title,
          description: data.description,
          createdAt: (data.createdAt as Timestamp).toDate(), 
          userId: data.userId,
        } as Job;
      });
      setJobs(fetchedJobs);

    } catch (error) {
      console.error("Error fetching data from Firestore:", error);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchData(user.uid);
    } else {
      setCandidates([]);
      setJobs([]);
      setLoadingData(false);
    }
  }, [user, fetchData]);

  const addCandidate = async (candidateData: Omit<Candidate, "id" | "userId">): Promise<Candidate | null> => {
    if (!user || !db) {
      console.error("User not authenticated or DB not initialized to add candidate");
      return null;
    }
    try {
      const dataToSave = {
        ...candidateData,
        userId: user.uid,
        interviewQuestions: candidateData.interviewQuestions || [], // ensure default if undefined
      };
      const docRef = await addDoc(collection(db, "candidates"), dataToSave);
      const newCandidate: Candidate = { ...dataToSave, id: docRef.id };
      setCandidates((prev) => [...prev, newCandidate]);
      return newCandidate;
    } catch (error) {
      console.error("Error adding candidate to Firestore:", error);
      return null;
    }
  };

  const addJob = async (jobData: Omit<Job, "id" | "userId" | "createdAt">): Promise<Job | null> => {
    if (!user || !db) {
      console.error("User not authenticated or DB not initialized to add job");
      return null;
    }
    try {
      const newJobWithTimestamp = {
        ...jobData,
        createdAt: Timestamp.fromDate(new Date()),
        userId: user.uid, 
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
     if (!user || user.uid !== updatedCandidate.userId || !db) {
      console.error("User not authenticated, not authorized, or DB not initialized to update this candidate");
      return;
    }
    try {
      const candidateRef = doc(db, "candidates", updatedCandidate.id);
      const dataToUpdate = { ...updatedCandidate };
      // Firestore ID should not be part of the document data itself
      if ('id' in dataToUpdate) delete (dataToUpdate as any).id; 
      
      await updateDoc(candidateRef, dataToUpdate);
      setCandidates((prev) =>
        prev.map(c => c.id === updatedCandidate.id ? updatedCandidate : c)
      );
    } catch (error) {
      console.error("Error updating candidate in Firestore:", error);
    }
  };

  const deleteCandidate = async (candidateId: string): Promise<boolean> => {
    if (!user || !db) {
      console.error("User not authenticated or DB not initialized to delete candidate");
      return false;
    }
    // Optional: Add an ownership check here if needed, though Firestore rules should handle it
    // const candidateToDelete = candidates.find(c => c.id === candidateId);
    // if (candidateToDelete && candidateToDelete.userId !== user.uid) {
    //   console.error("User not authorized to delete this candidate.");
    //   return false;
    // }
    try {
      const candidateRef = doc(db, "candidates", candidateId);
      await deleteDoc(candidateRef);
      setCandidates((prev) => prev.filter(c => c.id !== candidateId));
      return true;
    } catch (error) {
      console.error("Error deleting candidate from Firestore:", error);
      return false;
    }
  };

  const getCandidateById = (id: string) => candidates.find(c => c.id === id);
  const getJobById = (id: string) => jobs.find(j => j.id === id);

  return (
    <AppContext.Provider value={{ candidates, jobs, addCandidate, addJob, updateCandidate, deleteCandidate, getCandidateById, getJobById, loadingData }}>
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

    