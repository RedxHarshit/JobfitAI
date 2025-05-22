// src/app/dashboard/settings/page.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";

export default function SettingsPage() {
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
          <p className="text-muted-foreground">
            Settings page is currently under construction. More options will be available soon.
          </p>
          {/* Placeholder for future settings options */}
          <div className="mt-6 space-y-4">
            <div>
              <h3 className="text-lg font-medium">Profile Settings</h3>
              <p className="text-sm text-muted-foreground">Update your personal information and password.</p>
              <Button variant="secondary" className="mt-2" disabled>Edit Profile (Coming Soon)</Button>
            </div>
            <div>
              <h3 className="text-lg font-medium">Notification Preferences</h3>
              <p className="text-sm text-muted-foreground">Manage how you receive notifications from the app.</p>
              <Button variant="secondary" className="mt-2" disabled>Configure Notifications (Coming Soon)</Button>
            </div>
            <div>
              <h3 className="text-lg font-medium">Theme</h3>
              <p className="text-sm text-muted-foreground">Choose your preferred application theme.</p>
              <Button variant="secondary" className="mt-2" disabled>Change Theme (Coming Soon)</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
