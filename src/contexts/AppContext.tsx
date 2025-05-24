
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
      if (!Array.isArray(newData[key])) {
          newData[key] = convertTimestampsToDates(newData[key] as DocumentData);
      } else {
        // If it's an array, iterate and convert Timestamps within objects in the array
        newData[key] = newData[key].map((item: any) => 
          typeof item === 'object' && item !== null && !(item instanceof Timestamp) 
          ? convertTimestampsToDates(item) 
          : (item instanceof Timestamp ? item.toDate() : item)
        );
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
  const [candidates, setCandidates] = useState<Candidate[]>([]); // For HR-managed candidates
  const [userCandidateProfile, setUserCandidateProfile] = useState<Candidate | null>(null); // For logged-in candidate's own profile
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const fetchCandidateProfile = useCallback(async (currentAuthUserUid: string) => {
    const candidateProfileRef = doc(db, "candidates", currentAuthUserUid);
    const candidateProfileSnap = await getDoc(candidateProfileRef);
    if (candidateProfileSnap.exists()) {
      const profileData = convertTimestampsToDates({
        id: candidateProfileSnap.id,
        ...candidateProfileSnap.data(),
        userId: currentAuthUserUid
      }) as Candidate;
      setUserCandidateProfile(profileData);
      return profileData;
    }
    setUserCandidateProfile(null);
    return null;
  }, []);

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
        // Fetch HR-managed candidates (where userId is the HR user's UID AND candidate ID is not the HR user's UID)
        const hrCandidatesQuery = query(collection(db, "candidates"), where("userId", "==", currentAuthUser.uid));
        const hrCandidatesSnapshot = await getDocs(hrCandidatesQuery);
        const fetchedHrCandidates: Candidate[] = hrCandidatesSnapshot.docs
          .filter(docSnapshot => docSnapshot.id !== currentAuthUser.uid) // Filter out candidate's own profile if HR has same UID as a candidate doc ID
          .map(docSnapshot => {
            const data = docSnapshot.data();
            return convertTimestampsToDates({
              id: docSnapshot.id,
              ...data,
            }) as Candidate;
          });
        setCandidates(fetchedHrCandidates);

        // Fetch candidate's own profile (doc ID is their auth UID)
        await fetchCandidateProfile(currentAuthUser.uid);
      } else {
        setCandidates([]);
        setUserCandidateProfile(null);
      }

    } catch (error) {
      console.error("Error fetching data from Firestore:", error);
    } finally {
      setLoadingData(false);
    }
  }, [fetchCandidateProfile]);

  useEffect(() => {
    fetchData(user);
  }, [user, fetchData]);

  const addCandidate = async (candidateData: Omit<Candidate, "id" | "userId">): Promise<Candidate | null> => {
    if (!user || !db) return null;
    try {
      const dataToSave: Omit<Candidate, "id"> = {
        ...candidateData,
        userId: user.uid, // HR user's UID
        interviewQuestions: candidateData.interviewQuestions || [],
        profileLastUpdatedAt: new Date(),
        parsedText: candidateData.parsedText || "",
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
      const candidateDocRef = doc(db, "candidates", candidateAuthUid); // Document ID is the candidate's auth UID
      const dataToSave: Candidate = {
        ...candidateProfileData,
        id: candidateAuthUid,
        profileLastUpdatedAt: new Date(),
        parsedText: candidateProfileData.parsedText || "",
      };
      await setDoc(candidateDocRef, dataToSave, { merge: true });
      setUserCandidateProfile(dataToSave); // Update local state for the logged-in candidate
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
    if (!db) return;
    try {
      const candidateRef = doc(db, "candidates", updatedCandidate.id);
      const dataToUpdate = { ...updatedCandidate, profileLastUpdatedAt: new Date() };
      if ('id' in dataToUpdate) delete (dataToUpdate as any).id; // Firestore handles ID separately

      await updateDoc(candidateRef, dataToUpdate);
      
      // Update HR-managed candidates list
      setCandidates((prev) =>
        prev.map(c => c.id === updatedCandidate.id ? { ...updatedCandidate, profileLastUpdatedAt: (dataToUpdate.profileLastUpdatedAt as Date) } : c)
      );
      // Update candidate's own profile if it's them
      if (userCandidateProfile && userCandidateProfile.id === updatedCandidate.id) {
        setUserCandidateProfile({ ...updatedCandidate, profileLastUpdatedAt: (dataToUpdate.profileLastUpdatedAt as Date) });
      }
    } catch (error) {
      console.error("Error updating candidate in Firestore:", error);
    }
  };

  const deleteCandidate = async (candidateId: string): Promise<boolean> => {
    if (!db) return false;
    try {
      const candidateRef = doc(db, "candidates", candidateId);
      await deleteDoc(candidateRef);
      setCandidates((prev) => prev.filter(c => c.id !== candidateId));
      if (userCandidateProfile && userCandidateProfile.id === candidateId) {
        setUserCandidateProfile(null); // Candidate deleted their own profile
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
    if (!user || !db) {
      console.error("User not authenticated to start application.");
      return null;
    }
    // Ensure candidate profile is loaded before attempting to start an application
    let currentCandidateProfile = userCandidateProfile;
    if (!currentCandidateProfile) {
      currentCandidateProfile = await fetchCandidateProfile(user.uid);
    }
    if (!currentCandidateProfile || !currentCandidateProfile.parsedText) {
      console.error("Candidate profile or resume text not available to start application. Please upload/update resume.");
      // You might want to throw an error or show a toast here
      return null;
    }

    try {
      const applicationData: Omit<JobApplication, "id"> = {
        candidateId: user.uid,
        candidateNameSnapshot: currentCandidateProfile.candidateName || user.displayName || "N/A",
        candidateEmailSnapshot: currentCandidateProfile.email || user.email || "N/A",
        candidateResumeTextSnapshot: currentCandidateProfile.parsedText, // Crucial for AI
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
      const dataToUpdate = { ...data };
      // Convert Date objects to Timestamps for Firestore
      (Object.keys(dataToUpdate) as Array<keyof JobApplication>).forEach(key => {
        if (dataToUpdate[key] instanceof Date) {
          (dataToUpdate as any)[key] = Timestamp.fromDate(dataToUpdate[key] as Date);
        }
      });

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

