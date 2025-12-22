/**
 * ============================================
 * VERIFY EMAIL PAGE
 * Handles email verification flow
 * ============================================
 */

import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEnvelope,
  faCheckCircle,
  faCircle,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { authApi } from "@/api";
import { useToast } from "@/store";
import { cn } from "@/lib/utils";

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "idle">("idle");
  const [email, setEmail] = useState("");
  const [isResending, setIsResending] = useState(false);

  const token = searchParams.get("token");
  const success = searchParams.get("success");
  const error = searchParams.get("error");
  const emailParam = searchParams.get("email");

  // Initialize email from URL params
  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  // Handle status based on URL params
  useEffect(() => {
    if (success === "true") {
      setStatus("success");
    } else if (error) {
      setStatus("error");
    } else if (token) {
      // Token verification is handled by backend
      // If token is present, redirect to backend endpoint
      setStatus("loading");
      
      // Redirect to backend verification endpoint
      const verifyUrl = `/api/auth/verify-email?token=${encodeURIComponent(token)}`;
      window.location.href = verifyUrl;
    } else {
      // No token, success, or error - show idle state
      setStatus("idle");
    }
  }, [success, error, token]);

  const handleResend = async () => {
    if (!email) {
      toast.error("Email required", "Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Invalid email", "Please enter a valid email address");
      return;
    }

    setIsResending(true);
    try {
      await authApi.resendVerification(email);
      toast.success("Email sent", "Verification email has been sent. Please check your inbox.");
    } catch (error: unknown) {
      const err = error as Error & { status?: number; response?: { data?: { message?: string; reason?: string } } };
      const errorMessage = err.response?.data?.message || err.message || "Could not send verification email";
      const reason = err.response?.data?.reason;
      
      if (err.status === 503) {
        toast.error("Email service unavailable", errorMessage);
      } else if (err.status === 400) {
        toast.error("Invalid request", errorMessage);
      } else {
        toast.error("Failed to send", errorMessage);
      }
      
      console.error("Resend verification error:", err, reason);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <FontAwesomeIcon
                icon={
                  status === "success"
                    ? faCheckCircle
                    : status === "error"
                    ? faCircle
                    : status === "loading"
                    ? faSpinner
                    : faEnvelope
                }
                className={cn(
                  "w-8 h-8",
                  status === "success" && "text-green-600",
                  status === "error" && "text-red-600",
                  status === "loading" && "text-primary animate-spin",
                  status === "idle" && "text-primary"
                )}
              />
            </div>
            <CardTitle>
              {status === "success"
                ? "Email Verified"
                : status === "error"
                ? "Verification Failed"
                : status === "loading"
                ? "Verifying..."
                : "Verify Your Email"}
            </CardTitle>
            <CardDescription>
              {status === "success"
                ? "Your email has been successfully verified. You can now log in."
                : status === "error"
                ? "The verification link is invalid or has expired."
                : status === "loading"
                ? "Please wait while we verify your email..."
                : "Please check your email and click the verification link."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === "success" && (
              <Button onClick={() => navigate("/login")} className="w-full">
                Go to Login
              </Button>
            )}

            {status === "error" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  If you need a new verification link, enter your email below:
                </p>
                <div className="space-y-2">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={cn(
                      "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                      "placeholder:text-muted-foreground",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    )}
                  />
                  <Button
                    onClick={handleResend}
                    loading={isResending}
                    className="w-full"
                  >
                    Resend Verification Email
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={() => navigate("/login")}
                  className="w-full"
                >
                  Back to Login
                </Button>
              </div>
            )}

            {status === "idle" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  We've sent a verification link to your email address. Please check your inbox
                  and click the link to verify your account.
                </p>
                <div className="space-y-2">
                  <input
                    type="email"
                    placeholder="Enter your email to resend"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={cn(
                      "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                      "placeholder:text-muted-foreground",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    )}
                  />
                  <Button
                    onClick={handleResend}
                    loading={isResending}
                    variant="outline"
                    className="w-full"
                  >
                    Resend Verification Email
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/login")}
                  className="w-full"
                >
                  Back to Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default VerifyEmailPage;
