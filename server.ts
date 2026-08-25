import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

interface OrderItem {
  id: string;
  zaloName: string;
  phone: string;
  deliveryMethod?: string;
  shippingAddress?: string;
  product: string;
  customRequest?: string;
  printContent: string;
  deadline: string;
  notes: string;
  imagesCount: number;
  folderUrl?: string;
  timestamp: string;
  status: string;
}

// Default Google Apps Script URL for Dâu Dâu Shop
const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbxNe0-m-90KyGhFIowCgIVYyuqQUJo7k2xVHNkaIl5akYip6Bz-1UpVAyRfdym3c4oH/exec';

// In-memory order storage for preview & local logging
const inMemoryOrders: OrderItem[] = [];

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Increase payload limit for Base64 image uploads (up to 50mb)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Health check API
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Get in-memory orders (for live monitoring)
  app.get('/api/orders', (req, res) => {
    res.json({ status: 'success', data: inMemoryOrders });
  });

  // Proxy / Submit order endpoint
  app.post('/api/submit-order', async (req, res) => {
    try {
      const { scriptUrl, ...payload } = req.body;
      const { zaloName, phone, product, deliveryMethod, shippingAddress, customRequest, printContent, deadline, notes, images } = payload;

      if (!zaloName || !phone) {
        return res.status(400).json({
          status: 'error',
          message: 'Vui lòng cung cấp đầy đủ Tên Zalo và Số điện thoại!'
        });
      }

      const orderId = 'ORD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const timestamp = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      const imagesCount = Array.isArray(images) ? images.length : 0;
      const activeDeliveryMethod = deliveryMethod || 'Nhận hàng tại Shop';
      const activeShippingAddress = shippingAddress || (deliveryMethod === 'Giao hàng tại nhà' ? '' : 'Nhận tại Shop');
      const activeCustomRequest = customRequest || printContent || notes || '';

      // If user provided a real Google Apps Script Web App URL or fallback to default
      const cleanScriptUrl = (scriptUrl || DEFAULT_GAS_URL).trim();
      const isRealGasUrl = cleanScriptUrl.startsWith('https://script.google.com/macros/s/') && 
                           cleanScriptUrl.endsWith('/exec');

      if (isRealGasUrl) {
        try {
          const gasResponse = await fetch(cleanScriptUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(payload),
            redirect: 'follow',
          });

          if (gasResponse.ok) {
            const gasData = await gasResponse.json();
            
            // Ensure savedImages count is populated
            if (gasData && gasData.data) {
              if (typeof gasData.data.savedImages !== 'number' || gasData.data.savedImages <= 0) {
                gasData.data.savedImages = imagesCount;
              }
              if (!gasData.data.product) gasData.data.product = product;
              if (!gasData.data.zaloName) gasData.data.zaloName = zaloName;
              if (!gasData.data.phone) gasData.data.phone = phone;
              if (!gasData.data.deliveryMethod) gasData.data.deliveryMethod = activeDeliveryMethod;
              if (!gasData.data.shippingAddress) gasData.data.shippingAddress = activeShippingAddress;
              if (!gasData.data.customRequest) gasData.data.customRequest = activeCustomRequest;
            }

            // Save to local memory history too
            inMemoryOrders.unshift({
              id: orderId,
              zaloName,
              phone,
              deliveryMethod: activeDeliveryMethod,
              shippingAddress: activeShippingAddress,
              product: product || 'Khác',
              customRequest: activeCustomRequest,
              printContent: printContent || activeCustomRequest,
              deadline: deadline || 'Không gấp',
              notes: notes || '',
              imagesCount,
              folderUrl: gasData.data?.folderUrl,
              timestamp,
              status: 'Đã lưu Google Drive & Sheet'
            });

            return res.json(gasData);
          } else {
            const errText = await gasResponse.text();
            console.error('GAS response error:', gasResponse.status, errText);
            // Fallback gracefully so the order isn't lost
          }
        } catch (gasErr: any) {
          console.error('Error forwarding to Google Apps Script:', gasErr.message);
          // If GAS fails or permissions not approved yet, we record locally
        }
      }

      // Record to local memory log
      inMemoryOrders.unshift({
        id: orderId,
        zaloName,
        phone,
        deliveryMethod: activeDeliveryMethod,
        shippingAddress: activeShippingAddress,
        product: product || 'Khác',
        customRequest: activeCustomRequest,
        printContent: printContent || activeCustomRequest,
        deadline: deadline || 'Không gấp',
        notes: notes || '',
        imagesCount,
        folderUrl: isRealGasUrl ? undefined : 'https://drive.google.com/drive/folders/demo-preview-mode',
        timestamp,
        status: isRealGasUrl ? 'Đang gửi' : 'Chờ xử lý (Bản ghi thử nghiệm)'
      });

      // Keep only last 50 orders in memory
      if (inMemoryOrders.length > 50) {
        inMemoryOrders.pop();
      }

      return res.json({
        status: 'success',
        message: isRealGasUrl 
          ? 'Đã tiếp nhận đơn hàng thành công!' 
          : 'Đã tạo đơn hàng thử nghiệm thành công! Shop sẽ liên hệ gửi bản demo qua Zalo.',
        data: {
          orderId,
          zaloName,
          phone,
          product,
          deliveryMethod: activeDeliveryMethod,
          shippingAddress: activeShippingAddress,
          customRequest: activeCustomRequest,
          savedImages: imagesCount,
          folderUrl: isRealGasUrl ? undefined : 'https://drive.google.com/drive/folders/demo-preview-mode',
          timestamp
        }
      });

    } catch (err: any) {
      console.error('Submit order route error:', err);
      return res.status(500).json({
        status: 'error',
        message: 'Lỗi máy chủ khi xử lý đơn hàng: ' + (err.message || 'Lỗi không xác định')
      });
    }
  });

  // Test GAS connection endpoint
  app.post('/api/test-gas', async (req, res) => {
    const { url } = req.body;
    if (!url || !url.startsWith('https://script.google.com/')) {
      return res.status(400).json({
        status: 'error',
        message: 'URL không hợp lệ. URL phải bắt đầu bằng https://script.google.com/'
      });
    }

    try {
      const testRes = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
      });
      const data = await testRes.json();
      return res.json({ status: 'success', data });
    } catch (err: any) {
      return res.json({
        status: 'warning',
        message: 'Không thể kết nối trực tiếp GET (Google Apps Script có thể yêu cầu quyền hoặc chỉ nhận POST). Hãy thử gửi 1 đơn hàng kiểm tra.'
      });
    }
  });

  // Vite middleware for development vs static for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Zalo Gift Order Collector Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
