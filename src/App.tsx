import React, { useState, useEffect } from 'react';
import { X, Settings, Sparkles } from 'lucide-react';
import { CustomerOrderForm } from './components/CustomerOrderForm';
import { GasSetupGuide } from './components/GasSetupGuide';
import { SuccessModal } from './components/SuccessModal';
import { SubmissionResponse, OrderFormData } from './types';
import { DEFAULT_GAS_URL } from './data/constants';

export default function App() {
  const [scriptUrl, setScriptUrl] = useState<string>(DEFAULT_GAS_URL);
  const [successModalData, setSuccessModalData] = useState<SubmissionResponse['data'] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
  };

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 flex flex-col font-sans py-4 sm:py-8 px-3 sm:px-4">
      
      {/* Main Form Content - Focused entirely on Customer */}
      <main className="flex-1 max-w-xl w-full mx-auto flex flex-col justify-center">
        <CustomerOrderForm 
          scriptUrl={scriptUrl} 
          onSuccess={handleOrderSuccess}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      </main>

      {/* Success Modal */}
      <SuccessModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        data={successModalData}
      />

      {/* Settings / GAS Configuration Modal (Accessible via footer gear icon) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-100">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Cài Đặt Google Apps Script (GAS)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cấu hình Web App để nhận đơn và tải ảnh lên Google Drive + Sheets
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body with Guide and Settings */}
            <div className="p-4 sm:p-6 overflow-y-auto custom-scroll flex-1">
              <GasSetupGuide 
                currentScriptUrl={scriptUrl} 
                onSaveScriptUrl={handleSaveScriptUrl} 
              />
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
