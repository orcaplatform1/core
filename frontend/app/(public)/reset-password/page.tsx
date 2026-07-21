"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { apiClient, ApiError } from "@/lib/api-client";
import {
  requestResetSchema,
  confirmResetSchema,
  type RequestResetFormValues,
  type ConfirmResetFormValues,
} from "@/lib/schemas/auth";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"request" | "confirm">("request");

  const requestForm = useForm<RequestResetFormValues>({
    resolver: zodResolver(requestResetSchema),
  });
  const confirmForm = useForm<ConfirmResetFormValues>({
    resolver: zodResolver(confirmResetSchema),
  });

  const onRequest = async (values: RequestResetFormValues) => {
    try {
      await apiClient("/auth/password-reset/request", {
        method: "POST",
        body: values,
        auth: false,
      });
      toast.success("Kod gönderildi", { description: "Email adresini kontrol et." });
      setStep("confirm");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Bir sorun oluştu, tekrar dene.");
    }
  };

  const onConfirm = async (values: ConfirmResetFormValues) => {
    try {
      await apiClient("/auth/password-reset/confirm", {
        method: "POST",
        body: { token: values.token, newPassword: values.newPassword },
        auth: false,
      });
      toast.success("Şifren güncellendi", { description: "Şimdi giriş yapabilirsin." });
      router.push("/login");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Kod hatalı ya da süresi dolmuş.");
    }
  };

  return (
    <AuthShell>
      <div className="auth-card mx-auto w-full max-w-md rounded-2xl border border-primary/15 bg-card p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-foreground">Şifremi Unuttum</h1>
        <p className="auth-description mt-1 text-sm">
          {step === "request"
            ? "Kayıtlı email adresini gir, sana bir sıfırlama kodu gönderelim."
            : "Email'ine gelen kodu ve yeni şifreni gir."}
        </p>

        {step === "request" ? (
          <form onSubmit={requestForm.handleSubmit(onRequest)} className="mt-8 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" {...requestForm.register("email")} />
              {requestForm.formState.errors.email && (
                <span className="text-xs text-danger">
                  {requestForm.formState.errors.email.message}
                </span>
              )}
            </div>
            <Button type="submit" disabled={requestForm.formState.isSubmitting} className="mt-2 h-12">
              {requestForm.formState.isSubmitting ? "Gönderiliyor..." : "Kod Gönder"}
            </Button>
          </form>
        ) : (
          <form onSubmit={confirmForm.handleSubmit(onConfirm)} className="mt-8 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="token">Doğrulama Kodu *</Label>
              <Input id="token" {...confirmForm.register("token")} />
              {confirmForm.formState.errors.token && (
                <span className="text-xs text-danger">
                  {confirmForm.formState.errors.token.message}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="newPassword">Yeni Şifre *</Label>
              <PasswordInput id="newPassword" {...confirmForm.register("newPassword")} />
              {confirmForm.formState.errors.newPassword && (
                <span className="text-xs text-danger">
                  {confirmForm.formState.errors.newPassword.message}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="newPasswordConfirm">Yeni Şifre (Tekrar) *</Label>
              <PasswordInput id="newPasswordConfirm" {...confirmForm.register("newPasswordConfirm")} />
              {confirmForm.formState.errors.newPasswordConfirm && (
                <span className="text-xs text-danger">
                  {confirmForm.formState.errors.newPasswordConfirm.message}
                </span>
              )}
            </div>
            <Button type="submit" disabled={confirmForm.formState.isSubmitting} className="mt-2 h-12">
              {confirmForm.formState.isSubmitting ? "Güncelleniyor..." : "Şifreyi Güncelle"}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            Giriş sayfasına dön
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
