
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
} from "firebase/firestore";
import { useAuth } from "./AuthContext";

// Helper to convert Firestore Timestamps to Dates in nested objects
const convertTimestampsToDates = (data: DocumentData): any => {
  if (!data) return data;
  const newData: DocumentData = { ...data };
  for (const key in newData) {
    if (newData[key] instanceof Timestamp) {
      newData[key] = newData[key].toDate();
    } else if (typeof newData[key] === 'object' && newData[key] !== null && !(newData[key] instanceof Date)) {
      if (Array.isArray(newData[key])) {
        newData[key] = newData[key].map((item: any) =>
          item instanceof Timestamp ? item.toDate() :
          (typeof item === 'object' && item !== null && !(item instanceof Date) && !Array.isArray(item) ? convertTimestampsToDates(item) : item)
        );
      } else {
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
  allJobApplications: JobApplication[]; // For candidate's own applications view
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
                userId: currentAuthUserUid 
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
        return convertTimestampsToDates({ id: docSnapshot.id, ...docSnapshot.data() }) as Job;
      });
      setJobs(fetchedJobs);

      if (currentAuthUser) {
        const allCandidatesQuery = query(collection(db, "candidates"), orderBy("profileLastUpdatedAt", "desc"));
        const allCandidatesSnapshot = await getDocs(allCandidatesQuery);
        const fetchedCandidatesList: Candidate[] = allCandidatesSnapshot.docs.map(docSnapshot => {
          return convertTimestampsToDates({ id: docSnapshot.id, ...docSnapshot.data() }) as Candidate;
        });
        setCandidates(fetchedCandidatesList);
        console.log("[AppContext] Fetched all candidates for HR view:", fetchedCandidatesList.length);
        
        await fetchCandidateProfile(currentAuthUser.uid);

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
      console.error("Error fetching data from Firestore:", error);
    } finally {
      setLoadingData(false);
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
        userId: user.uid, 
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
      console.error("Error adding candidate to Firestore (HR):", error);
      return null;
    }
  }, [user, setCandidates]);

  const saveCandidateDataForUser = useCallback(async (candidateAuthUid: string, candidateProfileData: Omit<Candidate, "id" | "userId" | "profileLastUpdatedAt" | "overallStatus" | "overallStatusLastUpdatedAt"> & { userId: string }): Promise<Candidate | null> => {
    if (!db) return null;
    if (candidateAuthUid !== candidateProfileData.userId) {
      console.error("Mismatch between provided candidateAuthUid and userId in data for saveCandidateDataForUser.");
      return null;
    }
    try {
      const candidateDocRef = doc(db, "candidates", candidateAuthUid);
      const existingDocSnap = await getDoc(candidateDocRef);
      const existingData = existingDocSnap.exists() ? convertTimestampsToDates(existingDocSnap.data()) as Candidate : {} as Partial<Candidate>;
      const now = new Date();

      const dataToSave: Omit<Candidate, 'id'> & { userId: string } = {
        ...candidateProfileData,
        userId: candidateAuthUid, 
        profileLastUpdatedAt: now,
        parsedText: candidateProfileData.parsedText || "",
        overallStatus: existingData.overallStatus || 'new',
        overallStatusLastUpdatedAt: existingData.overallStatusLastUpdatedAt ? new Date(existingData.overallStatusLastUpdatedAt.toString()) : now,
      };
      await setDoc(candidateDocRef, dataToSave, { merge: true });
      const finalCandidateData = convertTimestampsToDates({ ...dataToSave, id: candidateAuthUid }) as Candidate;

      setUserCandidateProfile(finalCandidateData);
      setCandidates(prev => prev.map(c => c.id === candidateAuthUid ? finalCandidateData : c)
                                .sort((a, b) => (b.profileLastUpdatedAt?.getTime() || 0) - (a.profileLastUpdatedAt?.getTime() || 0))
      );
      return finalCandidateData;
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
        createdAt: new Date(),
        userId: user.uid,
      };
      const docRef = await addDoc(collection(db, "jobs"), newJobWithTimestamp);
      const newJob: Job = convertTimestampsToDates({ ...newJobWithTimestamp, id: docRef.id }) as Job;
      setJobs((prev) => [newJob, ...prev].sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()));
      return newJob;
    } catch (error) {
      console.error("Error adding job to Firestore:", error);
      return null;
    }
  }, [user, setJobs]);

  const deleteJob = useCallback(async (jobId: string): Promise<boolean> => {
    if (!db || !user) return false;
    try {
      const jobRef = doc(db, "jobs", jobId);
      await deleteDoc(jobRef);
      setJobs((prev) => prev.filter(j => j.id !== jobId));
      return true;
    } catch (error) {
      console.error("Error deleting job from Firestore:", error);
      return false;
    }
  }, [user, setJobs]);

  const updateCandidate = useCallback(async (updatedCandidate: Candidate) => {
    if (!db) return;
    try {
      const candidateRef = doc(db, "candidates", updatedCandidate.id);
      const dataToUpdate = { ...updatedCandidate };
      if ('id' in dataToUpdate) delete (dataToUpdate as any).id;

      if (dataToUpdate.profileLastUpdatedAt && !(dataToUpdate.profileLastUpdatedAt instanceof Timestamp)) {
        dataToUpdate.profileLastUpdatedAt = Timestamp.fromDate(new Date(dataToUpdate.profileLastUpdatedAt.toString()));
      }
      if (dataToUpdate.overallStatusLastUpdatedAt && !(dataToUpdate.overallStatusLastUpdatedAt instanceof Timestamp)) {
        dataToUpdate.overallStatusLastUpdatedAt = Timestamp.fromDate(new Date(dataToUpdate.overallStatusLastUpdatedAt.toString()));
      }

      await updateDoc(candidateRef, dataToUpdate);
      const finalUpdatedCandidate = convertTimestampsToDates({ ...updatedCandidate, id: updatedCandidate.id}) as Candidate;
      setCandidates((prev) =>
        prev.map(c => c.id === updatedCandidate.id ? finalUpdatedCandidate : c)
           .sort((a, b) => (b.profileLastUpdatedAt?.getTime() || 0) - (a.profileLastUpdatedAt?.getTime() || 0))
      );
      if (userCandidateProfile && userCandidateProfile.id === updatedCandidate.id) {
        setUserCandidateProfile(finalUpdatedCandidate);
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

  const getCandidateById = useCallback((id: string): Candidate | undefined => {
    if (userCandidateProfile && userCandidateProfile.id === id) return userCandidateProfile;
    const foundCandidate = candidates.find(c => c.id === id);
    return foundCandidate;
  }, [userCandidateProfile, candidates]);

  const getJobById = useCallback((id: string) => jobs.find(j => j.id === id), [jobs]);

  const startJobApplication = useCallback(async (job: Job): Promise<{ applicationId: string | null, isNew: boolean }> => {
    if (!user || !db) {
      console.error("User not authenticated to start application.");
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
      console.log("[AppContext] startJobApplication: userCandidateProfile not fully loaded or stale, fetching...");
      currentCandidateProfile = await fetchCandidateProfile(user.uid);
    }

    if (!currentCandidateProfile || !currentCandidateProfile.parsedText) {
      console.error("[AppContext] startJobApplication: Candidate profile or resume text not available. Please upload/update resume.");
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
      setAllJobApplications(prev => [...prev, newApp].sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime()));
      return { applicationId: docRef.id, isNew: true };
    } catch (error) {
      console.error("Error starting job application:", error);
      return { applicationId: null, isNew: false };
    }
  }, [user, userCandidateProfile, fetchCandidateProfile, setAllJobApplications]);

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
      let dataToUpdate = { ...data };

      (Object.keys(dataToUpdate) as Array<keyof typeof dataToUpdate>).forEach(key => {
        const value = dataToUpdate[key];
        if (value instanceof Date && !(value instanceof Timestamp)) {
          (dataToUpdate as any)[key] = Timestamp.fromDate(value);
        } else if (Array.isArray(value)) {
            (dataToUpdate as any)[key] = value.map(item => {
                if (item instanceof Date && !(item instanceof Timestamp)) return Timestamp.fromDate(item);
                if (typeof item === 'object' && item !== null && !(item instanceof Date) && !(item instanceof Timestamp)) {
                    return convertDatesToTimestampsInObject(item);
                }
                return item;
            });
        } else if (typeof value === 'object' && value !== null && !(value instanceof Timestamp) && !(value instanceof Date) && key === 'interviewDetails') {
           (dataToUpdate as any)[key] = convertDatesToTimestampsInObject(value);
        }
      });

      await updateDoc(appRef, dataToUpdate as DocumentData);
      setAllJobApplications(prev => prev.map(app => app.id === applicationId ? convertTimestampsToDates({ ...app, ...data, id: applicationId }) as JobApplication : app)
        .sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime()));
      return true;
    } catch (error) {
      console.error("Error updating job application:", error);
      return false;
    }
  }, [setAllJobApplications]);

  const convertDatesToTimestampsInObject = (obj: any) => {
    const newObj: any = { ...obj };
    for (const key in newObj) {
        if (newObj[key] instanceof Date && !(newObj[key] instanceof Timestamp)) {
            newObj[key] = Timestamp.fromDate(newObj[key]);
        } else if (typeof newObj[key] === 'string' && (key === 'date') && !isNaN(Date.parse(newObj[key]))) {
           // Assuming 'date' field in interviewDetails might be string, ensure it's handled if needed, though Firestore usually manages direct Date objects well.
           // This is more defensive; usually direct Date object is fine.
        }
    }
    return newObj;
  };


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
      console.error("Error fetching applications for job:", error);
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
      await updateDoc(candidateRef, statusUpdateData);
      setCandidates(prev => prev.map(c => c.id === candidateId ? convertTimestampsToDates({...c, ...statusUpdateData, id: candidateId }) as Candidate : c)
          .sort((a, b) => (b.profileLastUpdatedAt?.getTime() || 0) - (a.profileLastUpdatedAt?.getTime() || 0))
      );

      let emailSubject = "";
      let emailBody = "";
      const candidateName = candidateDetails.name || "Candidate";
      const candidateEmail = candidateDetails.email;

      if (candidateEmail) {
        switch (newStatus) {
          case 'contacted':
            emailSubject = `Following Up: TalentFlow AI`;
            emailBody = `Dear ${candidateName},\n\nThis is a follow-up regarding your profile with TalentFlow AI. We're impressed with your background and would like to discuss potential opportunities. Please let us know your availability for a brief chat.\n\nBest regards,\nThe TalentFlow AI Team`;
            break;
          case 'interview_scheduled':
            emailSubject = `Interview Process Update: TalentFlow AI`;
            emailBody = `Dear ${candidateName},\n\nThis is to confirm that an interview has been scheduled as part of your application process with TalentFlow AI. Please refer to specific communications for details.\n\nBest regards,\nThe TalentFlow AI Team`;
            break;
          case 'offer_extended':
            emailSubject = `Congratulations: Offer from TalentFlow AI`;
            emailBody = `Dear ${candidateName},\n\nWe are delighted to extend an offer of employment to you! Details of the offer will be sent in a separate communication. We are very excited about the possibility of you joining our team.\n\nBest regards,\nThe TalentFlow AI Team`;
            break;
          case 'hired':
            emailSubject = `Welcome to TalentFlow AI!`;
            emailBody = `Dear ${candidateName},\n\nWelcome aboard! We are thrilled to have you join the TalentFlow AI team. Your onboarding details will follow shortly.\n\nBest regards,\nThe TalentFlow AI Team`;
            break;
          case 'rejected_overall':
             const isAutomatedRejection = candidateDetails.name === "Automated System"; // Name will be set to this in questionnaire page for auto rejection
             if (isAutomatedRejection) {
                 emailSubject = `Update on Your Application with TalentFlow AI`;
                 emailBody = `Dear ${candidateName},\n\nThank you for your interest and for completing the application process with TalentFlow AI. After an automated review based on the initial requirements and questionnaire, we have decided to pursue other candidates at this time.\n\nWe appreciate your time and wish you the best in your career endeavors.\n\nSincerely,\nThe TalentFlow AI Team`;
             } else {
                 emailSubject = `Update on Your Profile with TalentFlow AI`;
                 emailBody = `Dear ${candidateName},\n\nThank you for your interest in TalentFlow AI. After careful consideration of your overall profile by our team, we have decided to pursue other candidates at this time.\n\nWe appreciate your time and wish you the best in your career endeavors.\n\nSincerely,\nThe TalentFlow AI Team`;
             }
            break;
          case 'under_review_hr':
            emailSubject = `Application Update: Under Review with TalentFlow AI`;
            emailBody = `Dear ${candidateName},\n\nThank you for completing the initial steps. Your application is now under review by our HR team. We appreciate your patience and will get back to you as soon as possible.\n\nBest regards,\nThe TalentFlow AI Team`;
            break;
        }
        if (emailSubject && emailBody) {
          console.log(`[AppContext] Simulating OVERALL STATUS email to ${candidateEmail} for candidate ${candidateId}. New Status: ${newStatus}. Subject: ${emailSubject}`);
        }
      }
      return true;
    } catch (error) {
      console.error("Error updating candidate overall status by HR:", error);
      return false;
    }
  }, [user, setCandidates]);


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

      const appDoc = await getDoc(appRef);
      if(appDoc.exists()) {
        const appData = convertTimestampsToDates(appDoc.data()) as JobApplication;
        if (newStatus === 'interview_scheduled') {
          await hrUpdateCandidateOverallStatus(appData.candidateId, 'interview_scheduled', { name: candidateName, email: candidateEmail });
        }
        
        setAllJobApplications(prev => prev.map(a =>
          a.id === applicationId
          ? convertTimestampsToDates({ ...a, ...updateData, id: applicationId }) as JobApplication
          : a
        ).sort((a,b) => b.appliedAt.getTime() - a.appliedAt.getTime()));
      }


      let emailSubject = "";
      let emailBody = "";
      if (newStatus === 'interview_scheduled' && interviewDetails) {
           emailSubject = `Interview Scheduled: ${jobTitle} at TalentFlow AI`;
           emailBody = `Dear ${candidateName},\n\nWe're pleased to invite you for an interview for the ${jobTitle} position!\n\nInterview Details:\nDate: ${interviewDetails.date}\nTime: ${interviewDetails.time}\nNotes: ${interviewDetails.notes || 'N/A'}\n\nOur recruitment team will be in touch if any further instructions are needed.\n\nBest regards,\nThe TalentFlow AI Team`;
      } else if (newStatus === 'accepted') {
          emailSubject = `Progress on Your Application for ${jobTitle} at TalentFlow AI!`;
          emailBody = `Dear ${candidateName},\n\nWe are thrilled to inform you that your application for the ${jobTitle} position has progressed!\n\nOur recruitment team will be in touch shortly with more details on the next steps.\n\nCongratulations!\n\nBest regards,\nThe TalentFlow AI Team`;
      } else if (newStatus === 'rejected_hr') {
        emailSubject = `Update on Your Application for ${jobTitle} at TalentFlow AI`;
        emailBody = `Dear ${candidateName},\n\nThank you for your interest in the ${jobTitle} position and for taking the time with our application process.\n\nAfter careful review by our HR team, we have decided to move forward with other candidates whose qualifications and experience more closely match the current requirements for this specific role at this time.\n\nWe appreciate your effort and wish you the best in your job search.\n\nSincerely,\nThe TalentFlow AI Team`;
      }

      if (emailSubject && emailBody && candidateEmail) {
        console.log(`[AppContext] Simulating HR ACTION email for application ${applicationId} to ${candidateEmail}. New Status: ${newStatus}. Subject: ${emailSubject}`);
      }

      return true;
    } catch (error) {
      console.error("Error updating application status by HR:", error);
      return false;
    }
  }, [user, hrUpdateCandidateOverallStatus, setAllJobApplications]);


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

