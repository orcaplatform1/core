"use client";

import { apiClient } from "@/lib/api-client";

export async function uploadReceipt(file: File): Promise<string> {
  const { uploadUrl, key } = await apiClient<{ uploadUrl: string; key: string }>(
    "/storage/upload-url",
    {
      method: "POST",
      body: {
        fileName: file.name,
        contentType: file.type,
        folder: "receipts",
        fileSizeBytes: file.size,
      },
    }
  );

  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) throw new Error("Yükleme başarısız");

  return key;
}
