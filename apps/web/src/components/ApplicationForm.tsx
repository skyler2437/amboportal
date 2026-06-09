"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check, ChevronRight, ChevronLeft, Loader2, Save, Upload, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { getApplicationByPhone, saveApplicationStep, submitApplication, submitApplicationForUser, uploadTranscript } from "@/actions/application";
import { ApplicationData } from "@ambo/database/application-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SignOutButton } from "@/components/SignOutButton";

type StepKey = "contact" | "personal" | "academic" | "references" | "questionnaire";

const GUEST_STEP_KEYS: StepKey[] = ["contact", "personal", "academic", "references", "questionnaire"];
const AUTH_STEP_KEYS: StepKey[] = ["personal", "academic", "references", "questionnaire"];

const STEP_LABELS: Record<StepKey, string> = {
    contact: "Contact Info",
    personal: "Personal Info",
    academic: "Academic Info",
    references: "References",
    questionnaire: "Questionnaire",
};

const INITIAL_DATA: ApplicationData = {
    phone_number: "",
    status: "draft",
    current_step: 1,
    first_name: "",
    last_name: "",
    email: "",
    grade_current: "",
    grade_entry: "",
    gpa: undefined,
    transcript_url: "",
    referrer_academic_name: "",
    referrer_academic_email: "",
    referrer_bible_name: "",
    referrer_bible_email: "",
    q_involvement: "",
    q_why_ambassador: "",
    q_faith: "",
    q_love_linfield: "",
    q_change_linfield: "",
    q_family_decision: "",
    q_strengths: "",
    q_weaknesses: "",
    q_time_commitment: ""
};

interface UserData {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
}

interface ApplicationFormProps {
    userId?: string;
    userData?: UserData;
    initialData?: ApplicationData | null;
    resumeStep?: number;
}

