
// src/components/settings/EditProfileDialog.tsx
"use client";

import { useState, useEffect } from "react";
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

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: user?.displayName || "",
      photoURL: user?.photoURL || "",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        displayName: user.displayName || "",
        photoURL: user.photoURL || "",
      });
    }
  }, [user, form, open]); // Reset form when dialog opens or user changes

  const onSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
    setLocalError(null);
    const profileData: { displayName?: string; photoURL?: string } = {};
    if (data.displayName !== undefined) profileData.displayName = data.displayName;
    if (data.photoURL !== undefined) profileData.photoURL = data.photoURL;

    if (Object.keys(profileData).length === 0) {
        toast({ title: "No Changes", description: "You haven't made any changes to your profile." });
        onOpenChange(false); // Close dialog
        return;
    }

    const success = await updateUserProfile(profileData);
    if (success) {
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      onOpenChange(false); // Close dialog
    } else {
        // authError from context should be populated
    }
  };
  
  useEffect(() => {
    if (authError) {
      setLocalError(authError.message);
    }
  }, [authError]);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        {localError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Update Failed</AlertTitle>
            <AlertDescription>{localError}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
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
              {...form.register("photoURL")}
              placeholder="https://example.com/your-photo.jpg"
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
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
