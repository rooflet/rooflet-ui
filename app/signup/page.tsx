"use client";

import type React from "react";

import { RoofletLogo } from "@/components/rooflet-logo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api-client";
import { createUser } from "@/lib/api/users";
import { ROUTES } from "@/lib/constants/routes";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null); // Clear any previous errors

    try {
      // Validate passwords match
      if (formData.password !== formData.confirmPassword) {
        const errorMsg = "Please make sure your passwords match";
        setError(errorMsg);
        toast({
          title: "Passwords don't match",
          description: errorMsg,
          variant: "destructive",
        });
        return;
      }

      // Validate password length
      if (formData.password.length < 8) {
        const errorMsg = "Password must be at least 8 characters";
        setError(errorMsg);
        toast({
          title: "Password too short",
          description: errorMsg,
          variant: "destructive",
        });
        return;
      }

      // Call the real API
      const userResponse = await createUser({
        fullName: formData.name,
        email: formData.email,
        password: formData.password,
      });

      // Store user data
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("userEmail", userResponse.email);
      localStorage.setItem("userName", userResponse.fullName);
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: userResponse.id,
          email: userResponse.email,
          fullName: userResponse.fullName,
        })
      );

      toast({
        title: "Account created successfully",
        description: "Welcome to Rooflet!",
      });

      // Redirect to onboarding
      router.push(ROUTES.ONBOARDING);
    } catch (error) {
      console.error("Signup error:", error);

      let errorMessage = "An unexpected error occurred. Please try again.";

      if (error instanceof ApiError) {
        // Extract specific error messages from API response
        if (error.data?.message) {
          errorMessage = error.data.message;
        } else if (error.message) {
          errorMessage = error.message;
        }

        // Handle specific error cases
        if (
          error.status === 400 &&
          errorMessage.toLowerCase().includes("email")
        ) {
          errorMessage =
            "An account with this email already exists. Please use a different email or try signing in.";
        } else if (
          error.status === 400 &&
          errorMessage.toLowerCase().includes("username")
        ) {
          errorMessage =
            "This username is already taken. Please choose a different one.";
        } else if (error.status === 422) {
          errorMessage = "Please check your information and try again.";
        }
      }

      setError(errorMessage);
      toast({
        title: "Signup failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <RoofletLogo className="size-12" showBackground={true} />
          </div>
          <CardTitle className="text-2xl font-bold">
            Create an account
          </CardTitle>
          <CardDescription>
            Enter your information to get started with Rooflet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (error) setError(null);
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (error) setError(null);
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (error) setError(null);
                  }}
                  className={
                    formData.password.length > 0 && formData.password.length < 8
                      ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                      : formData.password.length >= 8
                      ? "border-green-500 focus:ring-green-500 focus:border-green-500"
                      : ""
                  }
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <div className="text-sm flex items-center gap-2">
                <span
                  className={
                    formData.password.length >= 8
                      ? "text-green-600"
                      : "text-muted-foreground"
                  }
                >
                  At least 8 characters
                </span>
                {formData.password.length > 0 && (
                  <span
                    className={
                      formData.password.length >= 8
                        ? "text-green-600"
                        : "text-red-500"
                    }
                  >
                    ({formData.password.length}/8)
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                Confirm Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    });
                    if (error) setError(null);
                  }}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={
                isLoading ||
                !formData.name.trim() ||
                !formData.email.trim() ||
                !formData.password.trim() ||
                !formData.confirmPassword.trim() ||
                formData.password !== formData.confirmPassword ||
                formData.password.length < 8
              }
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-muted-foreground">
            Already have an account?{" "}
            <Link href={ROUTES.LOGIN} className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
