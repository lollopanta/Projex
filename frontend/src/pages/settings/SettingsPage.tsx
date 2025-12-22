/**
 * ============================================
 * SETTINGS PAGE
 * User profile, preferences, security, and integrations
 * ============================================
 */

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faPalette,
  faShieldHalved,
  faPlug,
  faMoon,
  faSun,
  faCheck,
  faQrcode,
} from "@fortawesome/free-solid-svg-icons";
import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuthStore, useToast } from "@/store";
import {
  useUpdateProfile,
  useEnable2FA,
  useVerify2FA,
  useDisable2FA,
  useSiteSettings,
  useUpdateSiteSettings,
  useAdminStats,
} from "@/hooks";
import { authApi } from "@/api";
import { googleCalendarApi } from "@/api";
import { cn } from "@/lib/utils";
import { AdminSettingsPanel } from "./AdminSettingsPanel";

// Validation schemas
const profileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// Tab types
type SettingsTab = "profile" | "appearance" | "security" | "integrations" | "admin";

import { faShield } from "@fortawesome/free-solid-svg-icons";

const tabs: { id: SettingsTab; label: string; icon: typeof faUser }[] = [
  { id: "profile", label: "Profile", icon: faUser },
  { id: "appearance", label: "Appearance", icon: faPalette },
  { id: "security", label: "Security", icon: faShieldHalved },
  { id: "integrations", label: "Integrations", icon: faPlug },
  { id: "admin", label: "Admin", icon: faShield },
];

