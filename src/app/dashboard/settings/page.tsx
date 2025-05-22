
// src/app/dashboard/settings/page.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Settings, User } from "lucide-react";
import { EditProfileDialog } from "@/components/settings/EditProfileDialog"; // Import the new dialog

export default function SettingsPage() {
  const [isEditProfileDialogOpen, setIsEditProfileDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Link>
        </Button>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
          <CardDescription>
            Manage your application preferences and settings here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <Card className="p-4 sm:p-6 bg-muted/30">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-medium flex items-center gap-2"><User size={20}/> Profile Settings</h3>
                  <p className="text-sm text-muted-foreground mt-1">Update your display name and photo URL.</p>
                </div>
                <Button 
                  variant="secondary" 
                  className="mt-3 sm:mt-0" 
                  onClick={() => setIsEditProfileDialogOpen(true)}
                >
                  Edit Profile
                </Button>
              </div>
            </Card>
            
            <Card className="p-4 sm:p-6 bg-muted/30">
               <div>
                <h3 className="text-lg font-medium">Notification Preferences</h3>
                <p className="text-sm text-muted-foreground mt-1">Manage how you receive notifications from the app.</p>
                <Button variant="secondary" className="mt-2" disabled>Configure Notifications (Coming Soon)</Button>
              </div>
            </Card>

            <Card className="p-4 sm:p-6 bg-muted/30">
              <div>
                <h3 className="text-lg font-medium">Theme</h3>
                <p className="text-sm text-muted-foreground mt-1">Choose your preferred application theme.</p>
                <Button variant="secondary" className="mt-2" disabled>Change Theme (Coming Soon)</Button>
              </div>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Dialog */}
      <EditProfileDialog 
        open={isEditProfileDialogOpen} 
        onOpenChange={setIsEditProfileDialogOpen} 
      />
    </div>
  );
}
