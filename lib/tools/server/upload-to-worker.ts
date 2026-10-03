/**
 * Upload target for generated files. The worker stores the blob and returns
 * URLs for it.
 */
const WORKER_URL = "https://ia-upload.karthiktumala143.workers.dev/";

const UPLOAD_TIMEOUT_MS = 15_000;

/** PUTs a blob to the upload worker and returns its stored name and URL. */
export async function uploadToWorker(
  blob: Blob,
  filename: string,
  mediaType: string,
): Promise<{ fileName: string; downloadUrl: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(WORKER_URL, {
      method: "PUT",
      headers: {
        "X-File-Name": filename,
        "X-Media-Type": mediaType,
        "Content-Type": mediaType,
        "Content-Length": String(blob.size),
      },
      body: blob,
      signal: controller.signal,
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Upload failed");
    }

    return {
      fileName: data.fileName,
      downloadUrl: data.publicUrl || "",
    };
  } finally {
    clearTimeout(timer);
  }
}
