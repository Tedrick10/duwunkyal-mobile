/**
 * Upload a design image (captured PNG) to the backend.
 * Backend: POST /api/mobile/uploadDesignImage
 * - multipart/form-data with field "image" (file)
 * - Returns { url: "http://..." } or { image_url: "http://..." }
 */
import { apiMobileUrl } from "@/lib/api-config";
import { LocalDataService } from "@/lib/local-data-service";
import { triggerUnauthorized } from "@/lib/on-unauthorized";

export async function uploadDesignImage(filePath: string): Promise<string> {
  const token = await LocalDataService.getStoredToken();
  if (!token) throw new Error("Please sign in to add custom designs");

  const uri = filePath.startsWith("file://") ? filePath : `file://${filePath}`;

  const formData = new FormData();
  formData.append("image", {
    uri,
    name: "design.png",
    type: "image/png",
  } as any);

  const res = await fetch(apiMobileUrl("uploadDesignImage"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (res.status === 401 || res.status === 403) {
    await triggerUnauthorized();
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.message ?? "Failed to upload design image");
  }

  const data = (await res.json()) as { url?: string; image_url?: string };
  const url = data.url ?? data.image_url;
  if (!url || typeof url !== "string") {
    throw new Error("Invalid response from upload");
  }
  return url;
}
