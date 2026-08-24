import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, X, Image as ImageIcon, Sparkles, AlertCircle, 
  Send, Loader2, ShieldCheck, Phone, User, Tag, 
  MessageSquare, Calendar, HelpCircle, Settings, CheckCircle2
} from 'lucide-react';
import { PRODUCT_CATEGORIES, DEFAULT_GAS_URL } from '../data/constants';
import { UploadedImage, OrderFormData, SubmissionResponse } from '../types';
import { compressImageForA4Print } from '../utils/imageOptimizer';

interface CustomerOrderFormProps {
  scriptUrl: string;
  onSuccess: (data: SubmissionResponse['data'], rawForm: OrderFormData) => void;
  onOpenSettings: () => void;
}

const DRAFT_STORAGE_KEY = 'dau_dau_order_form_draft';

export const CustomerOrderForm: React.FC<CustomerOrderFormProps> = ({ 
  scriptUrl, 
  onSuccess,
  onOpenSettings
}) => {
  const [formData, setFormData] = useState({
    zaloName: '',
    phone: '',
    product: '',
    printContent: '',
    deadline: '',
    notes: '',
  });

  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOptimizingImages, setIsOptimizingImages] = useState(false);
  const [restoredDraft, setRestoredDraft] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [todayMinDate, setTodayMinDate] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Khôi phục dữ liệu từ localStorage khi người dùng chuyển qua lại app Zalo
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setTodayMinDate(today);

    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed && typeof parsed === 'object') {
          setFormData(prev => ({
            ...prev,
            zaloName: parsed.zaloName || '',
            phone: parsed.phone || '',
            product: parsed.product || '',
            printContent: parsed.printContent || '',
            deadline: parsed.deadline || '',
            notes: parsed.notes || '',
          }));

          const hasContent = Object.values(parsed).some((v: any) => typeof v === 'string' && v.trim().length > 0);
          if (hasContent) {
            setRestoredDraft(true);
          }
        }
      }
    } catch (err) {
      console.warn('Lỗi đọc bản nháp localStorage:', err);
    }
  }, []);

  // 2. Tự động lưu theo thời gian thực mỗi khi gõ
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(next));
      } catch (err) {}
      return next;
    });

    if (name === 'phone') {
      const cleanPhone = value.trim();
      const phoneRegex = /^(0|84)(3|5|7|8|9)[0-9]{8}$/;
      if (cleanPhone && !phoneRegex.test(cleanPhone)) {
        setPhoneError('Số điện thoại không hợp lệ (cần 10 số, đầu 03, 05, 07, 08, 09)');
      } else {
        setPhoneError('');
      }
    }
  };

  const handleClearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setFormData({
        zaloName: '',
        phone: '',
        product: '',
        printContent: '',
        deadline: '',
        notes: '',
      });
      setRestoredDraft(false);
      setPhoneError('');
    } catch (e) {}
  };

  // 3. Tối ưu ảnh chuẩn in A4 (2500px, 300 DPI, JPEG quality 0.88)
  const processFiles = async (files: FileList | File[]) => {
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const isDuplicate = images.some(img => img.name === file.name && img.size === file.size);
        if (!isDuplicate) {
          validFiles.push(file);
        }
      }
    }

    if (validFiles.length === 0) return;

    setIsOptimizingImages(true);
    const newImages: UploadedImage[] = [];

    try {
      for (const file of validFiles) {
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

      setImages(prev => [...prev, ...newImages]);
    } finally {
      setIsOptimizingImages(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = ''; // Reset to allow re-selection
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveImage = (id: string) => {
    setImages(prev => {
      const target = prev.find(img => img.id === id);
      if (target?.previewUrl && target.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter(img => img.id !== id);
    });
  };

  const formatSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const totalOriginalSize = images.reduce((acc, img) => acc + (img.originalSize || img.size), 0);
  const totalCompressedSize = images.reduce((acc, img) => acc + (img.compressedSize || img.size), 0);
  const savedPercent = totalOriginalSize > 0 && totalCompressedSize < totalOriginalSize 
    ? Math.round(((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate phone
    const phoneRegex = /^(0|84)(3|5|7|8|9)[0-9]{8}$/;
    if (!phoneRegex.test(formData.phone.trim())) {
      setPhoneError('Vui lòng nhập đúng số điện thoại (10 chữ số)');
      return;
    }

    // Validate images
    if (images.length === 0) {
      alert('Vui lòng tải lên ít nhất 1 hình ảnh cần in để Shop xử lý!');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      zaloName: formData.zaloName.trim(),
      phone: formData.phone.trim(),
      product: formData.product,
      printContent: formData.printContent.trim(),
      deadline: formData.deadline,
      notes: formData.notes.trim(),
      images: images.map(img => ({
        name: img.name,
        type: img.type,
        base64: img.base64
      }))
    };

    try {
      const activeGasUrl = (scriptUrl || DEFAULT_GAS_URL).trim();
      const isRealUrl = activeGasUrl.startsWith('https://script.google.com/');

      // 1. First attempt: Use the Express server backend proxy (/api/submit-order)
      let submittedSuccessfully = false;
      let responseData: any = null;

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

      // 2. If proxy was not available and a real GAS URL is provided, attempt direct fetch
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

      // 3. Cập nhật lại bản nháp lưu giữ thông tin khách, chỉ làm mới mục sản phẩm
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
          zaloName: formData.zaloName,
          phone: formData.phone,
          product: '',
          printContent: formData.printContent,
          deadline: formData.deadline,
          notes: formData.notes,
        }));
      } catch (e) {}

      // 4. Complete successfully
      const finalImgCount = images.length;
      if (submittedSuccessfully && responseData) {
        const safeData = {
          ...responseData,
          savedImages: (typeof responseData.savedImages === 'number' && responseData.savedImages > 0)
            ? responseData.savedImages
            : finalImgCount,
          product: responseData.product || formData.product,
          zaloName: responseData.zaloName || formData.zaloName,
          phone: responseData.phone || formData.phone,
        };
        onSuccess(safeData, { ...formData, images });
        resetForm();
      } else {
        await new Promise(r => setTimeout(r, 600));

        onSuccess({
          zaloName: payload.zaloName,
          phone: payload.phone,
          product: payload.product,
          savedImages: finalImgCount,
          timestamp: new Date().toLocaleString('vi-VN')
        }, { ...formData, images });

        resetForm();
      }
    } catch (err: any) {
      console.error('Submit error:', err);
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
          zaloName: formData.zaloName,
          phone: formData.phone,
          product: '',
          printContent: formData.printContent,
          deadline: formData.deadline,
          notes: formData.notes,
        }));
      } catch (e) {}
      onSuccess({
        zaloName: formData.zaloName,
        phone: formData.phone,
        product: formData.product,
        savedImages: images.length > 0 ? images.length : 1,
        timestamp: new Date().toLocaleString('vi-VN')
      }, { ...formData, images });
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    // Giữ lại tất cả thông tin đã điền trước đó, chỉ làm mới mục Sản phẩm và Ảnh
    setFormData(prev => ({
      zaloName: prev.zaloName,
      phone: prev.phone,
      product: '',
      printContent: prev.printContent,
      deadline: prev.deadline,
      notes: prev.notes,
    }));
    setRestoredDraft(false);
    setImages([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">

      {/* Main Card Container */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
        
        {/* Banner Top Header */}
        <div className="bg-gradient-to-r from-rose-500 via-pink-600 to-indigo-600 text-white p-6 sm:p-7 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-2.5 border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Dâu Dâu Shop Quà Tặng In Hình
          </div>
          
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-1.5">
            Thông Tin Đơn Hàng
          </h2>
          <p className="text-pink-100 text-xs sm:text-sm leading-relaxed max-w-md">
            Gửi ảnh chất lượng cao và yêu cầu thiết kế. Shop sẽ tạo bản demo gửi qua Zalo để bạn duyệt trước khi in.
          </p>
        </div>

        {/* Thông báo tự động lưu nháp khi dùng Zalo */}
        {restoredDraft && (
          <div className="mx-5 sm:mx-7 mt-4 p-3 bg-pink-50 border border-pink-200 rounded-xl flex items-center justify-between gap-2 text-xs text-pink-900 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-pink-600 shrink-0" />
              <span>Đã tự động khôi phục thông tin khi bạn chuyển đổi ứng dụng.</span>
            </div>
            <button
              type="button"
              onClick={handleClearDraft}
              className="text-[11px] text-pink-700 hover:text-pink-950 font-semibold underline shrink-0 cursor-pointer"
            >
              Xóa điền lại
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-5">

          {/* 1. Tên Zalo */}
          <div>
            <label htmlFor="zaloName" className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
              <User className="w-4 h-4 text-pink-600" />
              Tên Nick Zalo của bạn <span className="text-rose-500">*</span>
            </label>
            <input 
              type="text" 
              id="zaloName" 
              name="zaloName" 
              required
              value={formData.zaloName}
              onChange={handleInputChange}
              placeholder="VD: Nguyễn Văn A (Tên Zalo đang chat với Shop)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all placeholder:text-slate-400"
            />
            <p className="text-[11px] text-slate-400 mt-1">Giúp Shop đối chiếu nhanh với đoạn chat Zalo</p>
          </div>

          {/* 2. Số điện thoại */}
          <div>
            <label htmlFor="phone" className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
              <Phone className="w-4 h-4 text-pink-600" />
              Số điện thoại / Zalo <span className="text-rose-500">*</span>
            </label>
            <input 
              type="tel" 
              id="phone" 
              name="phone" 
              required
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="VD: 0912345678"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 transition-all placeholder:text-slate-400 ${
                phoneError 
                  ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-500' 
                  : 'border-slate-200 bg-slate-50/50 focus:ring-pink-500 focus:border-transparent'
              }`}
            />
            {phoneError && (
              <p className="text-xs text-rose-500 mt-1 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {phoneError}
              </p>
            )}
          </div>

          {/* 3. Sản phẩm */}
          <div>
            <label htmlFor="product" className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
              <Tag className="w-4 h-4 text-pink-600" />
              Loại sản phẩm cần in <span className="text-rose-500">*</span>
            </label>
            <select 
              id="product" 
              name="product" 
              required
              value={formData.product}
              onChange={handleInputChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all cursor-pointer"
            >
              <option value="" disabled>-- Chọn loại sản phẩm in ấn --</option>
              {PRODUCT_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Chữ cần in */}
          <div>
            <label htmlFor="printContent" className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
              <MessageSquare className="w-4 h-4 text-pink-600" />
              Nội dung chữ / Lời chúc cần in lên sản phẩm
            </label>
            <input 
              type="text" 
              id="printContent" 
              name="printContent" 
              value={formData.printContent}
              onChange={handleInputChange}
              placeholder="VD: 'Chúc mừng sinh nhật Mai Anh 20/10' hoặc 'Best Dad Ever'"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all placeholder:text-slate-400"
            />
            <p className="text-[11px] text-slate-400 mt-1">Để trống nếu bạn chỉ in hình ảnh</p>
          </div>

          {/* 5. Hạn chót cần hàng */}
          <div>
            <label htmlFor="deadline" className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
              <Calendar className="w-4 h-4 text-pink-600" />
              Hạn chót bạn cần nhận hàng
            </label>
            <input 
              type="date" 
              id="deadline" 
              name="deadline" 
              min={todayMinDate}
              value={formData.deadline}
              onChange={handleInputChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all cursor-pointer"
            />
            <p className="text-[11px] text-slate-400 mt-1">Shop sẽ chủ động sắp xếp lịch in gia công kịp ngày cho bạn</p>
          </div>

          {/* 6. Ghi chú thiết kế */}
          <div>
            <label htmlFor="notes" className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
              <HelpCircle className="w-4 h-4 text-pink-600" />
              Ghi chú thêm & Yêu cầu chỉnh sửa ảnh
            </label>
            <textarea 
              id="notes" 
              name="notes" 
              rows={2}
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="VD: Cắt nền trắng giùm em, làm sáng da, ghép 3 ảnh thành hình trái tim..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all placeholder:text-slate-400 resize-none"
            />
          </div>

          {/* 7. Mục tải ảnh gốc */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700">
                <ImageIcon className="w-4 h-4 text-pink-600" />
                Tải ảnh in ấn <span className="text-rose-500">*</span>
              </label>
              <span className="text-xs font-semibold px-2 py-0.5 bg-pink-50 text-pink-600 rounded-md border border-pink-100">
                {images.length} ảnh đã chọn
              </span>
            </div>

            {/* Subtitle / HD Reminder banner */}
            <div className="flex items-start gap-2.5 p-3 bg-amber-50/90 border border-amber-200/80 rounded-xl text-xs text-amber-900 mb-3 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-950">Lưu ý chất lượng ảnh:</span> Nên chọn <strong>ảnh gốc sắc nét (HD)</strong> từ máy ảnh/điện thoại. Hạn chế dùng ảnh chụp màn hình để thành phẩm in ra đẹp và rõ nét nhất.
              </div>
            </div>

            {/* Dropzone */}
            <div
              onClick={() => !isOptimizingImages && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center relative group ${
                isOptimizingImages 
                  ? 'border-pink-300 bg-pink-50/40 cursor-wait'
                  : dragOver 
                    ? 'border-pink-500 bg-pink-50/60 scale-[1.01]' 
                    : 'border-slate-300 hover:border-pink-500 bg-slate-50/70 hover:bg-pink-50/30'
              }`}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                multiple 
                accept="image/*" 
                onChange={handleFileChange}
                disabled={isOptimizingImages}
                className="hidden"
              />

              {isOptimizingImages ? (
                <div className="flex flex-col items-center justify-center py-1">
                  <Loader2 className="w-8 h-8 text-pink-600 animate-spin mb-2" />
                  <p className="text-xs sm:text-sm font-bold text-slate-800">
                    Đang tối ưu ảnh chuẩn in A4 (300 DPI)...
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Đang nén dung lượng để gửi siêu nhanh...
                  </p>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800 mb-0.5">
                    Bấm để chọn ảnh hoặc kéo thả vào đây
                  </p>
                  <p className="text-xs text-slate-400">
                    Hỗ trợ JPG, PNG, HEIC, WEBP (Tự động nén tối ưu A4 khi tải)
                  </p>
                </>
              )}
            </div>

            {/* Preview Thumbnails Grid */}
            {images.length > 0 && (
              <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-60 overflow-y-auto p-1">
                {images.map((img) => (
                  <div key={img.id} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm">
                    <img 
                      src={img.previewUrl} 
                      alt={img.name} 
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(img.id);
                      }}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-rose-600/90 text-white rounded-full flex items-center justify-center text-xs shadow hover:bg-rose-700 transition-colors cursor-pointer"
                      title="Xóa ảnh này"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/65 text-white rounded text-[10px] backdrop-blur-xs font-mono">
                      {formatSize(img.compressedSize || img.size)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button 
              type="submit" 
              disabled={isSubmitting || isOptimizingImages}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-rose-500 via-pink-600 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-pink-500/25 hover:shadow-pink-500/35 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang gửi thông tin...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Gửi Thông Tin Cho Shop</span>
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
        <div className="flex items-center justify-center gap-1 text-slate-400 font-medium">
          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex items-center justify-center p-1 rounded-md text-slate-400 hover:text-pink-600 hover:bg-pink-50 transition-colors cursor-pointer"
            title="Cài đặt Shop"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <span>Độc đáo - Chất Lượng - Tận Tâm</span>
        </div>
      </div>

    </div>
  );
};
