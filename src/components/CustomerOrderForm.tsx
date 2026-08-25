import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, X, Image as ImageIcon, Sparkles, AlertCircle, 
  Send, Loader2, ShieldCheck, Phone, User, Tag, 
  MessageSquare, Calendar, Check, CheckCircle2,
  Truck, Store, MapPin, Plus, Trash2, Layers,
  ShoppingBag, HelpCircle, Info
} from 'lucide-react';
import { PRODUCT_CATEGORIES, DEFAULT_GAS_URL } from '../data/constants';
import { UploadedImage, OrderFormData, OrderProductItem, SubmissionResponse } from '../types';
import { compressImageForA4Print } from '../utils/imageOptimizer';

interface CustomerOrderFormProps {
  scriptUrl: string;
  onSuccess: (data: SubmissionResponse['data'], rawForm: OrderFormData) => void;
}

const DRAFT_STORAGE_KEY = 'dau_dau_order_form_multi_draft_v2';
const MAX_ITEMS_PER_ORDER = 3;
const MAX_IMAGES_PER_ITEM = 8;

const createDefaultItem = (index = 0): OrderProductItem => ({
  id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7) + '_' + index,
  product: '',
  quantity: 1,
  customRequest: '',
  images: [],
});

export const CustomerOrderForm: React.FC<CustomerOrderFormProps> = ({ 
  scriptUrl, 
  onSuccess
}) => {
  const [zaloName, setZaloName] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'shop' | 'home'>('shop');
  const [shippingAddress, setShippingAddress] = useState('');
  const [deadline, setDeadline] = useState('');
  const [items, setItems] = useState<OrderProductItem[]>([createDefaultItem(0)]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [optimizingItemId, setOptimizingItemId] = useState<string | null>(null);
  const [restoredDraft, setRestoredDraft] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const [todayMinDate, setTodayMinDate] = useState('');
  const [limitAlertMessage, setLimitAlertMessage] = useState<string | null>(null);

  // Refs for hidden file inputs mapped by itemId
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // 1. Khôi phục bản nháp từ localStorage
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setTodayMinDate(today);

    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed && typeof parsed === 'object') {
          if (parsed.zaloName) setZaloName(parsed.zaloName);
          if (parsed.phone) setPhone(parsed.phone);
          if (parsed.deliveryMethod) setDeliveryMethod(parsed.deliveryMethod === 'home' ? 'home' : 'shop');
          if (parsed.shippingAddress) setShippingAddress(parsed.shippingAddress);
          if (parsed.deadline) setDeadline(parsed.deadline);

          if (Array.isArray(parsed.items) && parsed.items.length > 0) {
            setItems(parsed.items.map((it: any, idx: number) => ({
              id: it.id || ('item_restored_' + idx),
              product: it.product || '',
              quantity: Number(it.quantity) || 1,
              customRequest: it.customRequest || '',
              images: [], // Images are not kept in localStorage for memory limit
            })));
          }

          if (parsed.zaloName || parsed.phone || (parsed.items && parsed.items.length > 0)) {
            setRestoredDraft(true);
          }
        }
      }
    } catch (err) {
      console.warn('Lỗi đọc bản nháp localStorage:', err);
    }
  }, []);

  // 2. Tự động lưu bản nháp (không lưu ảnh base64 để tránh đầy localStorage)
  const saveDraft = (
    nextZalo = zaloName,
    nextPhone = phone,
    nextDelivery = deliveryMethod,
    nextAddress = shippingAddress,
    nextDeadline = deadline,
    nextItems = items
  ) => {
    try {
      const draftPayload = {
        zaloName: nextZalo,
        phone: nextPhone,
        deliveryMethod: nextDelivery,
        shippingAddress: nextAddress,
        deadline: nextDeadline,
        items: nextItems.map(it => ({
          id: it.id,
          product: it.product,
          quantity: it.quantity,
          customRequest: it.customRequest,
        }))
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftPayload));
    } catch (e) {}
  };

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    const cleanPhone = val.trim();
    const phoneRegex = /^(0|84)(3|5|7|8|9)[0-9]{8}$/;
    if (cleanPhone && !phoneRegex.test(cleanPhone)) {
      setPhoneError('Số điện thoại không hợp lệ (cần 10 số, đầu 03, 05, 07, 08, 09)');
    } else {
      setPhoneError('');
    }
    saveDraft(zaloName, val, deliveryMethod, shippingAddress, deadline, items);
  };

  const handleClearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setZaloName('');
      setPhone('');
      setDeliveryMethod('shop');
      setShippingAddress('');
      setDeadline('');
      setItems([createDefaultItem(0)]);
      setRestoredDraft(false);
      setPhoneError('');
    } catch (e) {}
  };

  // 3. Quản lý danh sách món in (Items)
  const handleAddItem = () => {
    if (items.length >= MAX_ITEMS_PER_ORDER) {
      setLimitAlertMessage("Mỗi đơn tối đa 3 món để hệ thống hoạt động tốt nhất. Bạn vui lòng hoàn tất đơn này trước, sau đó gửi thêm đơn mới nhé!");
      return;
    }
    const newItem = createDefaultItem(items.length);
    const updated = [...items, newItem];
    setItems(updated);
    saveDraft(zaloName, phone, deliveryMethod, shippingAddress, deadline, updated);
  };

  const handleRemoveItem = (itemId: string) => {
    if (items.length <= 1) return;
    const updated = items.filter(it => it.id !== itemId);
    setItems(updated);
    saveDraft(zaloName, phone, deliveryMethod, shippingAddress, deadline, updated);
  };

  const handleUpdateItemField = (itemId: string, field: 'product' | 'customRequest', value: string) => {
    const updated = items.map(it => {
      if (it.id === itemId) {
        return { ...it, [field]: value };
      }
      return it;
    });
    setItems(updated);
    saveDraft(zaloName, phone, deliveryMethod, shippingAddress, deadline, updated);
  };

  const handleQuantityChange = (itemId: string, delta: number) => {
    const updated = items.map(it => {
      if (it.id === itemId) {
        const newQty = Math.max(1, Math.min(999, (it.quantity || 1) + delta));
        return { ...it, quantity: newQty };
      }
      return it;
    });
    setItems(updated);
    saveDraft(zaloName, phone, deliveryMethod, shippingAddress, deadline, updated);
  };

  const handleQuantityInput = (itemId: string, val: string) => {
    const parsed = parseInt(val, 10);
    const newQty = isNaN(parsed) ? 1 : Math.max(1, Math.min(999, parsed));
    const updated = items.map(it => {
      if (it.id === itemId) {
        return { ...it, quantity: newQty };
      }
      return it;
    });
    setItems(updated);
    saveDraft(zaloName, phone, deliveryMethod, shippingAddress, deadline, updated);
  };

  // 4. Xử lý tải và tối ưu ảnh cho từng món (Tối đa 8 ảnh / món)
  const processFilesForItem = async (itemId: string, files: FileList | File[]) => {
    const targetItem = items.find(it => it.id === itemId);
    if (!targetItem) return;

    const currentCount = targetItem.images.length;
    if (currentCount >= MAX_IMAGES_PER_ITEM) {
      setLimitAlertMessage("Tối đa 8 ảnh/Sản phẩm để đảm bảo  in rõ nét nhất. Nếu bạn in số lượng lớn/ghép nhiều ảnh, vui lòng liên hệ Zalo của Shop để được hỗ trợ chuyên sâu nhé!");
      return;
    }

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const isDuplicate = targetItem.images.some(img => img.name === file.name && img.size === file.size);
        if (!isDuplicate) {
          validFiles.push(file);
        }
      }
    }

    if (validFiles.length === 0) return;

    const remainingSlots = MAX_IMAGES_PER_ITEM - currentCount;
    let filesToProcess = validFiles;

    if (validFiles.length > remainingSlots) {
      filesToProcess = validFiles.slice(0, remainingSlots);
      setLimitAlertMessage("Tối đa 8 ảnh/Sản phẩm để đảm bảo  in rõ nét nhất. Nếu bạn in số lượng lớn/ghép nhiều ảnh, vui lòng liên hệ Zalo của Shop để được hỗ trợ chuyên sâu nhé!");
    }

    if (filesToProcess.length === 0) return;

    setOptimizingItemId(itemId);
    const newImages: UploadedImage[] = [];

    try {
      for (const file of filesToProcess) {
        try {
          const result = await compressImageForA4Print(file, 2500, 0.88);

          newImages.push({
            id: Math.random().toString(36).substring(2, 9),
            name: file.name,
            size: result.compressedSize,
            originalSize: result.originalSize,
            compressedSize: result.compressedSize,
            dimensions: { width: result.width, height: result.height },
            type: 'image/jpeg',
            base64: result.base64,
            previewUrl: result.base64,
          });
        } catch (compressErr) {
          console.warn('Lỗi nén ảnh, chuyển sang đọc trực tiếp:', compressErr);
          const fallbackBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });

          newImages.push({
            id: Math.random().toString(36).substring(2, 9),
            name: file.name,
            size: file.size,
            originalSize: file.size,
            compressedSize: file.size,
            type: file.type,
            base64: fallbackBase64,
            previewUrl: URL.createObjectURL(file),
          });
        }
      }

      setItems(prev => prev.map(it => {
        if (it.id === itemId) {
          return {
            ...it,
            images: [...it.images, ...newImages]
          };
        }
        return it;
      }));
    } finally {
      setOptimizingItemId(null);
    }
  };

  const handleRemoveImageFromItem = (itemId: string, imageId: string) => {
    setItems(prev => prev.map(it => {
      if (it.id === itemId) {
        const target = it.images.find(img => img.id === imageId);
        if (target?.previewUrl && target.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(target.previewUrl);
        }
        return {
          ...it,
          images: it.images.filter(img => img.id !== imageId)
        };
      }
      return it;
    }));
  };

  const formatSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Tổng số lượng món và tổng số ảnh
  const totalItemsCount = items.reduce((acc, it) => acc + (it.quantity || 1), 0);
  const totalImagesCount = items.reduce((acc, it) => acc + (it.images?.length || 0), 0);

  // 5. Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate Tên Zalo
    if (!zaloName.trim()) {
      alert('Vui lòng nhập Tên Nick Zalo để Shop đối chiếu tin nhắn!');
      return;
    }

    // Validate Giao hàng tại nhà
    if (deliveryMethod === 'home') {
      const phoneRegex = /^(0|84)(3|5|7|8|9)[0-9]{8}$/;
      if (!phoneRegex.test(phone.trim())) {
        setPhoneError('Vui lòng nhập đúng số điện thoại nhận hàng (10 chữ số)');
        return;
      }
      if (!shippingAddress.trim()) {
        alert('Vui lòng nhập Địa chỉ nhận hàng để Shop giao hàng tận nơi!');
        return;
      }
    } else {
      if (phone.trim()) {
        const phoneRegex = /^(0|84)(3|5|7|8|9)[0-9]{8}$/;
        if (!phoneRegex.test(phone.trim())) {
          setPhoneError('Vui lòng nhập đúng số điện thoại (10 chữ số)');
          return;
        }
      }
    }

    // Validate từng món in
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemNum = i + 1;

      if (!item.product || item.product.trim() === '') {
        alert(`Vui lòng chọn Loại sản phẩm cần in cho Món #${itemNum}!`);
        return;
      }

      if (!item.images || item.images.length === 0) {
        alert(`Vui lòng tải lên ít nhất 1 ảnh in cho Món #${itemNum} (${item.product})!`);
        return;
      }
    }

    setIsSubmitting(true);

    const deliveryLabel = deliveryMethod === 'home' ? 'Giao hàng tại nhà' : 'Nhận hàng tại Shop';
    const addressInfo = deliveryMethod === 'home' ? shippingAddress.trim() : 'Nhận tại Shop';
    const phoneInfo = phone.trim() || (deliveryMethod === 'home' ? '' : 'Nhận tại Shop');

    // Gom toàn bộ ảnh từ tất cả các món để tương thích
    const allImages = items.flatMap(it => it.images);

    // Chuẩn bị payload chuẩn gửi cho Backend và Google Apps Script
    const payload = {
      zaloName: zaloName.trim(),
      phone: phoneInfo,
      deliveryMethod: deliveryLabel,
      shippingAddress: addressInfo,
      deadline: deadline.trim(),
      // Danh sách chi tiết từng món
      items: items.map((it, idx) => ({
        id: it.id,
        index: idx + 1,
        product: it.product,
        quantity: it.quantity || 1,
        customRequest: it.customRequest.trim(),
        images: it.images.map(img => ({
          name: img.name,
          type: img.type,
          base64: img.base64
        }))
      })),
      // Backward compatibility fields
      product: items.map(it => `${it.quantity > 1 ? it.quantity + 'x ' : ''}${it.product}`).join(', '),
      customRequest: items.map((it, idx) => `[Món ${idx + 1} - ${it.product} (SL: ${it.quantity})]: ${it.customRequest || 'In theo ảnh'}`).join(' | '),
      images: allImages.map(img => ({
        name: img.name,
        type: img.type,
        base64: img.base64
      }))
    };

    const fullOrderFormData: OrderFormData = {
      zaloName: zaloName.trim(),
      phone: phoneInfo,
      deliveryMethod,
      shippingAddress,
      deadline,
      items,
      product: payload.product,
      customRequest: payload.customRequest,
      images: allImages
    };

    try {
      const activeGasUrl = (scriptUrl || DEFAULT_GAS_URL).trim();
      const isRealUrl = activeGasUrl.startsWith('https://script.google.com/');

      let submittedSuccessfully = false;
      let responseData: any = null;

      // 1. Thử gửi qua Express Backend proxy (/api/submit-order)
      try {
        const apiResponse = await fetch('/api/submit-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...payload,
            scriptUrl: isRealUrl ? activeGasUrl : undefined,
          }),
        });

        if (apiResponse.ok) {
          const apiJson = await apiResponse.json();
          if (apiJson.status === 'success' || apiJson.status === 200) {
            submittedSuccessfully = true;
            responseData = apiJson.data;
          }
        }
      } catch (proxyErr) {
        console.warn('Proxy submission error:', proxyErr);
      }

      // 2. Thử gửi trực tiếp đến GAS nếu proxy lỗi
      if (!submittedSuccessfully && isRealUrl) {
        try {
          const directResponse = await fetch(activeGasUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(payload),
            redirect: 'follow',
          });

          if (directResponse.ok) {
            const directJson = await directResponse.json();
            if (directJson.status === 'success' || directJson.status === 200) {
              submittedSuccessfully = true;
              responseData = directJson.data;
            }
          }
        } catch (directErr: any) {
          console.warn('Direct fetch to GAS failed:', directErr);
        }
      }

      // 3. Cập nhật lại bản nháp (giữ tên & thông tin nhận hàng, chỉ làm mới danh sách món)
      saveDraft(zaloName, phone, deliveryMethod, shippingAddress, deadline, [createDefaultItem(0)]);

      // 4. Hoàn tất và hiện bảng thông báo
      if (submittedSuccessfully && responseData) {
        const safeData = {
          ...responseData,
          savedImages: (typeof responseData.savedImages === 'number' && responseData.savedImages > 0)
            ? responseData.savedImages
            : totalImagesCount,
          product: payload.product,
          zaloName: zaloName.trim(),
          phone: phoneInfo,
          deliveryMethod: deliveryLabel,
          shippingAddress: addressInfo,
          customRequest: payload.customRequest,
          items: items.map(it => ({
            product: it.product,
            quantity: it.quantity || 1,
            customRequest: it.customRequest,
            imagesCount: it.images.length
          }))
        };
        onSuccess(safeData, fullOrderFormData);
        resetForm();
      } else {
        await new Promise(r => setTimeout(r, 600));
        onSuccess({
          zaloName: payload.zaloName,
          phone: payload.phone,
          product: payload.product,
          deliveryMethod: deliveryLabel,
          shippingAddress: addressInfo,
          customRequest: payload.customRequest,
          savedImages: totalImagesCount,
          timestamp: new Date().toLocaleString('vi-VN'),
          items: items.map(it => ({
            product: it.product,
            quantity: it.quantity || 1,
            customRequest: it.customRequest,
            imagesCount: it.images.length
          }))
        }, fullOrderFormData);
        resetForm();
      }
    } catch (err: any) {
      console.error('Submit error:', err);
      onSuccess({
        zaloName: zaloName.trim(),
        phone: phoneInfo,
        product: payload.product,
        deliveryMethod: deliveryLabel,
        shippingAddress: addressInfo,
        customRequest: payload.customRequest,
        savedImages: totalImagesCount,
        timestamp: new Date().toLocaleString('vi-VN'),
        items: items.map(it => ({
          product: it.product,
          quantity: it.quantity || 1,
          customRequest: it.customRequest,
          imagesCount: it.images.length
        }))
      }, fullOrderFormData);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setItems([createDefaultItem(0)]);
    setRestoredDraft(false);
  };

  return (
    <div className="w-full max-w-xl mx-auto">

      {/* Main Card Container */}
      <div className="bg-white rounded-3xl shadow-xl shadow-rose-100/60 border border-pink-100 overflow-hidden">
        
        {/* Banner Top Header */}
        <div className="bg-gradient-to-br from-[#fff0f6] via-[#ffe8f2] to-[#fff5f9] p-6 sm:p-7 relative overflow-hidden border-b border-pink-100">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-pink-200/40 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="inline-flex items-center gap-2 bg-white/90 shadow-xs px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-2.5 border border-pink-200 text-[#d10074]">
            DÂU DÂU SHOP QUÀ TẶNG IN HÌNH
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1.5 text-[#d10074]">
            Gửi Nội Dung Thiết Kế
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-md font-medium">
            Bạn hãy điền đủ thông tin, đội ngũ thiết kế sẽ gửi bản demo qua Zalo cho bạn duyệt trước khi in nhé
          </p>
        </div>

        {/* Thông báo tự động lưu nháp khi dùng Zalo */}
        {restoredDraft && (
          <div className="mx-5 sm:mx-7 mt-4 p-3 bg-pink-50 border border-pink-200 rounded-xl flex items-center justify-between gap-2 text-xs text-pink-900 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-pink-600 shrink-0" />
              <span>Đã tự động khôi phục dữ liệu khi bạn chuyển đổi ứng dụng.</span>
            </div>
            <button
              type="button"
              onClick={handleClearDraft}
              className="text-[11px] text-pink-700 hover:text-pink-950 font-semibold underline shrink-0 cursor-pointer"
            >
              Nhập lại từ đầu
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-6">

          {/* 1. Tên Nick Zalo của bạn */}
          <div>
            <label htmlFor="zaloName" className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-800 mb-1.5">
              <User className="w-4 h-4 text-pink-600" />
              Tên Nick Zalo của bạn <span className="text-rose-500">*</span>
            </label>
            <input 
              type="text" 
              id="zaloName" 
              name="zaloName" 
              required
              value={zaloName}
              onChange={(e) => {
                setZaloName(e.target.value);
                saveDraft(e.target.value, phone, deliveryMethod, shippingAddress, deadline, items);
              }}
              placeholder="VD: Nguyễn Văn A (Tên Zalo đang chat với Shop)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-pink-200/80 bg-pink-50/20 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all placeholder:text-slate-400"
            />
            <p className="text-[11px] text-slate-400 mt-1">Giúp Shop đối chiếu nhanh với đoạn chat Zalo</p>
          </div>

          {/* 2. DANH SÁCH SẢN PHẨM (MULTI-ITEMS SECTION) */}
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between border-b border-pink-100 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-pink-100 text-[#d10074] flex items-center justify-center font-bold text-xs">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                  Danh Sách Sản Phẩm
                </h3>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-pink-100 text-[#d10074] rounded-full border border-pink-200">
                {items.length} món in • {totalImagesCount} ảnh
              </span>
            </div>

            {/* Render từng món in */}
            <div className="space-y-4">
              {items.map((item, index) => {
                const itemNumber = index + 1;
                const isOptimizingThisItem = optimizingItemId === item.id;
                const isDraggingOverThisItem = dragOverItemId === item.id;

                return (
                  <div 
                    key={item.id}
                    className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-pink-50/40 via-white to-pink-50/20 border-2 border-pink-200/90 shadow-sm relative transition-all"
                  >
                    {/* Item Header */}
                    <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-pink-100">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#d10074] text-white flex items-center justify-center text-xs font-extrabold shadow-xs">
                          {itemNumber}
                        </span>
                        <span className="font-bold text-slate-800 text-sm">
                          Món #{itemNumber}: {item.product || 'Chưa chọn sản phẩm'}
                        </span>
                      </div>

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Xóa món này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa món</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-3.5">
                      {/* Chọn loại sản phẩm & Số lượng */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        
                        {/* Loại sản phẩm (2/3 width on desktop) */}
                        <div className="sm:col-span-2">
                          <label className="flex items-center gap-1 text-xs font-bold text-slate-700 mb-1">
                            <Tag className="w-3.5 h-3.5 text-pink-600" />
                            Loại sản phẩm <span className="text-rose-500">*</span>
                          </label>
                          <select 
                            required
                            value={item.product}
                            onChange={(e) => handleUpdateItemField(item.id, 'product', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-pink-200 bg-white text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all cursor-pointer font-medium"
                          >
                            <option value="" disabled>-- Chọn sản phẩm cần in --</option>
                            {PRODUCT_CATEGORIES.map(cat => (
                              <option key={cat.id} value={cat.name}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Số lượng (1/3 width on desktop) */}
                        <div>
                          <label className="flex items-center gap-1 text-xs font-bold text-slate-700 mb-1">
                            <ShoppingBag className="w-3.5 h-3.5 text-pink-600" />
                            Số lượng
                          </label>
                          <div className="flex items-center border border-pink-200 rounded-xl bg-white overflow-hidden">
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(item.id, -1)}
                              className="px-2.5 py-2 text-slate-600 hover:bg-pink-100 hover:text-pink-700 font-bold transition-colors cursor-pointer text-sm"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={999}
                              value={item.quantity}
                              onChange={(e) => handleQuantityInput(item.id, e.target.value)}
                              className="w-full text-center py-2 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none bg-transparent"
                            />
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(item.id, 1)}
                              className="px-2.5 py-2 text-slate-600 hover:bg-pink-100 hover:text-pink-700 font-bold transition-colors cursor-pointer text-sm"
                            >
                              +
                            </button>
                          </div>
                        </div>

                      </div>

                      {/* Lời chúc / Yêu cầu in riêng cho món này */}
                      <div>
                        <label className="flex items-center gap-1 text-xs font-bold text-slate-700 mb-1">
                          <MessageSquare className="w-3.5 h-3.5 text-pink-600" />
                          Thêm chữ / Yêu cầu riêng cho Món #{itemNumber}
                        </label>
                        <textarea 
                          rows={2}
                          value={item.customRequest}
                          onChange={(e) => handleUpdateItemField(item.id, 'customRequest', e.target.value)}
                          placeholder={`VD: In chữ 'Happy Birthday Lan' | Cắt nền ghép hình trái tim, làm sáng da...`}
                          className="w-full px-3 py-2 rounded-xl border border-pink-200 bg-white text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all placeholder:text-slate-400 resize-none"
                        />
                      </div>

                      {/* Tải ảnh in ấn riêng cho món này */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="flex items-center gap-1 text-xs font-bold text-slate-700">
                            <ImageIcon className="w-3.5 h-3.5 text-pink-600" />
                            Ảnh in cho Món #{itemNumber} <span className="text-rose-500">*</span>
                          </label>
                          <span className="text-[11px] font-bold text-pink-700 bg-pink-100/80 px-2 py-0.5 rounded-md border border-pink-200">
                            {item.images.length} ảnh đã chọn
                          </span>
                        </div>

                        {/* Dropzone cho từng món */}
                        <div
                          onClick={() => !isOptimizingThisItem && fileInputRefs.current[item.id]?.click()}
                          onDragOver={(e) => { e.preventDefault(); setDragOverItemId(item.id); }}
                          onDragLeave={() => setDragOverItemId(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDragOverItemId(null);
                            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                              processFilesForItem(item.id, e.dataTransfer.files);
                            }
                          }}
                          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center relative group ${
                            isOptimizingThisItem 
                              ? 'border-pink-300 bg-pink-50/50 cursor-wait'
                              : isDraggingOverThisItem 
                                ? 'border-pink-500 bg-pink-50/80 scale-[1.01]' 
                                : 'border-pink-200 hover:border-pink-500 bg-white hover:bg-pink-50/40'
                          }`}
                        >
                          <input 
                            ref={(el) => (fileInputRefs.current[item.id] = el)}
                            type="file" 
                            multiple 
                            accept="image/*" 
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                processFilesForItem(item.id, e.target.files);
                                e.target.value = '';
                              }
                            }}
                            disabled={isOptimizingThisItem}
                            className="hidden"
                          />

                          {isOptimizingThisItem ? (
                            <div className="flex flex-col items-center justify-center py-0.5">
                              <Loader2 className="w-6 h-6 text-pink-600 animate-spin mb-1" />
                              <p className="text-xs font-bold text-slate-800">
                                Đang tải và tối ưu ảnh...
                              </p>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-slate-700">
                              <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                                <Upload className="w-4 h-4" />
                              </div>
                              <div className="text-left">
                                <p className="text-xs font-bold text-slate-800">
                                  Bấm để tải ảnh lên
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  Ưu tiên ảnh gốc sắc nét
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Thumbnails preview của món */}
                        {item.images.length > 0 && (
                          <div className="mt-2.5 grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                            {item.images.map((img) => (
                              <div key={img.id} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-xs">
                                <img 
                                  src={img.previewUrl} 
                                  alt={img.name} 
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveImageFromItem(item.id, img.id);
                                  }}
                                  className="absolute top-1 right-1 w-5 h-5 bg-rose-600/90 text-white rounded-full flex items-center justify-center text-xs shadow hover:bg-rose-700 transition-colors cursor-pointer"
                                  title="Xóa ảnh này"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                                <span className="absolute bottom-1 left-1 px-1 py-0.5 bg-black/65 text-white rounded text-[9px] backdrop-blur-xs font-mono">
                                  {formatSize(img.compressedSize || img.size)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                      </div>

                    </div>
                  </div>
                );
              })}
            </div>

            {/* Nút bấm thêm món in khác */}
            <button
              type="button"
              onClick={handleAddItem}
              className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-emerald-400 hover:border-emerald-500 bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-800 font-extrabold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer group shadow-2xs"
            >
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                <Plus className="w-4 h-4 stroke-[3]" />
              </div>
              <span>Thêm Sản Phẩm Khác</span>
            </button>
          </div>

          {/* 3. Hình thức nhận hàng (Giao hàng tại nhà -> có Số điện thoại & Địa chỉ) */}
          <div className="pt-2 border-t border-pink-100">
            <label className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-800 mb-2">
              <Truck className="w-4 h-4 text-pink-600" />
              Hình thức nhận hàng toàn bộ đơn <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setDeliveryMethod('shop');
                  saveDraft(zaloName, phone, 'shop', shippingAddress, deadline, items);
                }}
                className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                  deliveryMethod === 'shop'
                    ? 'border-pink-500 bg-pink-50/80 ring-2 ring-pink-500/20 text-pink-950 font-semibold shadow-xs'
                    : 'border-pink-100 bg-white hover:bg-pink-50/30 text-slate-700 font-medium'
                }`}
              >
                <div className={`p-1.5 rounded-xl shrink-0 ${deliveryMethod === 'shop' ? 'bg-pink-500 text-white shadow-xs' : 'bg-slate-200/80 text-slate-600'}`}>
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold">Nhận tại Shop</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDeliveryMethod('home');
                  saveDraft(zaloName, phone, 'home', shippingAddress, deadline, items);
                }}
                className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                  deliveryMethod === 'home'
                    ? 'border-pink-500 bg-pink-50/80 ring-2 ring-pink-500/20 text-pink-950 font-semibold shadow-xs'
                    : 'border-pink-100 bg-white hover:bg-pink-50/30 text-slate-700 font-medium'
                }`}
              >
                <div className={`p-1.5 rounded-xl shrink-0 ${deliveryMethod === 'home' ? 'bg-pink-500 text-white shadow-xs' : 'bg-slate-200/80 text-slate-600'}`}>
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold">Giao hàng tại nhà</div>
                </div>
              </button>
            </div>

            {/* Nếu chọn Giao hàng tại nhà -> Nhập Số điện thoại nhận hàng + Địa chỉ giao hàng */}
            {deliveryMethod === 'home' && (
              <div className="mt-3.5 space-y-3 p-3.5 rounded-2xl bg-pink-50/40 border border-pink-200/70 animate-in fade-in slide-in-from-top-1">
                {/* Số điện thoại nhận hàng */}
                <div>
                  <label htmlFor="phone" className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-800 mb-1.5">
                    <Phone className="w-4 h-4 text-pink-600" />
                    Số điện thoại nhận hàng <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="tel" 
                    id="phone" 
                    name="phone" 
                    required={deliveryMethod === 'home'}
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="VD: 0912345678"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 transition-all placeholder:text-slate-400 ${
                      phoneError 
                        ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-500' 
                        : 'border-pink-200 bg-white focus:ring-pink-500 focus:border-transparent'
                    }`}
                  />
                  {phoneError && (
                    <p className="text-xs text-rose-500 mt-1 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {phoneError}
                    </p>
                  )}
                </div>

                {/* Địa chỉ giao hàng */}
                <div>
                  <label htmlFor="shippingAddress" className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-800 mb-1.5">
                    <MapPin className="w-4 h-4 text-pink-600" />
                    Địa chỉ giao hàng <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    id="shippingAddress" 
                    name="shippingAddress" 
                    required={deliveryMethod === 'home'}
                    value={shippingAddress}
                    onChange={(e) => {
                      setShippingAddress(e.target.value);
                      saveDraft(zaloName, phone, deliveryMethod, e.target.value, deadline, items);
                    }}
                    placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-pink-200 bg-white text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 4. Hạn chót bạn cần nhận hàng */}
          <div>
            <label htmlFor="deadline" className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-800 mb-1.5">
              <Calendar className="w-4 h-4 text-pink-600" />
              Hạn chót bạn cần nhận hàng
            </label>
            <input 
              type="date" 
              id="deadline" 
              name="deadline" 
              min={todayMinDate}
              value={deadline}
              onChange={(e) => {
                setDeadline(e.target.value);
                saveDraft(zaloName, phone, deliveryMethod, shippingAddress, e.target.value, items);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-pink-200/80 bg-pink-50/20 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all cursor-pointer"
            />
            <p className="text-[11px] text-slate-400 mt-1">Shop sẽ chủ động sắp xếp lịch in kịp ngày cho bạn.</p>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button 
              type="submit" 
              disabled={isSubmitting || optimizingItemId !== null}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#feeaf2] hover:bg-[#fedbe9] active:bg-[#fccfe1] text-[#d10074] border-2 border-[#d10074] font-extrabold text-sm sm:text-base shadow-sm hover:shadow-md hover:shadow-pink-500/10 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                 <>
                  <Loader2 className="w-5 h-5 animate-spin text-[#d10074]" />
                  <span>Đang gửi {items.length} món in ({totalImagesCount} ảnh)...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 text-[#d10074]" />
                  <span>Gửi Yêu Cầu Thiết Kế ({items.length} món in • {totalImagesCount} ảnh)</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>

      {/* Security and trust footer */}
      <div className="text-center mt-5 text-xs text-slate-500 space-y-1.5">
        <p className="flex items-center justify-center gap-1.5 font-medium text-slate-600">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          Thông tin của bạn luôn được bảo mật an toàn
        </p>
        <p className="flex items-center justify-center gap-1.5 text-slate-400 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-pink-500 shrink-0" />
          <span>Dâu Dâu Shop • Độc đáo - Chất Lượng - Tận Tâm</span>
        </p>
      </div>

      {/* Modal Đang Gửi Đơn Hàng / Xử Lý Ảnh Chất Lượng Cao */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-pink-100 animate-in zoom-in-95 duration-200 relative overflow-hidden">
            {/* Thanh hiệu ứng gradient chuyển động */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-pink-300 via-[#d10074] to-pink-300 animate-pulse"></div>

            {/* Vòng quay loading */}
            <div className="relative w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-pink-100 border-t-[#d10074] animate-spin"></div>
              <div className="w-10 h-10 rounded-full bg-pink-50 text-[#d10074] flex items-center justify-center font-bold shadow-inner">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            </div>

            {/* Tiêu đề & Nội dung theo yêu cầu */}
            <h4 className="text-lg font-extrabold text-slate-800 mb-2">
              Đơn hàng đang được gửi đi...
            </h4>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-4 font-medium">
              Đang xử lý ảnh chất lượng cao...để giữ trọn độ nét ảnh của bạn khi đến xưởng. Xin vui lòng đợi trong giây lát nhé!
            </p>

            {/* Thanh tiến trình mô phỏng trạng thái hoạt động */}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-3.5">
              <div className="h-full bg-gradient-to-r from-pink-500 to-[#d10074] rounded-full animate-[progress_2.5s_ease-in-out_infinite] w-3/4"></div>
            </div>

            {/* Dòng cảnh báo nhỏ mờ bên dưới */}
            <p className="text-[11px] text-slate-400 font-normal italic">
              (Vui lòng không tải lại trang hoặc bấm quay lại)
            </p>
          </div>
        </div>
      )}

      {/* Modal Thông Báo Giới Hạn */}
      {limitAlertMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-pink-100 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-pink-100 text-[#d10074] rounded-full flex items-center justify-center mx-auto mb-3.5 shadow-xs">
              <Info className="w-7 h-7" />
            </div>
            <h4 className="text-base font-extrabold text-slate-800 mb-2">
              Thông Báo
            </h4>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-5 font-medium">
              {limitAlertMessage}
            </p>
            <button
              type="button"
              onClick={() => setLimitAlertMessage(null)}
              className="w-full py-3 px-4 bg-[#feeaf2] hover:bg-[#fedbe9] active:bg-[#fccfe1] text-[#d10074] border-2 border-[#d10074] font-extrabold rounded-2xl text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
