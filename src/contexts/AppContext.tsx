
// src/contexts/AppContext.tsx
"use client";

import type { Candidate, Job, JobApplication, AIQuestion } from "@/types";
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
  addCandidate: (candidateData: Omit<Candidate, "id" | "userId" | "profileLastUpdatedAt">) => Promise<Candidate | null>;
  saveCandidateDataForUser: (userId: string, candidateData: Omit<Candidate, "id" | "userId" | "profileLastUpdatedAt"> & { userId: string }) => Promise<Candidate | null>;
  addJob: (jobData: Omit<Job, "id" | "userId" | "createdAt">) => Promise<Job | null>;
  updateCandidate: (candidate: Candidate) => Promise<void>;
  deleteCandidate: (candidateId: string) => Promise<boolean>;
  getCandidateById: (id: string) => Candidate | undefined;
  getJobById: (id: string) => Job | undefined;
  loadingData: boolean;
  startJobApplication: (job: Job) => Promise<string | null>;
  getJobApplicationById: (applicationId: string) => Promise<JobApplication | null>;
  updateJobApplication: (applicationId: string, data: Partial<Omit<JobApplication, 'id'>>) => Promise<boolean>;
  fetchCandidateProfile: (currentAuthUserUid: string) => Promise<Candidate | null>;
  fetchApplicationsForCandidate: (candidateId: string) => Promise<JobApplication[]>;
  hrUpdateApplicationStatus: (applicationId: string, newStatus: 'accepted' | 'rejected_hr', candidateEmail: string, candidateName: string, jobTitle: string) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [userCandidateProfile, setUserCandidateProfile] = useState<Candidate | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const fetchCandidateProfile = useCallback(async (currentAuthUserUid: string): Promise<Candidate | null> => {
    if (!db || !currentAuthUserUid) {
        setUserCandidateProfile(null);
        return null;
    }
    const candidateProfileRef = doc(db, "candidates", currentAuthUserUid);
    try {
        const candidateProfileSnap = await getDoc(candidateProfileRef);
        if (candidateProfileSnap.exists()) {
            const profileData = convertTimestampsToDates({
                id: candidateProfileSnap.id,
                ...candidateProfileSnap.data(),
                userId: currentAuthUserUid // Ensure userId is the auth UID for self-profile
            }) as Candidate;
            setUserCandidateProfile(profileData);
            return profileData;
        }
        setUserCandidateProfile(null);
        return null;
    } catch (error) {
        console.error("Error fetching candidate profile:", error);
        setUserCandidateProfile(null);
        return null;
    }
  }, []);

  const fetchData = useCallback(async (currentAuthUser: ReturnType<typeof useAuth>['user']) => {
    if (!db) {
        setLoadingData(false);
        return;
    }
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
        // Fetch ALL candidates for the HR portal view
        const allCandidatesQuery = query(collection(db, "candidates"), orderBy("profileLastUpdatedAt", "desc"));
        const allCandidatesSnapshot = await getDocs(allCandidatesQuery);
        const fetchedCandidatesList: Candidate[] = allCandidatesSnapshot.docs.map(docSnapshot => {
          return convertTimestampsToDates({
            id: docSnapshot.id,
            ...docSnapshot.data(),
          }) as Candidate;
        });
        setCandidates(fetchedCandidatesList);

        // Fetch the specific candidate profile if the logged-in user IS a candidate
        // This populates userCandidateProfile, used by the /candidate portal
        await fetchCandidateProfile(currentAuthUser.uid);
      } else {
        // No user logged in
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
    fetchData(user); // Pass user to fetchData
  }, [user, fetchData]);

  const addCandidate = useCallback(async (candidateData: Omit<Candidate, "id" | "userId" | "profileLastUpdatedAt">): Promise<Candidate | null> => {
    if (!user || !db) return null;
    try {
      const dataToSave: Omit<Candidate, "id"> = {
        ...candidateData,
        userId: user.uid, // HR's UID
        profileLastUpdatedAt: new Date(),
        interviewQuestions: candidateData.interviewQuestions || [],
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
  }, [user]);

  const saveCandidateDataForUser = useCallback(async (candidateAuthUid: string, candidateProfileData: Omit<Candidate, "id" | "userId" | "profileLastUpdatedAt"> & { userId: string }): Promise<Candidate | null> => {
    if (!db) return null;
    if (candidateAuthUid !== candidateProfileData.userId) {
      console.error("Mismatch between provided candidateAuthUid and userId in data for saveCandidateDataForUser.");
      return null;
    }
    try {
      const candidateDocRef = doc(db, "candidates", candidateAuthUid); // Doc ID is candidate's auth UID
      const dataToSave: Candidate = {
        ...candidateProfileData,
        id: candidateAuthUid, // id is candidate's auth UID
        userId: candidateAuthUid, // userId is also candidate's auth UID
        profileLastUpdatedAt: new Date(),
        parsedText: candidateProfileData.parsedText || "",
      };
      await setDoc(candidateDocRef, dataToSave, { merge: true });
      setUserCandidateProfile(dataToSave); // For immediate update in candidate's own view
      // Also update in the main candidates list for HR view consistency
      setCandidates(prev => prev.map(c => c.id === candidateAuthUid ? dataToSave : c)
                                .sort((a, b) => (b.profileLastUpdatedAt?.getTime() || 0) - (a.profileLastUpdatedAt?.getTime() || 0))
      );
      return dataToSave;
    } catch (error) {
      console.error("Error saving candidate data to Firestore (User):", error);
      return null;
    }
  }, [setUserCandidateProfile, setCandidates]); 

  const addJob = useCallback(async (jobData: Omit<Job, "id" | "userId" | "createdAt">): Promise<Job | null> => {
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
  }, [user, setJobs]); 

  const updateCandidate = useCallback(async (updatedCandidate: Candidate) => {
    if (!db) return;
    try {
      const candidateRef = doc(db, "candidates", updatedCandidate.id);
      const dataToUpdate = { ...updatedCandidate, profileLastUpdatedAt: new Date() };
      if ('id' in dataToUpdate) delete (dataToUpdate as any).id;

      await updateDoc(candidateRef, dataToUpdate);
      setCandidates((prev) =>
        prev.map(c => c.id === updatedCandidate.id ? { ...updatedCandidate, profileLastUpdatedAt: (dataToUpdate.profileLastUpdatedAt as Date) } : c)
           .sort((a, b) => (b.profileLastUpdatedAt?.getTime() || 0) - (a.profileLastUpdatedAt?.getTime() || 0))
      );
      if (userCandidateProfile && userCandidateProfile.id === updatedCandidate.id) {
        setUserCandidateProfile({ ...updatedCandidate, profileLastUpdatedAt: (dataToUpdate.profileLastUpdatedAt as Date) });
      }
    } catch (error) {
      console.error("Error updating candidate in Firestore:", error);
    }
  }, [setCandidates, userCandidateProfile, setUserCandidateProfile]);

  const deleteCandidate = useCallback(async (candidateId: string): Promise<boolean> => {
    if (!db) return false;
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
  }, [setCandidates, userCandidateProfile, setUserCandidateProfile]);

  const getCandidateById = useCallback((id: string) => {
    if (userCandidateProfile && userCandidateProfile.id === id) return userCandidateProfile;
    return candidates.find(c => c.id === id);
  }, [userCandidateProfile, candidates]);

  const getJobById = useCallback((id: string) => jobs.find(j => j.id === id), [jobs]);

  const startJobApplication = useCallback(async (job: Job): Promise<string | null> => {
    if (!user || !db) {
      console.error("User not authenticated to start application.");
      return null;
    }
    let currentCandidateProfile = userCandidateProfile;
    // If profile isn't loaded in context, or crucial parsedText is missing, try fetching fresh.
    if (!currentCandidateProfile || !currentCandidateProfile.parsedText) { 
      currentCandidateProfile = await fetchCandidateProfile(user.uid);
    }

    if (!currentCandidateProfile || !currentCandidateProfile.parsedText) {
      console.error("Candidate profile or resume text not available for application. Please upload/update resume.");
      return null;
    }

    try {
      const applicationData: Omit<JobApplication, "id"> = {
        candidateId: user.uid,
        candidateNameSnapshot: currentCandidateProfile.candidateName || user.displayName || "N/A",
        candidateEmailSnapshot: currentCandidateProfile.email || user.email || "N/A",
        candidateResumeTextSnapshot: currentCandidateProfile.parsedText,
        jobId: job.id,
        jobTitle: job.title,
        jobDescription: job.description,
        status: 'questionnaire_pending',
        appliedAt: Timestamp.fromDate(new Date()),
        questions: [], 
        answers: [],   
      };
      const docRef = await addDoc(collection(db, "jobApplications"), applicationData);
      return docRef.id;
    } catch (error) {
      console.error("Error starting job application:", error);
      return null;
    }
  }, [user, userCandidateProfile, fetchCandidateProfile]);

  const getJobApplicationById = useCallback(async (applicationId: string): Promise<JobApplication | null> => {
    if (!db || !applicationId) return null;
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
  }, []); 

  const updateJobApplication = useCallback(async (applicationId: string, data: Partial<Omit<JobApplication, 'id'>>): Promise<boolean> => {
    if (!db || !applicationId) return false;
    try {
      const appRef = doc(db, "jobApplications", applicationId);
      const dataToUpdate = { ...data };
      (Object.keys(dataToUpdate) as Array<keyof typeof dataToUpdate>).forEach(key => {
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
  }, []); 

  const fetchApplicationsForCandidate = useCallback(async (candidateId: string): Promise<JobApplication[]> => {
    if (!db) return [];
    try {
      const q = query(
        collection(db, "jobApplications"),
        where("candidateId", "==", candidateId),
        orderBy("appliedAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(docSnapshot => convertTimestampsToDates({ id: docSnapshot.id, ...docSnapshot.data() }) as JobApplication);
    } catch (error) {
      console.error("Error fetching applications for candidate:", error);
      return [];
    }
  }, []);

  const hrUpdateApplicationStatus = useCallback(async (
    applicationId: string,
    newStatus: 'accepted' | 'rejected_hr',
    candidateEmail: string,
    candidateName: string,
    jobTitle: string
  ): Promise<boolean> => {
    if (!db) return false;
    try {
      const appRef = doc(db, "jobApplications", applicationId);
      await updateDoc(appRef, {
        status: newStatus,
        reviewedByHrAt: Timestamp.fromDate(new Date()),
      });

      // Simulate email
      let emailSubject = "";
      let emailBody = "";
      if (newStatus === 'accepted') {
        emailSubject = `Congratulations on your application for ${jobTitle}!`;
        emailBody = `Dear ${candidateName},\n\nWe are pleased to inform you that your application for the ${jobTitle} position has been successful! We will be in touch shortly with the next steps.\n\nBest regards,\nTalentFlow AI Team`;
        console.log(`[AppContext] Simulating ACCEPTANCE email to ${candidateEmail}. Subject: ${emailSubject}`);
      } else if (newStatus === 'rejected_hr') {
        emailSubject = `Update on your application for ${jobTitle}`;
        emailBody = `Dear ${candidateName},\n\nThank you for your interest in the ${jobTitle} position. After careful consideration, we have decided to move forward with other candidates whose qualifications more closely match the requirements of this role at this time.\n\nWe appreciate you taking the time to apply and wish you the best in your job search.\n\nBest regards,\nTalentFlow AI Team`;
        console.log(`[AppContext] Simulating REJECTION email to ${candidateEmail}. Subject: ${emailSubject}`);
      }
      console.log("Email body for simulation:\n", emailBody);

      return true;
    } catch (error) {
      console.error("Error updating application status by HR:", error);
      return false;
    }
  }, []);


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
        fetchCandidateProfile,
        fetchApplicationsForCandidate,
        hrUpdateApplicationStatus,
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

