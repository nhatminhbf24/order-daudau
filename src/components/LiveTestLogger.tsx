import React from 'react';
import { History, Image, ExternalLink, Calendar, Phone, User, Tag, Sparkles, CheckCircle2 } from 'lucide-react';
import { SubmissionResponse, OrderFormData } from '../types';

interface OrderHistoryItem {
  id: string;
  timestamp: string;
  response: SubmissionResponse['data'];
  rawForm: OrderFormData;
}

interface LiveTestLoggerProps {
  orders: OrderHistoryItem[];
  onClear: () => void;
}

export const LiveTestLogger: React.FC<LiveTestLoggerProps> = ({ orders, onClear }) => {
  if (orders.length === 0) {
    return (
      <div className="w-full max-w-3xl mx-auto bg-white rounded-3xl p-8 text-center border border-slate-100 shadow-md">
        <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <History className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1">Chưa Có Đơn Hàng Thử Nghiệm Nào</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Hãy chuyển qua tab <strong>Giao diện Khách Hàng</strong>, điền thông tin và tải thử 1 vài bức ảnh để kiểm tra luồng nhận đơn thực tế tại đây.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-slate-800 text-sm sm:text-base">
            Nhật Ký Đơn Hàng Vừa Nhận ({orders.length})
          </h3>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-slate-500 hover:text-rose-600 font-medium transition-colors"
        >
          Xóa nhật ký
        </button>
      </div>

      <div className="space-y-3">
        {orders.map((item) => (
          <div 
            key={item.id}
            className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="font-bold text-slate-900 text-sm">{item.rawForm.zaloName}</span>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono">
                  {item.rawForm.phone}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {item.timestamp}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Sản phẩm:</span>
                <span className="font-semibold text-blue-600">{item.rawForm.product || 'Chưa chọn'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Hạn nhận hàng:</span>
                <span className="font-medium text-slate-700">{item.rawForm.deadline || 'Không gấp'}</span>
              </div>
              {item.rawForm.printContent && (
                <div className="sm:col-span-2 bg-blue-50/60 p-2.5 rounded-xl border border-blue-100 text-blue-950">
                  <span className="font-semibold block text-[11px] text-blue-700">Chữ cần in:</span>
                  <p className="italic font-medium">"{item.rawForm.printContent}"</p>
                </div>
              )}
              {item.rawForm.notes && (
                <div className="sm:col-span-2 text-slate-600 bg-slate-50 p-2.5 rounded-xl">
                  <span className="font-semibold block text-[11px] text-slate-500">Ghi chú thiết kế:</span>
                  <p>{item.rawForm.notes}</p>
                </div>
              )}
            </div>

            {/* Images summary */}
            {item.rawForm.images && item.rawForm.images.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <span className="text-[11px] text-slate-400 font-medium block mb-2">
                  Ảnh in kèm theo ({item.rawForm.images.length} ảnh):
                </span>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {item.rawForm.images.map((img, idx) => (
                    <div key={idx} className="w-14 h-14 shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 relative group">
                      <img src={img.previewUrl || img.base64} alt={img.name} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
