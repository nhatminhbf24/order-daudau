import React, { useState, useEffect } from 'react';
import { 
  Gift, Code2, Smartphone, Monitor, BookOpen, 
  History, Sparkles, CheckCircle2, Download, Copy, ExternalLink 
} from 'lucide-react';
import { CustomerOrderForm } from './components/CustomerOrderForm';
import { GasSetupGuide } from './components/GasSetupGuide';
import { LiveTestLogger } from './components/LiveTestLogger';
import { SuccessModal } from './components/SuccessModal';
import { SubmissionResponse, OrderFormData } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'form' | 'guide' | 'logs'>('form');
  const [deviceMode, setDeviceMode] = useState<'mobile' | 'responsive'>('responsive');
  const [scriptUrl, setScriptUrl] = useState<string>('');
  const [successModalData, setSuccessModalData] = useState<SubmissionResponse['data'] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);

  // Load saved SCRIPT_URL from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ZALO_GIFT_GAS_URL');
    if (saved) {
      setScriptUrl(saved);
    }
  }, []);

  const handleSaveScriptUrl = (url: string) => {
    setScriptUrl(url);
    localStorage.setItem('ZALO_GIFT_GAS_URL', url);
  };

  const handleOrderSuccess = (data: SubmissionResponse['data'], rawForm: OrderFormData) => {
    setSuccessModalData(data || null);
    setIsModalOpen(true);

    // Save to test logger
    const newRecord = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN'),
      response: data,
      rawForm: rawForm
    };
    setOrderHistory(prev => [newRecord, ...prev]);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Logo / Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight">
                  Zalo Gift Order Collector
                </h1>
                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
                  v1.0 Pro
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Thu thập ảnh HD & đơn hàng quà tặng kết nối Google Drive + Sheets
              </p>
            </div>
          </div>

          {/* Navigation tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'form' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Giao diện Khách Hàng</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('guide')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'guide' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Mã Nguồn & Cài Đặt GAS</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('logs')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 relative ${
                activeTab === 'logs' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Nhật Ký Nhận Đơn</span>
              {orderHistory.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping absolute -top-0.5 -right-0.5"></span>
              )}
            </button>
          </div>

          {/* View mode toggle on form tab */}
          {activeTab === 'form' && (
            <div className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setDeviceMode('responsive')}
                className={`px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1 transition-all ${
                  deviceMode === 'responsive' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'
                }`}
                title="Xem dạng trải rộng"
              >
                <Monitor className="w-3.5 h-3.5" />
                Màn hình chuẩn
              </button>
              <button
                type="button"
                onClick={() => setDeviceMode('mobile')}
                className={`px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1 transition-all ${
                  deviceMode === 'mobile' ? 'bg-white text-blue-600 shadow-xs font-semibold' : 'text-slate-500'
                }`}
                title="Xem dạng khung điện thoại iPhone/Android"
              >
                <Smartphone className="w-3.5 h-3.5" />
                Mô phỏng Mobile
              </button>
            </div>
          )}

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:py-8">
        
        {activeTab === 'form' && (
          <div className="flex justify-center">
            {deviceMode === 'mobile' ? (
              <div className="w-full max-w-[420px] bg-slate-900 p-3.5 rounded-[44px] shadow-2xl border-4 border-slate-800 relative">
                {/* Phone speaker notch */}
                <div className="w-28 h-4 bg-slate-800 rounded-full mx-auto mb-3"></div>
                <div className="bg-slate-50 rounded-[32px] overflow-hidden max-h-[820px] overflow-y-auto custom-scroll p-1">
                  <CustomerOrderForm 
                    scriptUrl={scriptUrl} 
                    onSuccess={handleOrderSuccess}
                    onOpenGuide={() => setActiveTab('guide')}
                  />
                </div>
              </div>
            ) : (
              <CustomerOrderForm 
                scriptUrl={scriptUrl} 
                onSuccess={handleOrderSuccess}
                onOpenGuide={() => setActiveTab('guide')}
              />
            )}
          </div>
        )}

        {activeTab === 'guide' && (
          <GasSetupGuide 
            currentScriptUrl={scriptUrl} 
            onSaveScriptUrl={handleSaveScriptUrl} 
          />
        )}

        {activeTab === 'logs' && (
          <LiveTestLogger 
            orders={orderHistory} 
            onClear={() => setOrderHistory([])} 
          />
        )}

      </main>

      {/* Success Modal */}
      <SuccessModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        data={successModalData}
      />

    </div>
  );
}
