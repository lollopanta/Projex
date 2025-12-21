/**
 * ============================================
 * LOGIN PAGE
 * User authentication with 2FA support
 * ============================================
 */

import React, { useState } from "react";
import { Link } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faLock, faShieldHalved } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLogin } from "@/hooks";
import { useAuthStore } from "@/store";

// Validation schemas
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const twoFactorSchema = z.object({
  token: z.string().length(6, "Token must be 6 digits"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type TwoFactorFormData = z.infer<typeof twoFactorSchema>;

export const LoginPage: React.FC = () => {
  const { requires2FA, setRequires2FA } = useAuthStore();
  const loginMutation = useLogin();
  const [loginData, setLoginData] = useState<LoginFormData | null>(null);

  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const {
    register: register2FA,
    handleSubmit: handle2FASubmit,
    formState: { errors: twoFactorErrors },
  } = useForm<TwoFactorFormData>({
    resolver: zodResolver(twoFactorSchema),
  });

  const onLoginSubmit = (data: LoginFormData) => {
    setLoginData(data);
    loginMutation.mutate(data);
  };

  const on2FASubmit = (data: TwoFactorFormData) => {
    if (loginData) {
      loginMutation.mutate({
        ...loginData,
        twoFactorToken: data.token,
      });
    }
  };

  const handleBack = () => {
    setRequires2FA(false);
    setLoginData(null);
  };

  // 2FA Form
  if (requires2FA) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <FontAwesomeIcon icon={faShieldHalved} className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Two-Factor Authentication</CardTitle>
            <CardDescription>
              Enter the 6-digit code from your authenticator app
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handle2FASubmit(on2FASubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="token">Authentication Code</Label>
                <Input
                  id="token"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  className="text-center text-2xl tracking-widest"
                  error={!!twoFactorErrors.token}
                  {...register2FA("token")}
                />
                {twoFactorErrors.token && (
                  <p className="text-sm text-destructive">{twoFactorErrors.token.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" loading={loginMutation.isPending}>
                Verify
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={handleBack}
              >
                Back to login
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Login Form
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>
          Sign in to your account to continue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLoginSubmit(onLoginSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              icon={<FontAwesomeIcon icon={faEnvelope} className="h-4 w-4" />}
              error={!!loginErrors.email}
              {...registerLogin("email")}
            />
            {loginErrors.email && (
              <p className="text-sm text-destructive">{loginErrors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              icon={<FontAwesomeIcon icon={faLock} className="h-4 w-4" />}
              error={!!loginErrors.password}
              {...registerLogin("password")}
            />
            {loginErrors.password && (
              <p className="text-sm text-destructive">{loginErrors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" loading={loginMutation.isPending}>
            Sign in
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">Don't have an account? </span>
          <Link to="/register" className="text-primary font-medium hover:underline">
            Sign up
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default LoginPage;
