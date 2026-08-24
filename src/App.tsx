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
  const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbwszC_NVU_4XAU7XiwtAlSdLBRZWpDHHS-iURDsACZUyD-qhsQlqwPwk6Goa8BgKOP3/exec';
  const [scriptUrl, setScriptUrl] = useState<string>(DEFAULT_GAS_URL);
  const [activeTab, setActiveTab] = useState<'form' | 'guide' | 'logs'>('form');
  const [deviceMode, setDeviceMode] = useState<'mobile' | 'responsive'>('responsive');
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [successModalData, setSuccessModalData] = useState<SubmissionResponse['data'] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);

  // Check URL params for admin mode (e.g. ?admin=true) or localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === 'true' || params.get('mode') === 'admin') {
      setIsAdminMode(true);
    }
    const saved = localStorage.getItem('ZALO_GIFT_GAS_URL');
    if (saved) {
      setScriptUrl(saved);
    } else {
      localStorage.setItem('ZALO_GIFT_GAS_URL', DEFAULT_GAS_URL);
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
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          
          {/* Logo / Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight">
                  Dâu Dâu Shop Quà Tặng In Hình
                </h1>
              </div>
              <p className="text-[11px] text-slate-500">
                Gửi thông tin đơn hàng và ảnh in ấn trực tiếp cho Shop
              </p>
            </div>
          </div>

          {/* Admin Navigation tabs (Only visible if Admin Mode is enabled) */}
          {isAdminMode && (
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('form')}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                    activeTab === 'form' 
                      ? 'bg-white text-rose-600 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Khách Hàng</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('guide')}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                    activeTab === 'guide' 
                      ? 'bg-white text-rose-600 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Cài Đặt GAS</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('logs')}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 relative ${
                    activeTab === 'logs' 
                      ? 'bg-white text-rose-600 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Nhật Ký Đơn</span>
                  {orderHistory.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping absolute -top-0.5 -right-0.5"></span>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsAdminMode(false)}
                className="text-xs text-slate-400 hover:text-slate-700 px-2 py-1"
                title="Đóng thanh quản trị"
              >
                ✕ Đóng
              </button>
            </div>
          )}

          {/* Quick link to admin mode if hidden */}
          {!isAdminMode && (
            <button
              type="button"
              onClick={() => setIsAdminMode(true)}
              className="text-[11px] font-medium text-slate-400 hover:text-rose-600 px-2.5 py-1 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cài đặt Shop ⚙️
            </button>
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
