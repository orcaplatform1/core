"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useEffect } from "react";
import { useAuth, ApiError } from "@/context/auth-context";
import { registerSchema, type RegisterFormValues } from "@/lib/schemas/auth";
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

const basicFields = [
  "fullName",
  "contactMethod",
  "email",
  "phoneNumber",
  "password",
  "passwordConfirm",
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/dashboard");
    }
  }, [isLoading, user, router]);
  const [step, setStep] = useState<"basics" | "gender">("basics");
  const {
    register,
    handleSubmit,
    trigger,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { contactMethod: "email", phoneCountryCode: "+90" },
  });

  const contactMethod = watch("contactMethod");

  const goNext = async () => {
    const valid = await trigger(basicFields);
    if (valid) setStep("gender");
  };

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      await registerUser({
        fullName: values.fullName,
        username: values.username,
        email: values.contactMethod === "email" ? values.email || undefined : undefined,
        phone:
          values.contactMethod === "phone"
            ? `${values.phoneCountryCode}${values.phoneNumber}`
            : undefined,
        password: values.password,
        gender: values.gender,
      });
      toast.success("Kayıt başarılı, hoş geldin!");
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error("Bir şeyler ters gitti, tekrar dene.");
      }
    }
  };

  return (
    <AuthShell>
      <div className="mx-auto w-full max-w-md rounded-2xl border border-primary/15 bg-card p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-foreground">Kayıt Ol</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {step === "basics"
            ? "Hemen başlamak için birkaç bilgi yeterli."
            : "Son bir adım kaldı."}
        </p>

        <div className="mt-4 flex gap-2">
          <span className={`h-1 flex-1 rounded-full ${step === "basics" ? "bg-primary" : "bg-primary/40"}`} />
          <span className={`h-1 flex-1 rounded-full ${step === "gender" ? "bg-primary" : "bg-border"}`} />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-5">
          <div className={step === "basics" ? "flex flex-col gap-5" : "hidden"}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="fullName">Ad Soyad *</Label>
              <Input id="fullName" {...register("fullName")} />
              {errors.fullName && (
                <span className="text-xs text-danger">{errors.fullName.message}</span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label>Kayıt Yöntemi *</Label>
              <Controller
                control={control}
                name="contactMethod"
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-2 rounded-xl border border-border p-1">
                    <button
                      type="button"
                      onClick={() => field.onChange("email")}
                      className={`rounded-lg py-2 text-sm font-medium transition-colors duration-200 ${
                        field.value === "email"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Email
                    </button>
                    <button
                      type="button"
                      onClick={() => field.onChange("phone")}
                      className={`rounded-lg py-2 text-sm font-medium transition-colors duration-200 ${
                        field.value === "phone"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Telefon
                    </button>
                  </div>
                )}
              />
            </div>

            {contactMethod === "email" ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" {...register("email")} />
                {errors.email && (
                  <span className="text-xs text-danger">{errors.email.message}</span>
                )}
              </div>
            ) : (
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
                {errors.email && contactMethod === "phone" && (
                  <span className="text-xs text-danger">{errors.email.message}</span>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Şifre *</Label>
              <PasswordInput id="password" {...register("password")} />
              {errors.password && (
                <span className="text-xs text-danger">{errors.password.message}</span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="passwordConfirm">Şifre (Tekrar) *</Label>
              <PasswordInput id="passwordConfirm" {...register("passwordConfirm")} />
              {errors.passwordConfirm && (
                <span className="text-xs text-danger">{errors.passwordConfirm.message}</span>
              )}
            </div>

            <Button type="button" onClick={goNext} className="mt-2 h-12">
              Devam Et
            </Button>
          </div>

          <div className={step === "gender" ? "flex flex-col gap-5" : "hidden"}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Kullanıcı Adı *</Label>
              <Input id="username" {...register("username")} />
              {errors.username && (
                <span className="text-xs text-danger">{errors.username.message}</span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label>Cinsiyet *</Label>
              <p className="text-xs text-muted-foreground">
                Bu bilgiye göre sana özel bir profil avatarı atanacak.
              </p>
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => field.onChange("ERKEK")}
                      className={`flex items-center justify-center text-sm font-semibold ${
                        field.value === "ERKEK" ? "method-tab-active" : "method-tab"
                      }`}
                    >
                      Erkek
                    </button>
                    <button
                      type="button"
                      onClick={() => field.onChange("KADIN")}
                      className={`flex items-center justify-center text-sm font-semibold ${
                        field.value === "KADIN" ? "method-tab-active" : "method-tab"
                      }`}
                    >
                      Kadın
                    </button>
                  </div>
                )}
              />
              {errors.gender && (
                <span className="text-xs text-danger">{errors.gender.message}</span>
              )}
            </div>

            <div className="flex gap-3 mt-2">
              <Button type="button" variant="outline" className="h-12 flex-1" onClick={() => setStep("basics")}>
                Geri
              </Button>
              <Button type="submit" disabled={isSubmitting} className="h-12 flex-1">
                {isSubmitting ? "Kayıt oluşturuluyor..." : "Kayıt Ol"}
              </Button>
            </div>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Zaten hesabın var mı?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Giriş Yap
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
