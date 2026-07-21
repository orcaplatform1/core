"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { notify } from "@/lib/notify";
import { useEffect } from "react";
import { useAuth, ApiError } from "@/context/auth-context";
import { loginSchema, type LoginFormValues } from "@/lib/schemas/auth";
import { countryCodes } from "@/lib/data/country-codes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { AuthShell } from "@/components/layout/auth-shell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const methods = [
  { value: "username", label: "Kullanıcı Adı" },
  { value: "email", label: "E-posta" },
  { value: "phone", label: "Telefon" },
] as const;

export default function GirisPage() {
  const router = useRouter();
  const { login, user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/dashboard");
    }
  }, [isLoading, user, router]);
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { method: "username", phoneCountryCode: "+90" },
  });

  const method = watch("method");

  const onSubmit = async (values: LoginFormValues) => {
    const identifier =
      values.method === "username"
        ? values.username!
        : values.method === "email"
          ? values.email!
          : `${values.phoneCountryCode}${values.phoneNumber}`;

    try {
      await login({ identifier, method: values.method, password: values.password });
      notify.success("Başarıyla giriş yapıldı", "Hoş geldin.");
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        notify.error("Giriş yapılamadı", err.message);
      } else {
        notify.error("Giriş yapılamadı", "Bir şeyler ters gitti, tekrar dene.");
      }
    }
  };

  return (
    <AuthShell>
      <div className="mx-auto w-full max-w-md rounded-2xl border border-primary/15 bg-card p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-foreground">Giriş Yap</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ORCA TRADERS hesabınla devam et.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label>Giriş Yöntemi *</Label>
            <Controller
              control={control}
              name="method"
              render={({ field }) => (
                <div className="grid grid-cols-3 gap-1 rounded-xl border border-border p-1">
                  {methods.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => field.onChange(m.value)}
                      className={`rounded-lg py-2 text-xs font-medium transition-colors duration-200 sm:text-sm ${
                        field.value === m.value
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          {method === "username" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Kullanıcı Adı *</Label>
              <Input id="username" {...register("username")} />
              {errors.username && (
                <span className="text-xs text-danger">{errors.username.message}</span>
              )}
            </div>
          )}

          {method === "email" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-posta *</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.username && (
                <span className="text-xs text-danger">{errors.username.message}</span>
              )}
            </div>
          )}

          {method === "phone" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="phoneNumber">Telefon *</Label>
              <div className="flex gap-2">
                <Controller
                  control={control}
                  name="phoneCountryCode"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-[110px] shrink-0">
                        <SelectValue>
                          {() => {
                            const selected = countryCodes.find(
                              (c) => c.dialCode === field.value
                            );
                            return selected
                              ? `${selected.flag} ${selected.dialCode}`
                              : "+90";
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {countryCodes.map((c) => (
                          <SelectItem key={c.code} value={c.dialCode}>
                            {c.flag} {c.dialCode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <Input
                  id="phoneNumber"
                  inputMode="numeric"
                  maxLength={10}
                  {...register("phoneNumber")}
                />
              </div>
              {errors.phoneNumber && (
                <span className="text-xs text-danger">{errors.phoneNumber.message}</span>
              )}
              {errors.username && (
                <span className="text-xs text-danger">{errors.username.message}</span>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Şifre *</Label>
            <PasswordInput id="password" {...register("password")} />
            {errors.password && (
              <span className="text-xs text-danger">{errors.password.message}</span>
            )}
            <Link
              href="/reset-password"
              className="self-end text-xs text-primary hover:underline"
            >
              Şifremi unuttum
            </Link>
          </div>

          <Button type="submit" disabled={isSubmitting} className="mt-2 h-12">
            {isSubmitting ? "Giriş yapılıyor..." : "Giriş Yap"}
          </Button>
        </form>

        <div className="mt-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">veya</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => notify.info("Google ile giriş yakında aktif olacak")}
            className="flex h-12 items-center justify-center gap-2.5 rounded-xl border border-border bg-secondary text-sm font-medium text-foreground transition-colors duration-200 hover:bg-accent"
          >
            <svg viewBox="0 0 24 24" className="size-5">
              <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.89c2.28-2.1 3.56-5.2 3.56-8.82z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.89-3.02c-1.08.72-2.46 1.15-4.04 1.15-3.1 0-5.73-2.1-6.67-4.92H1.3v3.1A11.99 11.99 0 0 0 12 24z"/>
              <path fill="#FBBC05" d="M5.33 14.31A7.2 7.2 0 0 1 4.96 12c0-.8.14-1.58.37-2.31v-3.1H1.3A11.99 11.99 0 0 0 0 12c0 1.94.46 3.77 1.3 5.41l4.03-3.1z"/>
              <path fill="#EA4335" d="M12 4.77c1.76 0 3.35.6 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.3 6.59l4.03 3.1C6.27 6.87 8.9 4.77 12 4.77z"/>
            </svg>
            Google ile giriş yap
          </button>
          <button
            type="button"
            onClick={() => notify.info("Apple ile giriş yakında aktif olacak")}
            className="flex h-12 items-center justify-center gap-2.5 rounded-xl border border-border bg-secondary text-sm font-medium text-foreground transition-colors duration-200 hover:bg-accent"
          >
            <svg viewBox="0 0 24 24" className="size-5 fill-foreground">
              <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.29-.03-.017-.07-.05-.28-.05-.5 0-1.14.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.155-1.68.03.15.143.36.143.54zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.696.91-1.418 0-2.36-1.29-3.55-2.94C3.42 17.55 2 14.11 2 10.83c0-4.99 3.24-7.63 6.44-7.63 1.49 0 2.734.99 3.67.99.9 0 2.28-1.06 3.98-1.06.65 0 3 .06 4.52 2.27-.12.08-2.71 1.6-2.71 4.83 0 3.87 3.35 5.31 3.5 5.36z"/>
            </svg>
            Apple ile giriş yap
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Hesabın yok mu?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Kayıt Ol
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
