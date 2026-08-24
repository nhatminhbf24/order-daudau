export interface UploadedImage {
  id: string;
  name: string;
  size: number;
  type: string;
  base64: string;
  previewUrl: string;
}

export interface OrderFormData {
  zaloName: string;
  phone: string;
  product: string;
  printContent: string;
  deadline: string;
  notes: string;
  images: UploadedImage[];
}

export interface SubmissionResponse {
  status: 'success' | 'error';
  message: string;
  data?: {
    zaloName?: string;
    phone?: string;
    product?: string;
    folderUrl?: string;
    savedImages?: number;
    timestamp?: string;
    orderId?: string;
  };
}

export interface GasConfiguration {
  scriptUrl: string;
  parentFolderId: string;
  sheetName: string;
}