export const SettingsPage: React.FC = () => {
  const { user, setTheme } = useAuthStore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [twoFAData, setTwoFAData] = useState<{
    qrCode: string;
    secret: string;
  } | null>(null);
  const [verifyToken, setVerifyToken] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [showDisable2FADialog, setShowDisable2FADialog] = useState(false);
  const { data: siteSettings } = useSiteSettings();

  // Mutations
  const updateProfileMutation = useUpdateProfile();
  const enable2FAMutation = useEnable2FA();
  const verify2FAMutation = useVerify2FA();
  const disable2FAMutation = useDisable2FA();

  // Profile form
  const {
    register,
    handleSubmit,
    formState: { isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
    },
  });

  const onProfileSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const handleEnable2FA = async () => {
    const result = await enable2FAMutation.mutateAsync();
    setTwoFAData({
      qrCode: result.qrCode,
      secret: result.secret,
    });
    setShow2FADialog(true);
  };

  const handleVerify2FA = () => {
    verify2FAMutation.mutate(verifyToken, {
      onSuccess: () => {
        setShow2FADialog(false);
        setTwoFAData(null);
        setVerifyToken("");
      },
    });
  };

  const handleDisable2FA = () => {
    disable2FAMutation.mutate(disablePassword, {
      onSuccess: () => {
        setShowDisable2FADialog(false);
        setDisablePassword("");
      },
    });
  };

  const handleConnectGoogle = async () => {
    try {
      const { authUrl } = await googleCalendarApi.getAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      toast.error("Failed to connect", "Could not initiate Google Calendar connection");
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await googleCalendarApi.disconnectGoogleCalendar();
      toast.success("Disconnected", "Google Calendar has been disconnected");
    } catch (error) {
      toast.error("Failed to disconnect", "Could not disconnect Google Calendar");
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <nav className="lg:w-48 shrink-0">
          <div className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
            {tabs
              .filter((tab) => tab.id !== "admin" || user?.role === "admin")
              .map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <FontAwesomeIcon icon={tab.icon} className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <Card>
                <CardHeader>
                  <CardTitle>Profile</CardTitle>
                  <CardDescription>
                    Update your personal information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit(onProfileSubmit)} className="space-y-6">
                    {/* Avatar */}
                    <div className="flex items-center gap-4">
                      <UserAvatar
                        name={user?.firstName || user?.username || "User"}
                        src={user?.avatar}
                        size="xl"
                      />
                      <div>
                        <p className="font-medium">{user?.username}</p>
                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                      </div>
                    </div>

                    {/* Name fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First name</Label>
                        <Input id="firstName" {...register("firstName")} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last name</Label>
                        <Input id="lastName" {...register("lastName")} />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={!isDirty}
                      loading={updateProfileMutation.isPending}
                    >
                      Save changes
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Appearance Tab */}
            {activeTab === "appearance" && (
              <Card>
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>
                    Customize the look and feel of the app
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <Label className="mb-3 block">Theme</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => {
                            setTheme("light");
                            // Save to backend
                            updateProfileMutation.mutate({ theme: "light" });
                          }}
                          disabled={updateProfileMutation.isPending}
                          className={cn(
                            "flex items-center gap-3 p-4 rounded-lg border-2 transition-all",
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                            user?.theme === "light"
                              ? "border-primary bg-primary/5"
                              : "border-muted hover:border-muted-foreground/50"
                          )}
                        >
                          <div className="w-10 h-10 rounded-lg bg-white border shadow-sm flex items-center justify-center">
                            <FontAwesomeIcon icon={faSun} className="w-5 h-5 text-yellow-500" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium">Light</p>
                            <p className="text-xs text-muted-foreground">Classic light theme</p>
                          </div>
                          {user?.theme === "light" && (
                            <FontAwesomeIcon icon={faCheck} className="ml-auto text-primary" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setTheme("dark");
                            // Save to backend
                            updateProfileMutation.mutate({ theme: "dark" });
                          }}
                          disabled={updateProfileMutation.isPending}
                          className={cn(
                            "flex items-center gap-3 p-4 rounded-lg border-2 transition-all",
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                            user?.theme === "dark"
                              ? "border-primary bg-primary/5"
                              : "border-muted hover:border-muted-foreground/50"
                          )}
                        >
                          <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center">
                            <FontAwesomeIcon icon={faMoon} className="w-5 h-5 text-slate-400" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium">Dark</p>
                            <p className="text-xs text-muted-foreground">Easy on the eyes</p>
                          </div>
                          {user?.theme === "dark" && (
                            <FontAwesomeIcon icon={faCheck} className="ml-auto text-primary" />
                          )}
                        </button>
                      </div>
                      {updateProfileMutation.isPending && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Saving theme preference...
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <Card>
                <CardHeader>
                  <CardTitle>Security</CardTitle>
                  <CardDescription>
                    Manage your account security settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* 2FA Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FontAwesomeIcon icon={faShieldHalved} className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">Two-Factor Authentication</p>
                            <p className="text-sm text-muted-foreground">
                              Add an extra layer of security to your account
                            </p>
                          </div>
                        </div>
                        {user?.twoFactorEnabled ? (
                          <div className="flex items-center gap-3">
                            <Badge variant="success">
                              {user.twoFactorMethod === "email" ? "Email 2FA" : "TOTP 2FA"}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowDisable2FADialog(true)}
                            >
                              Disable
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            {siteSettings?.allowTOTP2FA && (
                              <Button
                                onClick={handleEnable2FA}
                                loading={enable2FAMutation.isPending}
                                variant="outline"
                              >
                                Enable TOTP
                              </Button>
                            )}
                            {siteSettings?.allowEmail2FA && user?.emailVerified && (
                              <Button
                                onClick={async () => {
                                  try {
                                    await authApi.enableEmail2FA();
                                    toast.success("Email 2FA enabled", "Email-based 2FA has been activated");
                                    // Refresh user data
                                    window.location.reload();
                                  } catch (error) {
                                    toast.error("Failed to enable", (error as Error).message);
                                  }
                                }}
                              >
                                Enable Email 2FA
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      {!user?.emailVerified && siteSettings?.allowEmail2FA && (
                        <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            Email must be verified to use email-based 2FA
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Integrations Tab */}
            {activeTab === "integrations" && (
              <Card>
                <CardHeader>
                  <CardTitle>Integrations</CardTitle>
                  <CardDescription>
                    Connect external services to enhance your workflow
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Google Calendar */}
                    <div className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                          <FontAwesomeIcon icon={faGoogle} className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                          <p className="font-medium">Google Calendar</p>
                          <p className="text-sm text-muted-foreground">
                            Sync tasks with your Google Calendar
                          </p>
                        </div>
                      </div>
                      {user?.googleCalendarAccessToken ? (
                        <div className="flex items-center gap-3">
                          <Badge variant="success">Connected</Badge>
                          <Button variant="outline" size="sm" onClick={handleDisconnectGoogle}>
                            Disconnect
                          </Button>
                        </div>
                      ) : (
                        <Button onClick={handleConnectGoogle}>Connect</Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Admin Tab */}
            {activeTab === "admin" && user?.role === "admin" && <AdminSettingsPanel />}
          </motion.div>
        </div>
      </div>

      {/* 2FA Setup Dialog */}
      <Dialog open={show2FADialog} onOpenChange={setShow2FADialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FontAwesomeIcon icon={faQrcode} />
              Set Up Two-Factor Authentication
            </DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app, then enter the verification code.
            </DialogDescription>
          </DialogHeader>

          {twoFAData && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <img
                  src={twoFAData.qrCode}
                  alt="2FA QR Code"
                  className="w-48 h-48 rounded-lg border"
                />
              </div>

              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Or enter this code manually:</p>
                <code className="text-sm bg-muted px-3 py-1.5 rounded font-mono">
                  {twoFAData.secret}
                </code>
              </div>

              <div className="space-y-2">
                <Label>Verification Code</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  className="text-center text-xl tracking-widest"
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShow2FADialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleVerify2FA}
              loading={verify2FAMutation.isPending}
              disabled={verifyToken.length !== 6}
            >
              Verify & Enable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable 2FA Dialog */}
      <Dialog open={showDisable2FADialog} onOpenChange={setShowDisable2FADialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter your password to disable 2FA. This will make your account less secure.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Password</Label>
            <Input
              type="password"
              placeholder="Enter your password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisable2FADialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisable2FA}
              loading={disable2FAMutation.isPending}
              disabled={!disablePassword}
            >
              Disable 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;
