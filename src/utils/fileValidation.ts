const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_SIZE_MB = 5;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

export class FileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileValidationError';
  }
}

/**
 * Validates an image file before upload.
 * Throws FileValidationError with a user-friendly message on failure.
 */
export function validateImageFile(file: File, maxSizeMB = MAX_IMAGE_SIZE_MB): void {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new FileValidationError(
      `Tipo de arquivo não suportado: ${file.type || 'desconhecido'}. Use JPEG, PNG, WebP ou GIF.`
    );
  }

  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
    throw new FileValidationError(
      `Arquivo muito grande: ${sizeMB} MB. O tamanho máximo permitido é ${maxSizeMB} MB.`
    );
  }
}

/** Same as validateImageFile but returns an error string instead of throwing. */
export function getImageFileError(file: File, maxSizeMB = MAX_IMAGE_SIZE_MB): string | null {
  try {
    validateImageFile(file, maxSizeMB);
    return null;
  } catch (e) {
    if (e instanceof FileValidationError) return e.message;
    return 'Erro ao validar arquivo.';
  }
}
