import { z } from "zod";

export const loginSchema = z
  .object({
    method: z.enum(["username", "email", "phone"]),
    username: z.string().optional().or(z.literal("")),
    email: z.string().optional().or(z.literal("")),
    phoneCountryCode: z.string().optional(),
    phoneNumber: z
      .string()
      .regex(/^\d{10}$/, "Telefon numarası 10 haneli olmalı")
      .optional()
      .or(z.literal("")),
    password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
  })
  .refine(
    (data) => {
      if (data.method === "username") return !!data.username;
      if (data.method === "email") return !!data.email;
      return !!data.phoneNumber && data.phoneNumber.length === 10;
    },
    {
      message: "Bu alan zorunlu",
      path: ["username"],
    }
  );
export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z.string().min(3, "Ad soyad en az 3 karakter olmalı"),
    username: z.string().min(3, "Kullanıcı adı en az 3 karakter olmalı"),
    contactMethod: z.enum(["email", "phone"]),
    email: z.string().email("Geçerli bir email girin").optional().or(z.literal("")),
    phoneCountryCode: z.string().optional(),
    phoneNumber: z
      .string()
      .regex(/^\d{10}$/, "Telefon numarası 10 haneli olmalı")
      .optional()
      .or(z.literal("")),
    password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
    passwordConfirm: z.string(),
    gender: z.enum(["ERKEK", "KADIN"], { message: "Cinsiyet seçin" }),
  })
  .refine(
    (data) =>
      data.contactMethod === "email"
        ? !!data.email
        : !!data.phoneNumber && data.phoneNumber.length === 10,
    {
      message:
        "Email veya telefon numarasından biri zorunlu — telefon tam 10 haneli olmalı",
      path: ["email"],
    }
  )
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Şifreler eşleşmiyor",
    path: ["passwordConfirm"],
  });
export type RegisterFormValues = z.infer<typeof registerSchema>;

export const profileSchema = z.object({
  dateOfBirth: z.string().optional().or(z.literal("")),
  education: z.enum(["ILKOGRETIM", "LISE", "ONLISANS", "LISANS", "DOKTORA"]).optional(),
  occupation: z
    .enum(["OGRENCI", "ISSIZ", "SERBEST_MESLEK", "OZEL_SEKTOR", "KAMU", "YONETICI"])
    .optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});
export type ProfileFormValues = z.infer<typeof profileSchema>;

export const requestResetSchema = z.object({
  email: z.string().email("Geçerli bir email girin"),
});
export type RequestResetFormValues = z.infer<typeof requestResetSchema>;

export const confirmResetSchema = z
  .object({
    token: z.string().min(1, "Kod gerekli"),
    newPassword: z.string().min(6, "Şifre en az 6 karakter olmalı"),
    newPasswordConfirm: z.string(),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    message: "Şifreler eşleşmiyor",
    path: ["newPasswordConfirm"],
  });
export type ConfirmResetFormValues = z.infer<typeof confirmResetSchema>;
