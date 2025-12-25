/**
 * ============================================
 * PROFILE PAGE
 * User profile view and edit
 * ============================================
 */

import React from "react";
import { Link } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faEnvelope,
  faCalendar,
  faShieldHalved,
  faGear,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { useAuthStore } from "@/store";
import dayjs from "dayjs";

export const ProfilePage: React.FC = () => {
  const { user } = useAuthStore();

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground mt-1">
          View and manage your profile information
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar and Basic Info */}
          <div className="flex items-center gap-6">
            <UserAvatar
              name={user.firstName || user.username || "User"}
              src={user.avatar}
              size="xl"
            />
            <div className="flex-1">
              <h2 className="text-2xl font-bold">
                {user.firstName && user.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user.firstName || user.username}
              </h2>
              <p className="text-muted-foreground">@{user.username}</p>
              {user.role === "admin" && (
                <Badge variant="success" className="mt-2">
                  Administrator
                </Badge>
              )}
            </div>
            <Link to="/settings">
              <Button variant="outline">
                <FontAwesomeIcon icon={faGear} className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            </Link>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FontAwesomeIcon icon={faEnvelope} className="w-4 h-4" />
                Email
              </div>
              <p className="font-medium">{user.email}</p>
              {user.emailVerified ? (
                <Badge variant="success" className="mt-1 text-xs">
                  Verified
                </Badge>
              ) : (
                <Badge variant="warning" className="mt-1 text-xs">
                  Not verified
                </Badge>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FontAwesomeIcon icon={faUser} className="w-4 h-4" />
                Username
              </div>
              <p className="font-medium">@{user.username}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FontAwesomeIcon icon={faCalendar} className="w-4 h-4" />
                Member since
              </div>
              <p className="font-medium">
                {dayjs(user.createdAt).format("MMMM D, YYYY")}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FontAwesomeIcon icon={faShieldHalved} className="w-4 h-4" />
                Security
              </div>
              <div className="flex items-center gap-2 mt-1">
                {user.twoFactorEnabled ? (
                  <Badge variant="success">2FA Enabled</Badge>
                ) : (
                  <Badge variant="outline">2FA Disabled</Badge>
                )}
                {user.twoFactorMethod && (
                  <span className="text-xs text-muted-foreground">
                    ({user.twoFactorMethod.toUpperCase()})
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Link to="/settings">
              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <FontAwesomeIcon icon={faGear} className="w-5 h-5 text-primary" />
                  <span className="font-medium">Settings</span>
                </div>
                <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4 text-muted-foreground" />
              </div>
            </Link>
            <Link to="/backup">
              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <FontAwesomeIcon icon={faShieldHalved} className="w-5 h-5 text-primary" />
                  <span className="font-medium">Backup & Restore</span>
                </div>
                <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4 text-muted-foreground" />
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;
