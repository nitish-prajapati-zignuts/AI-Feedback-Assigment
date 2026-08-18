"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/context/AuthContext";
import { authSchema, AuthInput } from "@/lib/validation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquareText } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthInput>({
    resolver: zodResolver(authSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = async (data: AuthInput) => {
    setError(null);
    try {
      await login(data.username, data.password);
    } catch (err: any) {
      setError(err.message || "Failed to log in");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <MessageSquareText className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl">Sign In</CardTitle>
            <CardDescription className="mt-1">Enter your credentials to enter the workspace</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input type="text" {...register("username")} placeholder="Username" />
              {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" {...register("password")} placeholder="••••••••" />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing In..." : "Sign In"}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            Need an account?{" "}
            <Link href="/signup" className="font-semibold text-foreground hover:underline">
              Create an account
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
