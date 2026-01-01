
export type ImageFormat = 'png' | 'jpeg' | 'webp';

export interface FileRecord {
  id: string;
  file: File;
  previewUrl: string;
  targetFormat: ImageFormat;
  status: 'idle' | 'processing' | 'completed' | 'error';
  convertedBlob?: Blob;
  aiDescription?: string;
  suggestedName?: string;
}

export interface ConversionOptions {
  quality?: number;
}
