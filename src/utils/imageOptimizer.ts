/**
 * Tiện ích nén ảnh tối ưu cho in ấn khổ A4 (300 DPI)
 * - Cạnh dài tối đa: 2500px (đảm bảo độ sắc nét in tràn khổ A4)
 * - Định dạng: image/jpeg
 * - Chất lượng nén: 0.88 (giảm dung lượng từ 10-20MB xuống ~1-2MB mà không vỡ nét khi in)
 * - Hoạt động trực tiếp trên trình duyệt qua HTML5 Canvas, không cần thư viện nặng
 */

export interface OptimizedImageResult {
  base64: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
}

export async function compressImageForA4Print(
  file: File,
  maxDimension = 2500,
  quality = 0.88
): Promise<OptimizedImageResult> {
  return new Promise((resolve, reject) => {
    const originalSize = file.size;
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Không thể đọc file ảnh'));

    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Không thể giải mã hình ảnh'));

      img.onload = () => {
        let { width, height } = img;

        // Tính toán kích thước thu nhỏ nếu vượt quá maxDimension (2500px)
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        // Tạo Canvas để vẽ và nén
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Trình duyệt không hỗ trợ Canvas 2D'));
          return;
        }

        // Đổ nền trắng (phòng trường hợp ảnh PNG trong suốt chuyển sang JPEG không bị đen nền)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Bật chế độ làm mịn chất lượng cao
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Vẽ ảnh lên canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Xuất ra Base64 định dạng JPEG chất lượng cao
        const base64 = canvas.toDataURL('image/jpeg', quality);

        // Ước tính dung lượng Base64 sau khi nén
        // Công thức xấp xỉ byte từ base64: (base64String.length - header.length) * 3 / 4
        const base64Data = base64.split(',')[1] || '';
        const compressedSize = Math.round((base64Data.length * 3) / 4);

        resolve({
          base64,
          originalSize,
          compressedSize,
          width,
          height
        });
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
