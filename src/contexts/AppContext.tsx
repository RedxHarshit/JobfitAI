
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
  deleteDoc,
  setDoc, // For creating/overwriting a doc with a specific ID
  Timestamp,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { useAuth } from "./AuthContext"; 

interface AppContextType {
  candidates: Candidate[]; // For HR portal, all candidates they manage
  jobs: Job[]; // All jobs, for HR and candidate viewing
  userCandidateProfile: Candidate | null; // Specific profile for the logged-in candidate
  addCandidate: (candidateData: Omit<Candidate, "id" | "userId">) => Promise<Candidate | null>; // For HR
  saveCandidateDataForUser: (userId: string, candidateData: Omit<Candidate, "id">) => Promise<Candidate | null>; // For Candidate
  addJob: (jobData: Omit<Job, "id" | "userId" | "createdAt">) => Promise<Job | null>; // For HR
  updateCandidate: (candidate: Candidate) => Promise<void>; // For HR to update any candidate
  deleteCandidate: (candidateId: string) => Promise<boolean>;
  getCandidateById: (id: string) => Candidate | undefined;
  getJobById: (id: string) => Job | undefined;
  loadingData: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth(); 
  const [candidates, setCandidates] = useState<Candidate[]>([]); // All candidates for HR
  const [userCandidateProfile, setUserCandidateProfile] = useState<Candidate | null>(null); // Logged-in candidate's own profile
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const fetchData = useCallback(async (currentAuthUser: ReturnType<typeof useAuth>['user']) => {
    setLoadingData(true);
    try {
      // Fetch all jobs (for both HR and Candidate portals)
      // Order by creation date, newest first
      const jobsQuery = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
      const jobsSnapshot = await getDocs(jobsQuery);
      const fetchedJobs: Job[] = jobsSnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          title: data.title,
          description: data.description,
          createdAt: (data.createdAt as Timestamp).toDate(), 
          userId: data.userId, // HR user who created the job
        } as Job;
      });
      setJobs(fetchedJobs);

