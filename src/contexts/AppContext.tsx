// src/contexts/AppContext.tsx
"use client";

import type { Candidate, Job, JobApplication, AIQuestion, CandidateOverallStatus, InterviewDetails } from "@/types";
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
  limit,
  // serverTimestamp, // No longer needed as we're calling API route for mail
} from "firebase/firestore";
import { useAuth } from "./AuthContext";
import { format } from "date-fns";

// Helper to convert Firestore Timestamps to Dates in nested objects
const convertTimestampsToDates = (data: DocumentData): any => {
  if (!data) return data;
  const newData: DocumentData = { ...data };
  for (const key in newData) {
    if (newData[key] instanceof Timestamp) {
      newData[key] = newData[key].toDate();
    } else if (typeof newData[key] === 'object' && newData[key] !== null && !(newData[key] instanceof Date)) {
      if (Array.isArray(newData[key])) {
        newData[key] = newData[key].map((item: any) => {
          if (item instanceof Timestamp) {
            return item.toDate();
          } else if (typeof item === 'object' && item !== null && !(item instanceof Date) && !Array.isArray(item)) {
            return convertTimestampsToDates(item);
          }
          return item;
        });
      } else {
         newData[key] = convertTimestampsToDates(newData[key] as DocumentData);
      }
    }
  }
  return newData;
};

// Function to call our Next.js API route for sending emails
const sendEmailViaApi = async (to: string, subject: string, html: string, text: string) => {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html, text }),
    });
    const result = await response.json();
    if (!response.ok) {
      console.error(`[sendEmailViaApi] Failed to send email to ${to}:`, result.error, result.details);
      return false;
    }
    console.log(`[sendEmailViaApi] Email API call successful for ${to}.`);
    return true;
  } catch (error) {
    console.error(`[sendEmailViaApi] Error calling email API for ${to}:`, error);
    return false;
  }
};