export default function ApplicationForm({ userId, userData, initialData, resumeStep }: ApplicationFormProps) {
    const isAuthenticated = !!userData;
    const stepKeys = isAuthenticated ? AUTH_STEP_KEYS : GUEST_STEP_KEYS;

    const [currentStepIndex, setCurrentStepIndex] = useState(resumeStep ?? 0);
    const [resumeData, setResumeData] = useState<ApplicationData>(() => {
        if (initialData) {
            return initialData;
        }
        if (userData) {
            return {
                ...INITIAL_DATA,
                phone_number: userData.phone,
                first_name: userData.firstName,
                last_name: userData.lastName,
                email: userData.email,
            };
        }
        return INITIAL_DATA;
    });
    const [direction, setDirection] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [stepError, setStepError] = useState<string | null>(null);

    const currentStepKey = stepKeys[currentStepIndex];

    const handleChange = (field: keyof ApplicationData, value: any) => {
        setResumeData(prev => ({ ...prev, [field]: value }));
    };

    const validateStep = (stepKey: StepKey) => {
        switch (stepKey) {
            case "contact":
                if (!resumeData.phone_number || resumeData.phone_number.length < 10) return "Please enter a valid phone number.";
                return null;
            case "personal":
                if (!isAuthenticated) {
                    if (!resumeData.first_name) return "First Name is required.";
                    if (!resumeData.last_name) return "Last Name is required.";
                    if (!resumeData.email) return "Student Email is required.";
                }
                if (!resumeData.grade_current) return "Current Grade is required.";
                if (!resumeData.grade_entry) return "Entry Grade is required.";
                return null;
            case "academic":
                if (resumeData.gpa === undefined || resumeData.gpa === null) return "GPA is required.";
                if (resumeData.gpa < 0 || resumeData.gpa > 5) return "GPA must be between 0.00 and 5.00.";
                return null;
            case "references":
                if (!resumeData.referrer_academic_name) return "Academic Reference Name is required.";
                if (!resumeData.referrer_academic_email) return "Academic Reference Email is required.";
                if (!resumeData.referrer_bible_name) return "Spiritual Reference Name is required.";
                if (!resumeData.referrer_bible_email) return "Spiritual Reference Email is required.";
                return null;
            case "questionnaire":
                if (!resumeData.q_involvement) return "Involvement question is required.";
                if (!resumeData.q_why_ambassador) return "Why Ambassador question is required.";
                if (!resumeData.q_faith) return "Faith question is required.";
                if (!resumeData.q_love_linfield) return "Love about Linfield question is required.";
                if (!resumeData.q_change_linfield) return "Change about Linfield question is required.";
                if (!resumeData.q_family_decision) return "Family decision question is required.";
                if (!resumeData.q_strengths) return "Strengths question is required.";
                if (!resumeData.q_weaknesses) return "Weaknesses question is required.";
                if (!resumeData.q_time_commitment) return "Time commitment question is required.";
                return null;
            default:
                return null;
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await saveApplicationStep({
                ...resumeData,
                current_step: currentStepIndex + 1
            });
            toast.success("Progress saved");
        } catch (error) {
            console.error(error);
            toast.error("Failed to save progress");
        } finally {
            setIsSaving(false);
        }
    };

    const handleNext = async () => {
        const error = validateStep(currentStepKey);
        if (error) {
            setStepError(error);
            return;
        }

        setStepError(null);
        setIsSaving(true);
        try {
            if (currentStepKey === "contact") {
                // Guest flow: phone lookup on first step
                setIsLoading(true);
                const { application: existing, exists } = await getApplicationByPhone(resumeData.phone_number);
                setIsLoading(false);

                if (existing) {
                    setResumeData(existing);
                    if (existing.status === 'submitted') {
                        setIsSubmitted(true);
                        setIsSaving(false);
                        return;
                    }
                } else if (exists) {
                    // An application exists for this phone but this browser
                    // doesn't hold its application token.
                    setStepError(
                        "An application with this phone number already exists. Continue on the device where you started it, or contact the Ambassador Coordinator."
                    );
                    setIsSaving(false);
                    return;
                } else {
                    await saveApplicationStep({
                        phone_number: resumeData.phone_number,
                        current_step: 2
                    });
                }
            } else {
                // Save progress
                await saveApplicationStep({
                    ...resumeData,
                    current_step: currentStepIndex + 2
                });
            }

            if (currentStepIndex < stepKeys.length - 1) {
                setDirection(1);
                setCurrentStepIndex(prev => prev + 1);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to save progress. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleBack = () => {
        if (currentStepIndex > 0) {
            setDirection(-1);
            setCurrentStepIndex(prev => prev - 1);
            setStepError(null);
            setConfirmingSubmit(false);
        }
    };

    const [confirmingSubmit, setConfirmingSubmit] = useState(false);

    const handleSubmit = async () => {
        const error = validateStep(currentStepKey);
        if (error) {
            setStepError(error);
            return;
        }

        setStepError(null);

        if (!confirmingSubmit) {
            setConfirmingSubmit(true);
            return;
        }

        setIsSubmitting(true);
        try {
            await submitApplication(resumeData.phone_number);
            if (userId) {
                await submitApplicationForUser(userId);
                window.location.href = "/status";
                return;
            }
            setIsSubmitted(true);
        } catch (error) {
            console.error(error);
            toast.error("Failed to submit application");
        } finally {
            setIsSubmitting(false);
            setConfirmingSubmit(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        const file = e.target.files[0];

        if (file.size > 5 * 1024 * 1024) {
            toast.error("File is too large. Max 5MB.");
            return;
        }
        if (file.type !== 'application/pdf') {
            toast.error("Only PDF files are allowed.");
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("phone", resumeData.phone_number);

            // uploadTranscript persists transcript_url server-side; the local
            // state only needs a truthy value for the "uploaded" indicator.
            const { path } = await uploadTranscript(formData);
            handleChange("transcript_url", path);
        } catch (error) {
            console.error(error);
            toast.error("Failed to upload file");
        } finally {
            setUploading(false);
        }
    };

    if (isSubmitted) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-xl mx-auto py-16 px-4 text-center"
            >
                <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
                    <Check className="w-10 h-10" />
                </div>
                <h1 className="text-3xl font-bold mb-4 tracking-tight">You did it!</h1>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                    Your Student Ambassador Application has been successfully submitted.
                    The Student Ambassador Coordinator will email you after the Round 1 Deadline whether you&apos;ve passed onto Round 2 or not.
                </p>
                <div className="bg-muted p-6 rounded-lg text-sm text-left border shadow-sm">
                    <p className="font-semibold mb-2">Questions?</p>
                    <p className="text-muted-foreground">Contact the Student Ambassador Coordinator, Skyler Stevens, at <a href="mailto:sstevens@linfield.com" className="text-primary font-medium hover:underline">sstevens@linfield.com</a></p>
                </div>
            </motion.div>
        );
    }

    const progress = Math.round(((currentStepIndex) / (stepKeys.length)) * 100);

    const variants = {
        enter: (direction: number) => ({ x: direction > 0 ? 20 : -20, opacity: 0 }),
        center: { zIndex: 1, x: 0, opacity: 1 },
        exit: (direction: number) => ({ zIndex: 0, x: direction < 0 ? 20 : -20, opacity: 0 }),
    };

    return (
        <div className="max-w-3xl mx-auto w-full px-4 py-8">
            {/* Header Area */}
            <div className="flex flex-col items-center mb-8 text-center space-y-4">
                <div className="w-full bg-secondary rounded-full h-2 mb-4 max-w-sm overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                        className="bg-primary h-full rounded-full"
                    />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight">{STEP_LABELS[currentStepKey]}</h1>
            </div>

            <div className="bg-card border shadow-sm rounded-xl p-6 md:p-10 min-h-[400px] relative overflow-hidden flex flex-col">
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={currentStepIndex}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
                        className="w-full flex-1"
                    >
                        {/* --- Contact Info (Guest only) --- */}
                        {currentStepKey === "contact" && (
                            <div className="space-y-6 max-w-md mx-auto py-8">
                                <div className="text-center space-y-2">
                                    <h2 className="text-xl font-semibold">Welcome</h2>
                                    <p className="text-sm text-muted-foreground">
                                        Enter your phone number to start or resume your application.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Cell Phone Number</label>
                                    <Input
                                        type="tel"
                                        className="text-lg tracking-wide text-center h-12"
                                        placeholder="(555) 555-5555"
                                        value={resumeData.phone_number}
                                        onChange={(e) => handleChange("phone_number", e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* --- Personal Info --- */}
                        {currentStepKey === "personal" && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Guest flow: show name and email fields */}
                                    {!isAuthenticated && (
                                        <>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">First Name <span className="text-red-500">*</span></label>
                                                <Input value={resumeData.first_name || ""} onChange={(e) => handleChange("first_name", e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Last Name <span className="text-red-500">*</span></label>
                                                <Input value={resumeData.last_name || ""} onChange={(e) => handleChange("last_name", e.target.value)} />
                                            </div>
                                            <div className="space-y-2 md:col-span-2">
                                                <label className="text-sm font-medium">Student Email <span className="text-red-500">*</span></label>
                                                <Input type="email" value={resumeData.email || ""} onChange={(e) => handleChange("email", e.target.value)} />
                                            </div>
                                        </>
                                    )}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Current Grade <span className="text-red-500">*</span></label>
                                        <select
                                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                            value={resumeData.grade_current || ""}
                                            onChange={(e) => handleChange("grade_current", e.target.value)}
                                        >
                                            <option value="">Select...</option>
                                            <option value="9">Freshman (9th)</option>
                                            <option value="10">Sophomore (10th)</option>
                                            <option value="11">Junior (11th)</option>
                                            <option value="12">Senior (12th)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Grade Entered Linfield <span className="text-red-500">*</span></label>
                                        <Input placeholder="e.g. 6th Grade" value={resumeData.grade_entry || ""} onChange={(e) => handleChange("grade_entry", e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* --- Academic Info --- */}
                        {currentStepKey === "academic" && (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Current Cumulative GPA <span className="text-red-500">*</span></label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="5"
                                        className="max-w-[200px]"
                                        value={resumeData.gpa || ""}
                                        onChange={(e) => handleChange("gpa", parseFloat(e.target.value))}
                                    />
                                    <p className="text-xs text-muted-foreground">Must be between 0.00 and 5.00</p>
                                </div>
                                <div className="space-y-4 pt-4 border-t">
                                    <label className="text-sm font-medium block">Current Unofficial Transcript <span className="text-red-500">*</span></label>
                                    {resumeData.transcript_url ? (
                                        <div className="flex items-center gap-3 p-3 bg-secondary rounded-md border">
                                            <FileText className="w-5 h-5 text-primary" />
                                            <span className="text-sm flex-1 truncate font-medium">Transcript Uploaded</span>
                                            <button
                                                onClick={() => handleChange("transcript_url", "")}
                                                className="text-xs text-destructive hover:underline font-medium"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md text-sm font-medium transition-colors w-fit border shadow-sm">
                                                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                                <span>Upload File</span>
                                                <input type="file" className="hidden" accept=".pdf,application/pdf" onChange={handleFileUpload} />
                                            </label>
                                            <span className="text-xs text-muted-foreground">PDF (Max 5MB)</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* --- References --- */}
                        {currentStepKey === "references" && (
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <h3 className="font-semibold border-b pb-2 flex items-center gap-2">
                                        Academic Reference
                                        <span className="text-xs font-normal text-muted-foreground ml-auto">Required</span>
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Teacher Name <span className="text-red-500">*</span></label>
                                            <Input value={resumeData.referrer_academic_name || ""} onChange={(e) => handleChange("referrer_academic_name", e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Teacher Email <span className="text-red-500">*</span></label>
                                            <Input type="email" value={resumeData.referrer_academic_email || ""} onChange={(e) => handleChange("referrer_academic_email", e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="font-semibold border-b pb-2 flex items-center gap-2">
                                        Spiritual Reference
                                        <span className="text-xs font-normal text-muted-foreground ml-auto">Required</span>
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Pastor/Teacher Name <span className="text-red-500">*</span></label>
                                            <Input value={resumeData.referrer_bible_name || ""} onChange={(e) => handleChange("referrer_bible_name", e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Pastor/Teacher Email <span className="text-red-500">*</span></label>
                                            <Input type="email" value={resumeData.referrer_bible_email || ""} onChange={(e) => handleChange("referrer_bible_email", e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* --- Questionnaire --- */}
                        {currentStepKey === "questionnaire" && (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Please list your current or past involvement... <span className="text-red-500">*</span></label>
                                    <textarea
                                        className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        value={resumeData.q_involvement || ""}
                                        onChange={(e) => handleChange("q_involvement", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Why do you want to be a Student Ambassador? <span className="text-red-500">*</span></label>
                                    <textarea
                                        className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        value={resumeData.q_why_ambassador || ""}
                                        onChange={(e) => handleChange("q_why_ambassador", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Have you accepted Jesus Christ as your Lord and Savior? <span className="text-red-500">*</span></label>
                                    <textarea
                                        className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        value={resumeData.q_faith || ""}
                                        onChange={(e) => handleChange("q_faith", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">What do you love most about Linfield? <span className="text-red-500">*</span></label>
                                    <textarea
                                        className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        value={resumeData.q_love_linfield || ""}
                                        onChange={(e) => handleChange("q_love_linfield", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">What would you change about Linfield? <span className="text-red-500">*</span></label>
                                    <textarea
                                        className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        value={resumeData.q_change_linfield || ""}
                                        onChange={(e) => handleChange("q_change_linfield", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Why did you/your family decide to attend Linfield? <span className="text-red-500">*</span></label>
                                    <textarea
                                        className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        value={resumeData.q_family_decision || ""}
                                        onChange={(e) => handleChange("q_family_decision", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Personal Strengths <span className="text-red-500">*</span></label>
                                    <textarea
                                        className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        value={resumeData.q_strengths || ""}
                                        onChange={(e) => handleChange("q_strengths", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Personal Weaknesses <span className="text-red-500">*</span></label>
                                    <textarea
                                        className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        value={resumeData.q_weaknesses || ""}
                                        onChange={(e) => handleChange("q_weaknesses", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Time Commitment (Monthly) <span className="text-red-500">*</span></label>
                                    <textarea
                                        className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        value={resumeData.q_time_commitment || ""}
                                        onChange={(e) => handleChange("q_time_commitment", e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Validation Error */}
                {stepError && (
                    <Alert variant="destructive" className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{stepError}</AlertDescription>
                    </Alert>
                )}

                {/* Confirm Submit Banner */}
                {confirmingSubmit && (
                    <Alert className="mt-4 bg-amber-50 border-amber-200 text-amber-800">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertDescription>
                            Are you sure? This cannot be undone. Click <strong>Submit</strong> again to confirm.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Footer */}
                <div className="mt-8 pt-6 border-t flex justify-between items-center bg-card">
                    <Button
                        variant="secondary"
                        onClick={handleBack}
                        disabled={currentStepIndex === 0 || isLoading || isSubmitting}
                        className={cn(currentStepIndex === 0 && "opacity-0 pointer-events-none")}
                    >
                        <ChevronLeft className="w-4 h-4" /> Back
                    </Button>

                    <div className="flex items-center gap-2">
                        {currentStepKey !== "contact" && (
                            <Button
                                variant="outline"
                                onClick={handleSave}
                                disabled={isSaving || isSubmitting}
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                <span className="hidden sm:inline">Save</span>
                            </Button>
                        )}

                        {currentStepIndex === stepKeys.length - 1 ? (
                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting || isSaving}
                                className="min-w-[140px]"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Submit</>}
                            </Button>
                        ) : (
                            <Button
                                onClick={handleNext}
                                disabled={isLoading || isSaving}
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Next <ChevronRight className="w-4 h-4" /></>}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {isAuthenticated && (
                <div className="mt-6 text-center">
                    <SignOutButton variant="ghost" className="text-muted-foreground text-sm" />
                </div>
            )}
        </div>
    );
}
