
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserIcon } from "lucide-react";

// Schema validates displayName and an optional photoURL string.
const profileFormSchema = z.object({
  displayName: z.string().min(1, "Display name cannot be empty.").max(50, "Display name is too long.").optional().or(z.literal('')),
  photoURL: z.string().url("Please enter a valid URL for the photo.").optional().or(z.literal('')),
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
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: "",
      photoURL: "",
    },
  });

  useEffect(() => {
    if (user && open) { // Reset form when dialog opens and user exists
      form.reset({
        displayName: user.displayName || "",
        photoURL: user.photoURL || "",
      });
      setCurrentPhotoUrl(user.photoURL || null);
    }
    if (!open) { // Clear error when dialog closes
        setLocalError(null);
    }
  }, [user, form, open]);

  const onSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
    setLocalError(null);
    if (!user) {
      setLocalError("User not authenticated.");
      return;
    }

    const profileDataToUpdate: { displayName?: string; photoURL?: string } = {};
    let changesMade = false;

    const currentDisplayName = user.displayName || "";
    if (data.displayName !== undefined && data.displayName !== currentDisplayName) {
      profileDataToUpdate.displayName = data.displayName;
      changesMade = true;
    }

    const currentPhoto = user.photoURL || "";
    if (data.photoURL !== undefined && data.photoURL !== currentPhoto) {
      profileDataToUpdate.photoURL = data.photoURL; // Use the URL from the form
      changesMade = true;
    }
    
    if (!changesMade) {
        toast({ title: "No Changes", description: "You haven't made any changes to your profile." });
        onOpenChange(false);
        return;
    }

    // Ensure displayName is included if it was initially set and only photo was changed (or vice-versa)
     if (changesMade) {
        if (profileDataToUpdate.displayName === undefined) {
            profileDataToUpdate.displayName = currentDisplayName;
        }
        if (profileDataToUpdate.photoURL === undefined) {
            profileDataToUpdate.photoURL = currentPhoto;
        }
    }

    const success = await updateUserProfile(profileDataToUpdate);

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
    // Sync authError to localError if dialog is open
    if (authError && open) { 
      setLocalError(authError.message);
    }
  }, [authError, open]);

  const watchedPhotoURL = form.watch("photoURL");

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        // Reset form and error when dialog is closed
        if(user) {
            form.reset({ displayName: user.displayName || "", photoURL: user.photoURL || "" });
            setCurrentPhotoUrl(user.photoURL || null);
        } else {
            form.reset({ displayName: "", photoURL: "" });
            setCurrentPhotoUrl(null);
        }
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
              {/* Show preview from watchedPhotoURL if valid, otherwise current user's photo or fallback */}
              <AvatarImage src={watchedPhotoURL || currentPhotoUrl || undefined} alt={user?.displayName || "User"} data-ai-hint="person avatar" />
              <AvatarFallback className="text-3xl">
                {user?.displayName ? user.displayName[0].toUpperCase() : <UserIcon size={40}/>}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              {...form.register("displayName")}
              placeholder="Your Name"
              disabled={authLoading}
            />
            {form.formState.errors.displayName && (
              <p className="text-sm text-destructive">{form.formState.errors.displayName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="photoURL">Photo URL</Label>
            <Input
              id="photoURL"
              type="url"
              {...form.register("photoURL")}
              placeholder="https://example.com/your-image.png"
              disabled={authLoading}
            />
            {form.formState.errors.photoURL && (
              <p className="text-sm text-destructive">{form.formState.errors.photoURL.message}</p>
            )}
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={authLoading}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={authLoading}>
              {authLoading && <Loader size={16} className="mr-2" />}
              {authLoading ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
