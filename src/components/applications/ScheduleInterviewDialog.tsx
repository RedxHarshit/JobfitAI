
// src/components/applications/ScheduleInterviewDialog.tsx
"use client";

import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import type { InterviewDetails } from "@/types";

const scheduleInterviewSchema = z.object({
  date: z.date({ required_error: "Interview date is required." }),
  time: z.string().min(1, { message: "Interview time is required." }).regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](\s*(AM|PM|am|pm))?(\s*[A-Z]{3,5})?$/, { message: "Invalid time format (e.g., 10:00 AM PST or 14:30)." }),
  notes: z.string().optional(),
});

type ScheduleInterviewFormValues = z.infer<typeof scheduleInterviewSchema>;

interface ScheduleInterviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (details: InterviewDetails) => void;
  candidateName?: string;
  jobTitle?: string;
}

export function ScheduleInterviewDialog({
  open,
  onOpenChange,
  onSubmit,
  candidateName,
  jobTitle,
}: ScheduleInterviewDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const form = useForm<ScheduleInterviewFormValues>({
    resolver: zodResolver(scheduleInterviewSchema),
    defaultValues: {
      time: "",
      notes: "",
    },
  });

  const handleFormSubmit: SubmitHandler<ScheduleInterviewFormValues> = (data) => {
    if (!data.date) {
        form.setError("date", { type: "manual", message: "Interview date is required." });
        return;
    }
    onSubmit({
      date: format(data.date, "PPP"), // Format date nicely for storage/display
      time: data.time,
      notes: data.notes,
    });
    form.reset();
    setSelectedDate(undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        form.reset();
        setSelectedDate(undefined);
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule Interview</DialogTitle>
          <DialogDescription>
            Set the date and time for {candidateName}'s interview for the {jobTitle} position.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 py-4">
          <div>
            <Label htmlFor="interview-date">Interview Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    form.setValue("date", date as Date, { shouldValidate: true });
                  }}
                  initialFocus
                  disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() -1)) } // Disable past dates
                />
              </PopoverContent>
            </Popover>
            {form.formState.errors.date && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.date.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="interview-time">Interview Time</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="interview-time"
                placeholder="e.g., 02:30 PM EST or 14:30"
                className="pl-10"
                {...form.register("time")}
              />
            </div>
            {form.formState.errors.time && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.time.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="interview-notes">Notes (Optional)</Label>
            <Textarea
              id="interview-notes"
              placeholder="Any additional notes for the interview (e.g., topics to cover, link to meeting)"
              {...form.register("notes")}
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">Schedule Interview</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
