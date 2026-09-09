const WORKER_URL = "https://ia-upload.karthiktumala143.workers.dev/";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const ALLOWED_EXTENSIONS = [".pdf", ".txt", ".docx", ".csv", ".tsx", ".ts", ".js", ".jsx", ".json", ".md", ".xml", ".html", ".css", ".py", ".java", ".c", ".cpp", ".rb", ".go", ".rs", ".sql", ".yaml", ".yml", ".toml", ".ini", ".cfg", ".log", ".rtf", ".odt", ".ods", ".epub"];

function getFileExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.slice(idx).toLowerCase() : "";
}

function isTextFile(file: File): boolean {
  if (file.type.startsWith("text/")) return true;
  if (file.type === "application/json") return true;
  if (file.type === "application/xml") return true;
  const ext = getFileExtension(file.name);
  return ALLOWED_EXTENSIONS.includes(ext);
}

function getMediaType(file: File): string {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("video/")) return "movies";
  return "texts";
}

export interface UploadResult {
  itemId: string;
  fileName: string;
  instantDownloadUrl: string;
  publicDownloadUrl: string;
  detailsUrl: string;
}

export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `File size exceeds 50 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB)`;
  }
  if (!isTextFile(file)) {
    return `File type "${file.type || getFileExtension(file.name) || "unknown"}" is not supported. Allowed: text-based files (PDF, TXT, DOCX, CSV, code files, etc.)`;
  }
  return null;
}

export async function uploadFileToWorker(file: File): Promise<UploadResult> {
  const error = validateFile(file);
  if (error) throw new Error(error);

  const response = await fetch(WORKER_URL, {
    method: "PUT",
    headers: {
      "X-File-Name": file.name,
      "X-Media-Type": getMediaType(file),
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || "Upload failed");
  }

  return data;
}
