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

export interface OrderProductItem {
  id: string;
  product: string;
  quantity: number;
  customRequest: string;
  images: UploadedImage[];
}

export interface OrderFormData {
  zaloName: string;
  phone: string;
  deliveryMethod: 'shop' | 'home';
  shippingAddress: string;
  recipientPhone?: string;
  deadline: string;
  items: OrderProductItem[];
  // Backward compatibility fields
  product?: string;
  customRequest?: string;
  printContent?: string;
  notes?: string;
  images?: UploadedImage[];
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
    items?: Array<{
      product: string;
      quantity: number;
      customRequest?: string;
      imagesCount: number;
    }>;
  };
}

export interface GasConfiguration {
  scriptUrl: string;
  parentFolderId: string;
  sheetName: string;
}