      if (currentAuthUser) {
        // For HR: fetch candidates associated with this HR user
        // Assuming HR-created candidates have `userId` field set to HR's UID
        const hrCandidatesQuery = query(collection(db, "candidates"), where("userId", "==", currentAuthUser.uid));
        const hrCandidatesSnapshot = await getDocs(hrCandidatesQuery);
        const fetchedHrCandidates: Candidate[] = hrCandidatesSnapshot.docs.map(docSnapshot => {
          const data = docSnapshot.data();
          return {
            id: docSnapshot.id,
            ...data,
            profileLastUpdatedAt: data.profileLastUpdatedAt ? (data.profileLastUpdatedAt as Timestamp).toDate() : undefined,
            // Ensure all fields from Candidate type are present
            candidateName: data.candidateName || "N/A",
            skills: Array.isArray(data.skills) ? data.skills : [],
            experience: Array.isArray(data.experience) ? data.experience : [],
            education: Array.isArray(data.education) ? data.education : [],
            interviewQuestions: Array.isArray(data.interviewQuestions) && 
                                data.interviewQuestions.every((item: any) => typeof item === 'object' && item.category && Array.isArray(item.questions)) 
                                ? data.interviewQuestions 
                                : [],
          } as Candidate;
        });
        setCandidates(fetchedHrCandidates);

        // For Candidate: try to fetch their own profile (doc ID = auth UID)
        // This part might need refinement based on where candidate-owned profiles are stored.
        // If candidates manage their own profiles under their UID as document ID:
        const candidateProfileRef = doc(db, "candidates", currentAuthUser.uid);
        // This line needs to be adapted if candidate profiles are fetched differently.
        // For now, we'll assume candidate profiles are fetched as part of "candidates" and filtered client-side or by role.
        // For candidate-owned profile, you'd fetch doc(db, "candidates", currentAuthUser.uid)
        // And if isCandidatePortal, set `userCandidateProfile`
        // This is simplified here; actual candidate profile loading logic might differ
        // based on collection structure.
        // For now, we'll assume the candidate's profile if it exists has their auth UID as `id` AND `userId`.
        const foundUserProfile = fetchedHrCandidates.find(c => c.id === currentAuthUser.uid && c.userId === currentAuthUser.uid);
        setUserCandidateProfile(foundUserProfile || null);


      } else {
        // No user, clear HR-specific data
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
    fetchData(user); // Pass the auth user object
  }, [user, fetchData]);

  // For HR to add a new candidate profile
  const addCandidate = async (candidateData: Omit<Candidate, "id" | "userId">): Promise<Candidate | null> => {
    if (!user || !db) {
      console.error("HR User not authenticated or DB not initialized to add candidate");
      return null;
    }
    try {
      const dataToSave: Omit<Candidate, "id"> = {
        ...candidateData,
        userId: user.uid, // HR's UID as the creator/owner
        interviewQuestions: candidateData.interviewQuestions || [],
        profileLastUpdatedAt: new Date(),
      };
      const docRef = await addDoc(collection(db, "candidates"), dataToSave);
      const newCandidate: Candidate = { ...dataToSave, id: docRef.id };
      setCandidates((prev) => [...prev, newCandidate]);
      return newCandidate;
    } catch (error) {
      console.error("Error adding candidate to Firestore (HR):", error);
      return null;
    }
  };

  // For a Candidate to save/update their own profile data (doc ID is their auth UID)
  const saveCandidateDataForUser = async (candidateAuthUid: string, candidateProfileData: Omit<Candidate, "id">): Promise<Candidate | null> => {
    if (!db) {
      console.error("DB not initialized to save candidate data for user.");
      return null;
    }
    if (candidateAuthUid !== candidateProfileData.userId) {
      console.error("Mismatch between provided candidateAuthUid and userId in data.");
      return null;
    }
    try {
      const candidateDocRef = doc(db, "candidates", candidateAuthUid);
      const dataToSave = {
        ...candidateProfileData, // contains userId which is candidateAuthUid
        profileLastUpdatedAt: new Date(),
      };
      await setDoc(candidateDocRef, dataToSave, { merge: true }); // Create or merge update
      
      const updatedProfile: Candidate = { ...dataToSave, id: candidateAuthUid };
      setUserCandidateProfile(updatedProfile); // Update specific state for logged-in candidate

      // Also update the main `candidates` list if this user happens to be in it (e.g., if HR viewed them)
      // This is more relevant if HR can also view/edit candidate-owned profiles
      setCandidates(prev => {
        const existingIndex = prev.findIndex(c => c.id === candidateAuthUid);
        if (existingIndex > -1) {
          const newCandidates = [...prev];
          newCandidates[existingIndex] = updatedProfile;
          return newCandidates;
        }
        return prev; // Or add if not present, depends on desired behavior for main list
      });
      return updatedProfile;
    } catch (error) {
      console.error("Error saving candidate data to Firestore (User):", error);
      return null;
    }
  };


  const addJob = async (jobData: Omit<Job, "id" | "userId" | "createdAt">): Promise<Job | null> => {
    if (!user || !db) {
      console.error("HR User not authenticated or DB not initialized to add job");
      return null;
    }
    try {
      const newJobWithTimestamp = {
        ...jobData,
        createdAt: Timestamp.fromDate(new Date()),
        userId: user.uid, // HR's UID
      };
      const docRef = await addDoc(collection(db, "jobs"), newJobWithTimestamp);
      const newJob: Job = {
        id: docRef.id,
        title: jobData.title,
        description: jobData.description,
        createdAt: newJobWithTimestamp.createdAt.toDate(),
        userId: user.uid,
      };
      setJobs((prev) => [newJob, ...prev]); // Add to the beginning to show newest first
      return newJob;
    } catch (error) {
      console.error("Error adding job to Firestore:", error);
      return null;
    }
  };

  const updateCandidate = async (updatedCandidate: Candidate) => {
     if (!user || !db) { // Assuming only HR can update for now via this generic fn
      console.error("User not authenticated, or DB not initialized to update this candidate");
      return;
    }
    // Add authorization check if needed: e.g. if (user.uid !== updatedCandidate.userId && !isUserAdmin) return;
    try {
      const candidateRef = doc(db, "candidates", updatedCandidate.id);
      const dataToUpdate = { ...updatedCandidate };
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
    try {
      const candidateRef = doc(db, "candidates", candidateId);
      await deleteDoc(candidateRef);
      setCandidates((prev) => prev.filter(c => c.id !== candidateId));
      if (userCandidateProfile && userCandidateProfile.id === candidateId) {
        setUserCandidateProfile(null); // If candidate deleted their own profile
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
  }
  const getJobById = (id: string) => jobs.find(j => j.id === id);

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
        loadingData 
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
