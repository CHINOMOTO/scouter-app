/**
 * 添付資料（証拠画像・PDF）のクライアント側バリデーション共通ヘルパー
 * 危険なファイル形式（HTML / EXE / SVG / 拡張子なし等）やサイズ超過・大量添付を事前に遮断する
 */

export const MAX_EVIDENCE_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
export const MAX_EVIDENCE_FILES = 10;

const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "pdf"]);
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
]);

export function extractSafeFileExtension(fileName: string): string | null {
  const parts = fileName.trim().split(".");
  if (parts.length < 2) return null;
  const ext = parts[parts.length - 1].toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext) ? ext : null;
}

export function validateEvidenceFiles(
  incomingFiles: File[],
  existingCount: number
): { validFiles: File[]; errors: string[] } {
  const validFiles: File[] = [];
  const errors: string[] = [];

  for (const file of incomingFiles) {
    if (existingCount + validFiles.length >= MAX_EVIDENCE_FILES) {
      errors.push(`添付できるファイルは最大 ${MAX_EVIDENCE_FILES} 件までです。`);
      break;
    }

    const ext = extractSafeFileExtension(file.name);
    const mimeValid = !file.type || ALLOWED_MIME_TYPES.has(file.type.toLowerCase());

    if (!ext || !mimeValid) {
      errors.push(
        `ファイル「${file.name}」は対応していない形式です。画像（JPG / PNG / GIF / WebP）またはPDFのみ添付できます。`
      );
      continue;
    }

    if (file.size <= 0) {
      errors.push(`ファイル「${file.name}」は空のファイルのため添付できません。`);
      continue;
    }

    if (file.size > MAX_EVIDENCE_FILE_SIZE_BYTES) {
      errors.push(
        `ファイル「${file.name}」はサイズが大きすぎます（1ファイルあたり最大50MBまで）。`
      );
      continue;
    }

    validFiles.push(file);
  }

  return { validFiles, errors };
}
