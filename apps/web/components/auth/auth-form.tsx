"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/browser";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const isSignup = mode === "sign-up";

  const heading = useMemo(
    () => ({
      title: isSignup ? "Create your family login" : "Welcome back",
      description: isSignup
        ? "Parents can pre-check-in from home, view their live security code, and receive updates."
        : "Volunteers, admins, and families all use the same secure login.",
      button: isSignup ? "Create account" : "Sign in",
    }),
    [isSignup],
  );

  function goToWorkspace(role?: string | null) {
    if (role === "volunteer" || role === "admin") {
      router.push("/dashboard");
    } else {
      router.push("/parent");
    }
    router.refresh();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const supabase = createClient();

      if (isSignup) {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              phone,
            },
          },
        });

        if (error) {
          toast.error(error.message);
          return;
        }

        if (!data.session) {
          toast.success("Account created. Check your email for the confirmation link.");
          router.push("/sign-in");
          return;
        }

        toast.success("Account created.");
        goToWorkspace("parent");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .single();

      toast.success("Signed in.");
      goToWorkspace(profile?.role ?? "parent");
    });
  }

  return (
    <Card className="glass-panel w-full max-w-xl overflow-hidden border-white/90 p-0 shadow-glow">
      <div className="h-1.5 bg-gradient-to-r from-orange-500 via-orange-300 to-amber-200" />
      <CardHeader className="px-6 pb-6 pt-6 sm:px-8 sm:pt-8">
        <CardTitle className="text-3xl">{heading.title}</CardTitle>
        <CardDescription>{heading.description}</CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8">
        <form className="space-y-5" onSubmit={handleSubmit}>
          {isSignup ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="full-name">Full name</Label>
                <Input
                  id="full-name"
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Jordan Rivera"
                  required
                  value={fullName}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Mobile phone</Label>
                <Input
                  id="phone"
                  inputMode="tel"
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="(555) 555-5555"
                  required
                  value={phone}
                />
              </div>
            </>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              required
              type="password"
              value={password}
            />
          </div>
          <Button className="w-full" disabled={pending} size="lg" type="submit">
            {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {heading.button}
          </Button>
          <p className="text-center text-xs leading-6 text-slate-500">
            Secure sign-in powered by Supabase Auth with family-only access controls.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