interface AppContextType {
  candidates: Candidate[];
  jobs: Job[];
  userCandidateProfile: Candidate | null;
  allJobApplications: JobApplication[];
  addCandidate: (candidateData: Omit<Candidate, "id" | "userId" | "profileLastUpdatedAt" | "overallStatus" | "overallStatusLastUpdatedAt">) => Promise<Candidate | null>;
  saveCandidateDataForUser: (userId: string, candidateData: Omit<Candidate, "id" | "userId" | "profileLastUpdatedAt" | "overallStatus" | "overallStatusLastUpdatedAt"> & { userId: string }) => Promise<Candidate | null>;
  addJob: (jobData: Omit<Job, "id" | "userId" | "createdAt">) => Promise<Job | null>;
  deleteJob: (jobId: string) => Promise<boolean>;
  updateCandidate: (candidate: Candidate) => Promise<void>;
  deleteCandidate: (candidateId: string) => Promise<boolean>;
  getCandidateById: (id: string) => Candidate | undefined;
  getJobById: (id: string) => Job | undefined;
  loadingData: boolean;
  startJobApplication: (job: Job) => Promise<{ applicationId: string | null, isNew: boolean }>;
  getJobApplicationById: (applicationId: string) => Promise<JobApplication | null>;
  updateJobApplication: (applicationId: string, data: Partial<Omit<JobApplication, 'id'>>) => Promise<boolean>;
  fetchCandidateProfile: (currentAuthUserUid: string) => Promise<Candidate | null>;
  fetchApplicationsForCandidate: (candidateId: string) => Promise<JobApplication[]>;
  fetchApplicationsForJob: (jobId: string) => Promise<JobApplication[]>;
  hrUpdateApplicationStatus: (applicationId: string, newStatus: 'accepted' | 'rejected_hr' | 'interview_scheduled', candidateEmail: string, candidateName: string, jobTitle: string, interviewDetails?: InterviewDetails) => Promise<boolean>;
  hrUpdateCandidateOverallStatus: (candidateId: string, newStatus: CandidateOverallStatus, candidateDetails: { email?: string, name?: string }) => Promise<boolean>;
  batchScheduleInterviewsForJob: (jobId: string, jobTitle: string) => Promise<{ success: boolean; count: number; message: string }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [userCandidateProfile, setUserCandidateProfile] = useState<Candidate | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [allJobApplications, setAllJobApplications] = useState<JobApplication[]>([]);
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
                // userId: currentAuthUserUid // userId should already be in data if saved correctly
            }) as Candidate;
            setUserCandidateProfile(profileData);
            console.log("[AppContext] Fetched specific candidate profile:", profileData);
            return profileData;
        }
        setUserCandidateProfile(null);
        return null;
    } catch (error) {
        console.error("[AppContext] Error fetching candidate profile:", error);
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
    console.log("[AppContext] Fetching data...");
    try {
      const jobsQuery = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
      const jobsSnapshot = await getDocs(jobsQuery);
      const fetchedJobs: Job[] = jobsSnapshot.docs.map(docSnapshot => {
        return convertTimestampsToDates({ id: docSnapshot.id, ...docSnapshot.data() }) as Job;
      });
      setJobs(fetchedJobs);
      console.log("[AppContext] Fetched jobs:", fetchedJobs.length);

      if (currentAuthUser) {
        // Fetch all candidates for HR view
        const allCandidatesQuery = query(collection(db, "candidates"), orderBy("profileLastUpdatedAt", "desc"));
        const allCandidatesSnapshot = await getDocs(allCandidatesQuery);
        const fetchedCandidatesList: Candidate[] = allCandidatesSnapshot.docs.map(docSnapshot => {
          return convertTimestampsToDates({ id: docSnapshot.id, ...docSnapshot.data() }) as Candidate;
        });
        setCandidates(fetchedCandidatesList);
        console.log("[AppContext] Fetched all candidates for HR view:", fetchedCandidatesList.length);

        // Fetch specific candidate profile if logged in user might be a candidate
        await fetchCandidateProfile(currentAuthUser.uid);

        // Fetch applications specific to the logged-in candidate (for candidate portal)
        const candidateAppsQuery = query(collection(db, "jobApplications"), where("candidateId", "==", currentAuthUser.uid), orderBy("appliedAt", "desc"));
        const candidateAppsSnapshot = await getDocs(candidateAppsQuery);
        const fetchedCandidateApps: JobApplication[] = candidateAppsSnapshot.docs.map(docSnapshot =>
            convertTimestampsToDates({ id: docSnapshot.id, ...docSnapshot.data() }) as JobApplication
        );
        setAllJobApplications(fetchedCandidateApps);
        console.log(`[AppContext] Fetched ${fetchedCandidateApps.length} job applications for candidate user ${currentAuthUser.uid}`);

      } else {
        setCandidates([]);
        setUserCandidateProfile(null);
        setAllJobApplications([]);
      }
    } catch (error) {
      console.error("[AppContext] Error fetching data from Firestore:", error);
    } finally {
      setLoadingData(false);
      console.log("[AppContext] Data fetching complete.");
    }
  }, [fetchCandidateProfile]);

  useEffect(() => {
    fetchData(user);
  }, [user, fetchData]);

  const addCandidate = useCallback(async (candidateData: Omit<Candidate, "id" | "userId" | "profileLastUpdatedAt" | "overallStatus" | "overallStatusLastUpdatedAt">): Promise<Candidate | null> => {
    if (!user || !db) return null;
    try {
      const now = new Date();
      const dataToSave: Omit<Candidate, "id"> = {
        ...candidateData,
        userId: user.uid, // HR user ID as the creator
        profileLastUpdatedAt: now,
        interviewQuestions: candidateData.interviewQuestions || [],
        parsedText: candidateData.parsedText || "",
        overallStatus: 'new',
        overallStatusLastUpdatedAt: now,
      };
      const docRef = await addDoc(collection(db, "candidates"), dataToSave);
      const newCandidate: Candidate = convertTimestampsToDates({ ...dataToSave, id: docRef.id }) as Candidate;
      setCandidates((prev) => [newCandidate, ...prev].sort((a, b) => (b.profileLastUpdatedAt?.getTime() || 0) - (a.profileLastUpdatedAt?.getTime() || 0)));
      return newCandidate;
    } catch (error) {
      console.error("[AppContext] Error adding candidate to Firestore (HR):", error);
      return null;
    }
  }, [user]);

  const saveCandidateDataForUser = useCallback(async (candidateAuthUid: string, candidateProfileData: Omit<Candidate, "id" | "userId" | "profileLastUpdatedAt" | "overallStatus" | "overallStatusLastUpdatedAt"> & { userId: string }): Promise<Candidate | null> => {
    if (!db) return null;
    if (candidateAuthUid !== candidateProfileData.userId) {
      console.error("[AppContext] Mismatch between provided candidateAuthUid and userId in data for saveCandidateDataForUser.");
      return null;
    }
    try {
      const candidateDocRef = doc(db, "candidates", candidateAuthUid);
      const existingDocSnap = await getDoc(candidateDocRef);
      const existingData = existingDocSnap.exists() ? convertTimestampsToDates(existingDocSnap.data()) as Partial<Candidate> : {} as Partial<Candidate>;
      const now = new Date();

      const dataToSave: Candidate = {
        id: candidateAuthUid, // ensure ID is part of the object to be set
        ...candidateProfileData,
        userId: candidateAuthUid,
        profileLastUpdatedAt: now,
        parsedText: candidateProfileData.parsedText || "",
        overallStatus: existingData.overallStatus || 'new',
        overallStatusLastUpdatedAt: existingData.overallStatusLastUpdatedAt ? new Date(existingData.overallStatusLastUpdatedAt.toString()) : now,
        matchData: candidateProfileData.matchData || existingData.matchData || undefined,
        interviewQuestions: candidateProfileData.interviewQuestions || existingData.interviewQuestions || [],
      };
      await setDoc(candidateDocRef, dataToSave, { merge: true });
      const finalCandidateData = convertTimestampsToDates(dataToSave) as Candidate;

      setUserCandidateProfile(finalCandidateData); // Update specific profile for candidate view
      // Update the general list of candidates as well
      setCandidates(prev => {
        const index = prev.findIndex(c => c.id === candidateAuthUid);
        if (index > -1) {
          const updatedList = [...prev];
          updatedList[index] = finalCandidateData;
          return updatedList.sort((a, b) => (new Date(b.profileLastUpdatedAt || 0).getTime()) - (new Date(a.profileLastUpdatedAt || 0).getTime()));
        }
        // If candidate wasn't in the list (e.g. new self-registration seen by HR), add them
        return [finalCandidateData, ...prev].sort((a, b) => (new Date(b.profileLastUpdatedAt || 0).getTime()) - (new Date(a.profileLastUpdatedAt || 0).getTime()));
      });
      return finalCandidateData;
    } catch (error) {
      console.error("[AppContext] Error saving candidate data to Firestore (User):", error);
      return null;
    }
  }, []);

  const addJob = useCallback(async (jobData: Omit<Job, "id" | "userId" | "createdAt">): Promise<Job | null> => {
    if (!user || !db) return null;
    try {
      const newJobWithTimestamp = {
        ...jobData,
        createdAt: new Date(),
        userId: user.uid,
      };
      const docRef = await addDoc(collection(db, "jobs"), newJobWithTimestamp);
      const newJob: Job = convertTimestampsToDates({ ...newJobWithTimestamp, id: docRef.id }) as Job;
      setJobs((prev) => [newJob, ...prev].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      return newJob;
    } catch (error) {
      console.error("[AppContext] Error adding job to Firestore:", error);
      return null;
    }
  }, [user]);

  const deleteJob = useCallback(async (jobId: string): Promise<boolean> => {
    if (!db || !user) return false;
    try {
      const jobRef = doc(db, "jobs", jobId);
      await deleteDoc(jobRef);
      setJobs((prev) => prev.filter(j => j.id !== jobId));
      return true;
    } catch (error) {
      console.error("[AppContext] Error deleting job from Firestore:", error);
      return false;
    }
  }, [user]);

  const updateCandidate = useCallback(async (updatedCandidate: Candidate) => {
    if (!db) return;
    try {
      const candidateRef = doc(db, "candidates", updatedCandidate.id);
      const dataToUpdate = { ...updatedCandidate };
      if ('id' in dataToUpdate) delete (dataToUpdate as any).id; // Firestore handles ID from doc ref

      dataToUpdate.profileLastUpdatedAt = new Date(dataToUpdate.profileLastUpdatedAt || Date.now());
      dataToUpdate.overallStatusLastUpdatedAt = new Date(dataToUpdate.overallStatusLastUpdatedAt || Date.now());

      await updateDoc(candidateRef, dataToUpdate as DocumentData);
      const finalUpdatedCandidate = convertTimestampsToDates({ ...updatedCandidate }) as Candidate;

      setCandidates((prev) =>
        prev.map(c => c.id === updatedCandidate.id ? finalUpdatedCandidate : c)
           .sort((a, b) => (new Date(b.profileLastUpdatedAt || 0).getTime()) - (new Date(a.profileLastUpdatedAt || 0).getTime()))
      );
      if (userCandidateProfile && userCandidateProfile.id === updatedCandidate.id) {
        setUserCandidateProfile(finalUpdatedCandidate);
      }
      console.log(`[AppContext] Candidate ${updatedCandidate.id} updated.`);
    } catch (error) {
      console.error("[AppContext] Error updating candidate in Firestore:", error);
    }
  }, [userCandidateProfile]);

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
      console.error("[AppContext] Error deleting candidate from Firestore:", error);
      return false;
    }
  }, [userCandidateProfile]);

  const getCandidateById = useCallback((id: string): Candidate | undefined => {
    if (userCandidateProfile && userCandidateProfile.id === id) return userCandidateProfile;
    return candidates.find(c => c.id === id);
  }, [userCandidateProfile, candidates]);

  const getJobById = useCallback((id: string) => jobs.find(j => j.id === id), [jobs]);

  const startJobApplication = useCallback(async (job: Job): Promise<{ applicationId: string | null, isNew: boolean }> => {
    if (!user || !db) {
      console.error("[AppContext] User not authenticated to start application.");
      return { applicationId: null, isNew: false };
    }

    const q = query(
      collection(db, "jobApplications"),
      where("candidateId", "==", user.uid),
      where("jobId", "==", job.id),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const existingAppId = querySnapshot.docs[0].id;
      console.log(`[AppContext] Candidate ${user.uid} has already applied for job ${job.id}. Existing application ID: ${existingAppId}`);
      return { applicationId: existingAppId, isNew: false };
    }

    let currentCandidateProfile = userCandidateProfile;
    if (!currentCandidateProfile || currentCandidateProfile.userId !== user.uid || !currentCandidateProfile.parsedText) {
      console.log("[AppContext] startJobApplication: userCandidateProfile potentially stale or missing parsedText, re-fetching...");
      currentCandidateProfile = await fetchCandidateProfile(user.uid);
    }

    if (!currentCandidateProfile || !currentCandidateProfile.parsedText) {
      console.error("[AppContext] startJobApplication: Candidate profile or full resume text (parsedText) not available. Please upload/update resume.");
      return { applicationId: null, isNew: false };
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
        appliedAt: new Date(),
        questions: [],
        answers: [],
      };
      const docRef = await addDoc(collection(db, "jobApplications"), applicationData);
      const newApp = convertTimestampsToDates({ ...applicationData, id: docRef.id }) as JobApplication;
      setAllJobApplications(prev => [...prev, newApp].sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()));
      return { applicationId: docRef.id, isNew: true };
    } catch (error) {
      console.error("[AppContext] Error starting job application:", error);
      return { applicationId: null, isNew: false };
    }
  }, [user, db, userCandidateProfile, fetchCandidateProfile]);

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
      console.error("[AppContext] Error fetching job application:", error);
      return null;
    }
  }, []);

  const updateJobApplication = useCallback(async (applicationId: string, data: Partial<Omit<JobApplication, 'id'>>): Promise<boolean> => {
    if (!db || !applicationId) return false;
    try {
      const appRef = doc(db, "jobApplications", applicationId);
      let dataToUpdate = { ...data };

      const dateFields: (keyof JobApplication)[] = ['appliedAt', 'questionnaireGeneratedAt', 'questionnaireCompletedAt', 'reviewedByHrAt'];
      dateFields.forEach(field => {
        const value = dataToUpdate[field];
        if (value && value instanceof Date) {
          (dataToUpdate as any)[field] = value; // Keep as Date, Firestore will convert
        } else if (value && !(value instanceof Date) && typeof value !== 'string') { // Handle Timestamps from Firestore
          try {
            (dataToUpdate as any)[field] = new Date((value as any).seconds * 1000 + (value as any).nanoseconds / 1000000);
          } catch (e) {
            console.warn(`Could not convert ${String(field)} to Date:`, value);
          }
        }
      });
      
      if (dataToUpdate.interviewDetails && dataToUpdate.interviewDetails.date && typeof dataToUpdate.interviewDetails.date !== 'string') {
         dataToUpdate.interviewDetails.date = format(new Date(dataToUpdate.interviewDetails.date.toString()), "PPP");
      }


      await updateDoc(appRef, dataToUpdate as DocumentData);
      setAllJobApplications(prev => prev.map(app => app.id === applicationId ? convertTimestampsToDates({ ...app, ...data, id: applicationId }) as JobApplication : app)
        .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()));
      return true;
    } catch (error) {
      console.error("[AppContext] Error updating job application:", error);
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
      console.log(`[AppContext] fetchApplicationsForCandidate for ${candidateId} found ${querySnapshot.docs.length} applications.`);
      return querySnapshot.docs.map(docSnapshot => convertTimestampsToDates({ id: docSnapshot.id, ...docSnapshot.data() }) as JobApplication);
    } catch (error) {
      console.error("[AppContext] Error fetching applications for candidate:", error);
      return [];
    }
  }, []);

  const fetchApplicationsForJob = useCallback(async (jobId: string): Promise<JobApplication[]> => {
    if (!db) return [];
    try {
      const q = query(
        collection(db, "jobApplications"),
        where("jobId", "==", jobId),
        orderBy("appliedAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(docSnapshot => convertTimestampsToDates({ id: docSnapshot.id, ...docSnapshot.data() }) as JobApplication);
    } catch (error) {
      console.error("[AppContext] Error fetching applications for job:", error);
      return [];
    }
  }, []);

 const hrUpdateCandidateOverallStatus = useCallback(async (
    candidateId: string,
    newStatus: CandidateOverallStatus,
    candidateDetails: { email?: string, name?: string }
  ): Promise<boolean> => {
    if (!db || !user) return false;
    console.log(`[AppContext] hrUpdateCandidateOverallStatus called for candidate ${candidateId} to status ${newStatus}`);
    try {
      const candidateRef = doc(db, "candidates", candidateId);
      const now = new Date();
      const statusUpdateData: Partial<Candidate> = {
        overallStatus: newStatus,
        overallStatusLastUpdatedAt: now,
      };
      await updateDoc(candidateRef, statusUpdateData as DocumentData);
      setCandidates(prev => prev.map(c => c.id === candidateId ? convertTimestampsToDates({...c, ...statusUpdateData, id: candidateId }) as Candidate : c)
          .sort((a, b) => (new Date(b.profileLastUpdatedAt || 0).getTime()) - (new Date(a.profileLastUpdatedAt || 0).getTime()))
      );

      const candidateName = candidateDetails.name || "Candidate";
      const candidateEmail = candidateDetails.email;
      let mailSubject = "";
      let mailBody = "";
      let plainTextBody = "";

      if (candidateEmail) {
        switch (newStatus) {
          case 'contacted':
            mailSubject = `Following Up: JobFit AI`;
            mailBody = `<p>Dear ${candidateName},</p><p>This is a follow-up regarding your profile with JobFit AI. We're impressed with your background and would like to discuss potential opportunities. Please let us know your availability for a brief chat.</p><p>Best regards,<br/>The JobFit AI Team</p>`;
            plainTextBody = `Dear ${candidateName},\n\nThis is a follow-up regarding your profile with JobFit AI. We're impressed with your background and would like to discuss potential opportunities. Please let us know your availability for a brief chat.\n\nBest regards,\nThe JobFit AI Team`;
            break;
          case 'offer_extended':
            mailSubject = `Congratulations: Offer from JobFit AI`;
            mailBody = `<p>Dear ${candidateName},</p><p>We are delighted to extend an offer of employment to you! Details of the offer will be sent in a separate communication. We are very excited about the possibility of you joining our team.</p><p>Best regards,<br/>The JobFit AI Team</p>`;
            plainTextBody = `Dear ${candidateName},\n\nWe are delighted to extend an offer of employment to you! Details of the offer will be sent in a separate communication. We are very excited about the possibility of you joining our team.\n\nBest regards,\nThe JobFit AI Team`;
            break;
          case 'hired':
            mailSubject = `Welcome to JobFit AI!`;
            mailBody = `<p>Dear ${candidateName},</p><p>Welcome aboard! We are thrilled to have you join the JobFit AI team. Your onboarding details will follow shortly.</p><p>Best regards,<br/>The JobFit AI Team</p>`;
            plainTextBody = `Dear ${candidateName},\n\nWelcome aboard! We are thrilled to have you join the JobFit AI team. Your onboarding details will follow shortly.\n\nBest regards,\nThe JobFit AI Team`;
            break;
          case 'rejected_overall':
            mailSubject = `Update on Your Profile with JobFit AI`;
            mailBody = `<p>Dear ${candidateName},</p><p>Thank you for your interest in JobFit AI. After careful consideration of your overall profile by our team, we have decided to pursue other candidates at this time.</p><p>We appreciate your time and wish you the best in your career endeavors.</p><p>Sincerely,<br/>The JobFit AI Team</p>`;
            plainTextBody = `Dear ${candidateName},\n\nThank you for your interest in JobFit AI. After careful consideration of your overall profile by our team, we have decided to pursue other candidates at this time.\n\nWe appreciate your time and wish you the best in your career endeavors.\n\nSincerely,\nThe JobFit AI Team`;
            break;
        }

        if (mailSubject && mailBody && plainTextBody) {
           await sendEmailViaApi(candidateEmail, mailSubject, mailBody, plainTextBody);
        }
      }
      return true;
    } catch (error) {
      console.error("[AppContext] Error updating candidate overall status by HR:", error);
      return false;
    }
  }, [user]);

  const hrUpdateApplicationStatus = useCallback(async (
    applicationId: string,
    newStatus: 'accepted' | 'rejected_hr' | 'interview_scheduled',
    candidateEmail: string,
    candidateName: string,
    jobTitle: string,
    interviewDetails?: InterviewDetails
  ): Promise<boolean> => {
    if (!db || !user ) return false;
    console.log(`[AppContext] hrUpdateApplicationStatus called for app ${applicationId} to status ${newStatus}`);
    try {
      const appRef = doc(db, "jobApplications", applicationId);
      const updateData: Partial<JobApplication> = {
        status: newStatus,
        reviewedByHrAt: new Date(),
      };
      if (newStatus === 'interview_scheduled' && interviewDetails) {
        updateData.interviewDetails = interviewDetails;
      }

      await updateDoc(appRef, updateData as DocumentData);

      const appDocSnap = await getDoc(appRef);
      let candidateIdToUpdate: string | null = null;
      if (appDocSnap.exists()) {
        const appData = appDocSnap.data();
        candidateIdToUpdate = appData?.candidateId;
      }

      if (newStatus === 'interview_scheduled' && candidateIdToUpdate) {
        await hrUpdateCandidateOverallStatus(candidateIdToUpdate, 'interview_scheduled', { email: candidateEmail, name: candidateName });
      }


      let mailSubject = "";
      let mailBody = "";
      let plainTextBody = "";

      if (newStatus === 'interview_scheduled' && interviewDetails) {
           mailSubject = `Interview Scheduled: ${jobTitle} at JobFit AI`;
           mailBody = `<p>Dear ${candidateName},</p><p>We're pleased to invite you for an interview for the ${jobTitle} position!</p><p><b>Interview Details:</b><br/>Date: ${interviewDetails.date}<br/>Time: ${interviewDetails.time}${interviewDetails.notes ? `<br/>Notes: ${interviewDetails.notes}` : ''}</p><p>Our recruitment team will be in touch if any further instructions are needed. Please confirm your availability.</p><p>Best regards,<br/>The JobFit AI Team</p>`;
           plainTextBody = `Dear ${candidateName},\n\nWe're pleased to invite you for an interview for the ${jobTitle} position!\n\nInterview Details:\nDate: ${interviewDetails.date}\nTime: ${interviewDetails.time}\n${interviewDetails.notes ? `Notes: ${interviewDetails.notes}\n` : ''}\nOur recruitment team will be in touch if any further instructions are needed. Please confirm your availability.\n\nBest regards,\nThe JobFit AI Team`;
      } else if (newStatus === 'accepted') {
          mailSubject = `Your Application for ${jobTitle} at JobFit AI has Progressed!`;
          mailBody = `<p>Dear ${candidateName},</p><p>We are thrilled to inform you that your application for the ${jobTitle} position has been accepted and is moving to the next stage!</p><p>Our recruitment team will be in touch shortly with more details.</p><p>Congratulations!</p><p>Best regards,<br/>The JobFit AI Team</p>`;
          plainTextBody = `Dear ${candidateName},\n\nWe are thrilled to inform you that your application for the ${jobTitle} position has been accepted and is moving to the next stage!\n\nOur recruitment team will be in touch shortly with more details.\n\nCongratulations!\n\nBest regards,\nThe JobFit AI Team`;
      } else if (newStatus === 'rejected_hr') {
        mailSubject = `Update on Your Application for ${jobTitle} at JobFit AI`;
        mailBody = `<p>Dear ${candidateName},</p><p>Thank you for your interest in the ${jobTitle} position and for taking the time with our application process.</p><p>After careful review by our HR team, we have decided to move forward with other candidates whose qualifications and experience more closely match the current requirements for this specific role at this time.</p><p>We appreciate your effort and wish you the best in your job search.</p><p>Sincerely,<br/>The JobFit AI Team</p>`;
        plainTextBody = `Dear ${candidateName},\n\nThank you for your interest in the ${jobTitle} position and for taking the time with our application process.\n\nAfter careful review by our HR team, we have decided to move forward with other candidates whose qualifications and experience more closely match the current requirements for this specific role at this time.\n\nWe appreciate your effort and wish you the best in your job search.\n\nSincerely,\nThe JobFit AI Team`;
      }

      if (mailSubject && mailBody && plainTextBody && candidateEmail) {
         await sendEmailViaApi(candidateEmail, mailSubject, mailBody, plainTextBody);
      }
      return true;
    } catch (error) {
      console.error("[AppContext] Error updating application status by HR:", error);
      return false;
    }
  }, [user, hrUpdateCandidateOverallStatus]);


  const batchScheduleInterviewsForJob = useCallback(async (
    jobId: string,
    jobTitle: string
  ): Promise<{ success: boolean; count: number; message: string }> => {
    if (!db || !user) {
      return { success: false, count: 0, message: "User not authenticated." };
    }
    console.log(`[AppContext] Starting batch schedule for job ID: ${jobId}`);
    try {
      const q = query(
        collection(db, "jobApplications"),
        where("jobId", "==", jobId),
        where("status", "==", "under_review_hr"),
        orderBy("appliedAt", "asc"),
        limit(10) // Limit to 10 candidates for batch scheduling
      );
      const querySnapshot = await getDocs(q);
      const eligibleApps = querySnapshot.docs.map(docSnap => convertTimestampsToDates({ id: docSnap.id, ...docSnap.data() }) as JobApplication);

      if (eligibleApps.length === 0) {
        return { success: true, count: 0, message: "No applications found in 'Under HR Review' status for this job." };
      }

      let scheduledCount = 0;
      let interviewDateTime = new Date(); // Schedule for today
      interviewDateTime.setHours(9, 0, 0, 0); // Start at 9:00 AM

      for (const app of eligibleApps) {
        if (scheduledCount >= 10) break; // Max 10 per batch
        if (interviewDateTime.getHours() >= 17) break; // Don't schedule past 5 PM (last slot 4:30 PM)

        const formattedDate = format(interviewDateTime, "PPP"); // e.g., Oct 26, 2023
        const formattedTime = format(interviewDateTime, "p"); // e.g., 9:00 AM

        const details: InterviewDetails = {
          date: formattedDate,
          time: formattedTime,
          notes: `Automated first-round interview slot for ${jobTitle}.`,
        };

        const updateSuccess = await hrUpdateApplicationStatus(
          app.id,
          'interview_scheduled',
          app.candidateEmailSnapshot || "",
          app.candidateNameSnapshot || "",
          jobTitle,
          details
        );

        if (updateSuccess) {
          scheduledCount++;
        }
        // Increment time for the next slot
        interviewDateTime.setMinutes(interviewDateTime.getMinutes() + 30);
      }
      console.log(`[AppContext] Batch schedule complete for job ID: ${jobId}. Scheduled ${scheduledCount} interviews.`);
      return { success: true, count: scheduledCount, message: `Successfully scheduled ${scheduledCount} interviews.` };
    } catch (error: any) {
      console.error("[AppContext] Error batch scheduling interviews:", error);
      return { success: false, count: 0, message: `Failed to schedule interviews: ${error.message}` };
    }
  }, [user, hrUpdateApplicationStatus]);


  const contextValue: AppContextType = {
      candidates,
      jobs,
      userCandidateProfile,
      allJobApplications,
      addCandidate,
      saveCandidateDataForUser,
      addJob,
      deleteJob,
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
      fetchApplicationsForJob,
      hrUpdateApplicationStatus,
      hrUpdateCandidateOverallStatus,
      batchScheduleInterviewsForJob,
  };

  return (
    <AppContext.Provider value={contextValue}>
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
