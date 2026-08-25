import React from 'react';
import { CheckCircle2, RefreshCw, Image } from 'lucide-react';
import { SubmissionResponse } from '../types';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: SubmissionResponse['data'] | null;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({ isOpen, onClose, data }) => {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-slate-100 transform animate-scaleUp">
        
        {/* Animated Check Icon */}
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-9 h-9 animate-bounce" />
        </div>

        <h3 className="text-xl font-extrabold text-slate-800 mb-1.5">
          Đã Gửi Thông Tin Thành Công!
        </h3>
        
        <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-4">
          Shop đã nhận được ảnh in và yêu cầu của bạn. Đội ngũ thiết kế sẽ liên hệ gửi bản demo qua Zalo sớm nhất!
        </p>

        {/* Order Details Card */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 text-left text-xs space-y-2 mb-5">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Tên Zalo:</span>
            <span className="font-semibold text-slate-800">{data.zaloName || '-'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Số điện thoại:</span>
            <span className="font-semibold text-slate-800">{data.phone || '-'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Nhận hàng:</span>
            <span className="font-semibold text-slate-800 text-right max-w-[180px] truncate">
              {data.deliveryMethod || 'Nhận hàng tại Shop'}
            </span>
          </div>
          {data.shippingAddress && data.shippingAddress !== 'Nhận tại Shop' && (
            <div className="flex justify-between items-start gap-2">
              <span className="text-slate-500 shrink-0">Địa chỉ:</span>
              <span className="font-semibold text-slate-700 text-right line-clamp-2">
                {data.shippingAddress}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Sản phẩm:</span>
            <span className="font-semibold text-pink-600 text-right max-w-[180px] truncate">{data.product || '-'}</span>
          </div>

          {Array.isArray(data.items) && data.items.length > 1 && (
            <div className="pt-1 border-t border-slate-200/60 space-y-1">
              <span className="text-slate-500 font-medium block">Chi tiết ({data.items.length} món):</span>
              <div className="space-y-1 max-h-24 overflow-y-auto pl-1">
                {data.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center text-[11px] text-slate-700 bg-white/60 px-2 py-0.5 rounded border border-slate-100">
                    <span className="font-semibold">{it.quantity > 1 ? `${it.quantity}x ` : ''}{it.product}</span>
                    <span className="text-slate-500">{it.imagesCount} ảnh</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-slate-500">Số lượng ảnh:</span>
            <span className="font-semibold text-emerald-600 flex items-center gap-1">
              <Image className="w-3.5 h-3.5" />
              {(typeof data.savedImages === 'number' && data.savedImages > 0) ? data.savedImages : ((data as any).imagesCount || 1)} ảnh gốc
            </span>
          </div>
          {data.timestamp && (
            <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
              <span className="text-slate-400">Thời gian gửi:</span>
              <span className="text-slate-500 font-mono text-[11px]">{data.timestamp}</span>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div>
          <button 
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 bg-[#feeaf2] hover:bg-[#fedbe9] active:bg-[#fccfe1] text-[#d10074] border-2 border-[#d10074] font-extrabold rounded-2xl text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-[#d10074]" />
            Gửi Thêm Đơn Hàng Mới
          </button>
        </div>

      </div>
    </div>
  );
};
