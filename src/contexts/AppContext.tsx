
// src/contexts/AppContext.tsx
"use client";

import type { Candidate, Job, JobApplication } from "@/types";
import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
  Timestamp,
  query,
  where,
  orderBy,
  DocumentData,
} from "firebase/firestore";
import { useAuth } from "./AuthContext";

// Helper to convert Firestore Timestamps to Dates in nested objects
const convertTimestampsToDates = (data: DocumentData): any => {
  if (!data) return data;
  const newData: DocumentData = { ...data };
  for (const key in newData) {
    if (newData[key] instanceof Timestamp) {
      newData[key] = newData[key].toDate();
    } else if (typeof newData[key] === 'object' && newData[key] !== null) {
      // Recursively convert for nested objects, but not arrays for now
      if (!Array.isArray(newData[key])) {
          newData[key] = convertTimestampsToDates(newData[key] as DocumentData);
      }
    }
  }
  return newData;
};


interface AppContextType {
  candidates: Candidate[];
  jobs: Job[];
  userCandidateProfile: Candidate | null;
  addCandidate: (candidateData: Omit<Candidate, "id" | "userId">) => Promise<Candidate | null>;
  saveCandidateDataForUser: (userId: string, candidateData: Omit<Candidate, "id" | "userId"> & { userId: string }) => Promise<Candidate | null>;
  addJob: (jobData: Omit<Job, "id" | "userId" | "createdAt">) => Promise<Job | null>;
  updateCandidate: (candidate: Candidate) => Promise<void>;
  deleteCandidate: (candidateId: string) => Promise<boolean>;
  getCandidateById: (id: string) => Candidate | undefined;
  getJobById: (id: string) => Job | undefined;
  loadingData: boolean;
  startJobApplication: (job: Job) => Promise<string | null>; // Returns new application ID or null
  getJobApplicationById: (applicationId: string) => Promise<JobApplication | null>;
  updateJobApplication: (applicationId: string, data: Partial<JobApplication>) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [userCandidateProfile, setUserCandidateProfile] = useState<Candidate | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const fetchData = useCallback(async (currentAuthUser: ReturnType<typeof useAuth>['user']) => {
    setLoadingData(true);
    try {
      const jobsQuery = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
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

      if (currentAuthUser) {
        // Fetch HR-managed candidates
        const hrCandidatesQuery = query(collection(db, "candidates"), where("userId", "==", currentAuthUser.uid), where("id", "!=", currentAuthUser.uid));
        const hrCandidatesSnapshot = await getDocs(hrCandidatesQuery);
        const fetchedHrCandidates: Candidate[] = hrCandidatesSnapshot.docs.map(docSnapshot => {
          const data = docSnapshot.data();
          return convertTimestampsToDates({
            id: docSnapshot.id,
            ...data,
          }) as Candidate;
        });
        setCandidates(fetchedHrCandidates);

        // Fetch candidate's own profile (doc ID is their auth UID)
        const candidateProfileRef = doc(db, "candidates", currentAuthUser.uid);
        const candidateProfileSnap = await getDoc(candidateProfileRef);
        if (candidateProfileSnap.exists()) {
          setUserCandidateProfile(convertTimestampsToDates({
            id: candidateProfileSnap.id,
            ...candidateProfileSnap.data(),
            userId: currentAuthUser.uid // Ensure userId is auth UID
          }) as Candidate);
        } else {
          setUserCandidateProfile(null);
        }
      } else {
        setCandidates([]);
        setUserCandidateProfile(null);
      }

    } catch (error) {
      console.error("Error fetching data from Firestore:", error);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchData(user);
  }, [user, fetchData]);

  const addCandidate = async (candidateData: Omit<Candidate, "id" | "userId">): Promise<Candidate | null> => {
    if (!user || !db) return null;
    try {
      const dataToSave: Omit<Candidate, "id"> = {
        ...candidateData,
        userId: user.uid,
        interviewQuestions: candidateData.interviewQuestions || [],
        profileLastUpdatedAt: new Date(),
      };
      const docRef = await addDoc(collection(db, "candidates"), dataToSave);
      const newCandidate: Candidate = { ...dataToSave, id: docRef.id };
      setCandidates((prev) => [...prev, newCandidate].sort((a, b) => (b.profileLastUpdatedAt?.getTime() || 0) - (a.profileLastUpdatedAt?.getTime() || 0)));
      return newCandidate;
    } catch (error) {
      console.error("Error adding candidate to Firestore (HR):", error);
      return null;
    }
  };

  const saveCandidateDataForUser = async (candidateAuthUid: string, candidateProfileData: Omit<Candidate, "id" | "userId"> & { userId: string }): Promise<Candidate | null> => {
    if (!db) return null;
    if (candidateAuthUid !== candidateProfileData.userId) {
      console.error("Mismatch between provided candidateAuthUid and userId in data for saveCandidateDataForUser.");
      return null;
    }
    try {
      const candidateDocRef = doc(db, "candidates", candidateAuthUid);
      const dataToSave: Candidate = {
        ...candidateProfileData,
        id: candidateAuthUid, // Ensure id is set for type compatibility
        profileLastUpdatedAt: new Date(),
      };
      await setDoc(candidateDocRef, dataToSave, { merge: true });
      setUserCandidateProfile(dataToSave);
      return dataToSave;
    } catch (error) {
      console.error("Error saving candidate data to Firestore (User):", error);
      return null;
    }
  };

  const addJob = async (jobData: Omit<Job, "id" | "userId" | "createdAt">): Promise<Job | null> => {
    if (!user || !db) return null;
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
      setJobs((prev) => [newJob, ...prev].sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()));
      return newJob;
    } catch (error) {
      console.error("Error adding job to Firestore:", error);
      return null;
    }
  };

  const updateCandidate = async (updatedCandidate: Candidate) => {
    if (!user || !db) return;
    try {
      const candidateRef = doc(db, "candidates", updatedCandidate.id);
      const dataToUpdate = { ...updatedCandidate };
      if ('id' in dataToUpdate) delete (dataToUpdate as any).id;
      await updateDoc(candidateRef, dataToUpdate);
      setCandidates((prev) =>
        prev.map(c => c.id === updatedCandidate.id ? updatedCandidate : c)
      );
      if (userCandidateProfile && userCandidateProfile.id === updatedCandidate.id) {
        setUserCandidateProfile(updatedCandidate);
      }
    } catch (error) {
      console.error("Error updating candidate in Firestore:", error);
    }
  };

  const deleteCandidate = async (candidateId: string): Promise<boolean> => {
    if (!user || !db) return false;
    try {
      const candidateRef = doc(db, "candidates", candidateId);
      await deleteDoc(candidateRef);
      setCandidates((prev) => prev.filter(c => c.id !== candidateId));
      if (userCandidateProfile && userCandidateProfile.id === candidateId) {
        setUserCandidateProfile(null);
      }
      return true;
    } catch (error) {
      console.error("Error deleting candidate from Firestore:", error);
      return false;
    }
  };

  const getCandidateById = (id: string) => {
    if (userCandidateProfile && userCandidateProfile.id === id) return userCandidateProfile;
    return candidates.find(c => c.id === id);
  };
  const getJobById = (id: string) => jobs.find(j => j.id === id);

  const startJobApplication = async (job: Job): Promise<string | null> => {
    if (!user || !userCandidateProfile || !db) {
      console.error("User or candidate profile not available to start application.");
      return null;
    }
    try {
      const applicationData: Omit<JobApplication, "id"> = {
        candidateId: user.uid,
        candidateNameSnapshot: userCandidateProfile.candidateName || user.displayName || "N/A",
        candidateEmailSnapshot: userCandidateProfile.email || user.email || "N/A",
        candidateResumeTextSnapshot: userCandidateProfile.parsedText || "", // Important for AI context
        jobId: job.id,
        jobTitle: job.title,
        jobDescription: job.description,
        status: 'questionnaire_pending',
        appliedAt: Timestamp.fromDate(new Date()),
      };
      const docRef = await addDoc(collection(db, "jobApplications"), applicationData);
      return docRef.id;
    } catch (error) {
      console.error("Error starting job application:", error);
      return null;
    }
  };

  const getJobApplicationById = async (applicationId: string): Promise<JobApplication | null> => {
    if (!db) return null;
    try {
      const appRef = doc(db, "jobApplications", applicationId);
      const appSnap = await getDoc(appRef);
      if (appSnap.exists()) {
        return convertTimestampsToDates({ id: appSnap.id, ...appSnap.data() }) as JobApplication;
      }
      return null;
    } catch (error) {
      console.error("Error fetching job application:", error);
      return null;
    }
  };

  const updateJobApplication = async (applicationId: string, data: Partial<JobApplication>): Promise<boolean> => {
    if (!db) return false;
    try {
      const appRef = doc(db, "jobApplications", applicationId);
      // Convert Date objects to Timestamps for Firestore
      const dataToUpdate = { ...data };
      if (dataToUpdate.appliedAt && dataToUpdate.appliedAt instanceof Date) {
        dataToUpdate.appliedAt = Timestamp.fromDate(dataToUpdate.appliedAt);
      }
      if (dataToUpdate.questionnaireGeneratedAt && dataToUpdate.questionnaireGeneratedAt instanceof Date) {
        dataToUpdate.questionnaireGeneratedAt = Timestamp.fromDate(dataToUpdate.questionnaireGeneratedAt);
      }
      if (dataToUpdate.questionnaireCompletedAt && dataToUpdate.questionnaireCompletedAt instanceof Date) {
        dataToUpdate.questionnaireCompletedAt = Timestamp.fromDate(dataToUpdate.questionnaireCompletedAt);
      }
       if (dataToUpdate.reviewedByHrAt && dataToUpdate.reviewedByHrAt instanceof Date) {
        dataToUpdate.reviewedByHrAt = Timestamp.fromDate(dataToUpdate.reviewedByHrAt);
      }

      await updateDoc(appRef, dataToUpdate);
      return true;
    } catch (error) {
      console.error("Error updating job application:", error);
      return false;
    }
  };


  return (
    <AppContext.Provider value={{
        candidates,
        jobs,
        userCandidateProfile,
        addCandidate,
        saveCandidateDataForUser,
        addJob,
        updateCandidate,
        deleteCandidate,
        getCandidateById,
        getJobById,
        loadingData,
        startJobApplication,
        getJobApplicationById,
        updateJobApplication,
    }}>
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
