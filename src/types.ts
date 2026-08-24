export interface UploadedImage {
  id: string;
  name: string;
  size: number;
  originalSize?: number;
  compressedSize?: number;
  type: string;
  base64: string;
  previewUrl: string;
  dimensions?: { width: number; height: number };
}

export interface OrderFormData {
  zaloName: string;
  phone: string;
  deliveryMethod: 'shop' | 'home';
  shippingAddress: string;
  product: string;
  customRequest: string;
  printContent?: string;
  deadline: string;
  notes?: string;
  images: UploadedImage[];
}

export interface SubmissionResponse {
  status: 'success' | 'error';
  message: string;
  data?: {
    zaloName?: string;
    phone?: string;
    product?: string;
    deliveryMethod?: string;
    shippingAddress?: string;
    customRequest?: string;
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
