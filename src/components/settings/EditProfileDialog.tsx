
// src/components/settings/EditProfileDialog.tsx
"use client";

import { useState, useEffect, type ChangeEvent } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { storage } from "@/lib/firebase"; 
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserIcon, ImagePlus } from "lucide-react";

// Schema now only validates displayName. Photo is handled separately.
const profileFormSchema = z.object({
  displayName: z.string().min(1, "Display name cannot be empty.").max(50, "Display name is too long.").optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProfileDialog({ open, onOpenChange }: EditProfileDialogProps) {
  const { user, updateUserProfile, loading: authLoading, error: authError } = useAuth();
  const { toast } = useToast();
  const [localError, setLocalError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: "", // Will be set in useEffect
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        displayName: user.displayName || "",
      });
      setPhotoPreviewUrl(user.photoURL || null);
    }
    setSelectedPhotoFile(null); 
    setLocalError(null);
  }, [user, form, open]);

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const MAX_SIZE = 2 * 1024 * 1024; // 2MB
      if (file.size > MAX_SIZE) {
        toast({
          title: "File Too Large",
          description: "Profile picture must be less than 2MB.",
          variant: "destructive",
        });
        event.target.value = ""; // Reset file input
        return;
      }
      setSelectedPhotoFile(file);
      setPhotoPreviewUrl(URL.createObjectURL(file)); 
    } else {
      setSelectedPhotoFile(null);
      setPhotoPreviewUrl(user?.photoURL || null); 
    }
  };

  const onSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
    setLocalError(null);
    if (!user) {
      setLocalError("User not authenticated.");
      return;
    }

    let newPhotoURL = user.photoURL; 

    if (selectedPhotoFile) {
      setIsUploading(true);
      try {
        // Create a unique file name or path to avoid conflicts if desired,
        // or just use the original file name with user ID.
        const fileRef = storageRef(storage, `profile_pictures/${user.uid}/${selectedPhotoFile.name}`);
        const snapshot = await uploadBytes(fileRef, selectedPhotoFile);
        newPhotoURL = await getDownloadURL(snapshot.ref);
      } catch (uploadError: any) {
        console.error("Photo upload error:", uploadError);
        setLocalError(uploadError.message || "Failed to upload photo.");
        toast({
          title: "Photo Upload Failed",
          description: uploadError.message || "Could not upload the new profile picture.",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }
      // No finally block for setIsUploading(false) here, it's handled by main try/finally
    }

    const profileDataToUpdate: { displayName?: string; photoURL?: string } = {};
    let changesMade = false;

    const currentDisplayName = user.displayName || "";
    if (data.displayName !== undefined && data.displayName !== currentDisplayName) {
      profileDataToUpdate.displayName = data.displayName;
      changesMade = true;
    }

    if (newPhotoURL !== user.photoURL) {
      profileDataToUpdate.photoURL = newPhotoURL || ""; // Use empty string to "remove" photo if newPhotoURL is null
      changesMade = true;
    }
    
    if (!changesMade) {
        toast({ title: "No Changes", description: "You haven't made any changes to your profile." });
        onOpenChange(false);
        return;
    }

    // If only the photo was changed, ensure displayName is included if it was initially set
    if (changesMade && !profileDataToUpdate.displayName && currentDisplayName) {
        profileDataToUpdate.displayName = currentDisplayName;
    }


    setIsUploading(true); // General loading state for the update operation
    const success = await updateUserProfile(profileDataToUpdate);
    setIsUploading(false); // Reset general loading state

    if (success) {
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      onOpenChange(false);
    } else {
      if (authError) setLocalError(authError.message);
      else setLocalError("An unknown error occurred while updating the profile.");
    }
  };
  
  useEffect(() => {
    if (authError && !open) { // Only update localError if dialog is not open to avoid race conditions
      setLocalError(authError.message);
    }
  }, [authError, open]);


  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        // Reset states when dialog is closed
        setSelectedPhotoFile(null);
        if (user) setPhotoPreviewUrl(user.photoURL || null);
        form.reset({ displayName: user?.displayName || "" });
        setLocalError(null);
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        {localError && (
          <Alert variant="destructive" className="my-4">
            <AlertTitle>Update Failed</AlertTitle>
            <AlertDescription>{localError}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
          <div className="space-y-3 text-center">
             <Avatar className="w-24 h-24 mx-auto border-2 border-primary shadow-md">
              <AvatarImage src={photoPreviewUrl || undefined} alt={user?.displayName || "User"} data-ai-hint="person avatar"/>
              <AvatarFallback className="text-3xl">
                {user?.displayName ? user.displayName[0].toUpperCase() : <UserIcon size={40}/>}
              </AvatarFallback>
            </Avatar>
            <Label htmlFor="photoFile" className="inline-block cursor-pointer text-sm text-primary hover:underline p-2 rounded-md hover:bg-muted/50">
                <span className="inline-flex items-center gap-1">
                    <ImagePlus size={18}/> Change Photo
                </span>
            </Label>
            <Input
              id="photoFile"
              type="file"
              accept="image/png, image/jpeg, image/gif"
              onChange={handlePhotoChange}
              className="hidden" // Visually hidden, triggered by label
              disabled={authLoading || isUploading}
            />
             {selectedPhotoFile && <p className="text-xs text-muted-foreground mt-1">{selectedPhotoFile.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              {...form.register("displayName")}
              placeholder="Your Name"
              disabled={authLoading || isUploading}
            />
            {form.formState.errors.displayName && (
              <p className="text-sm text-destructive">{form.formState.errors.displayName.message}</p>
            )}
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={authLoading || isUploading}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={authLoading || isUploading}>
              {(authLoading || isUploading) && <Loader size={16} className="mr-2" />}
              {isUploading ? "Saving..." : (authLoading ? "Saving..." : "Save changes")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
