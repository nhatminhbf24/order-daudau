import React, { useState } from 'react';
import { CustomerOrderForm } from './components/CustomerOrderForm';
import { SuccessModal } from './components/SuccessModal';
import { SubmissionResponse, OrderFormData } from './types';
import { DEFAULT_GAS_URL } from './data/constants';

export default function App() {
  const [scriptUrl] = useState<string>(DEFAULT_GAS_URL);
  const [successModalData, setSuccessModalData] = useState<SubmissionResponse['data'] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOrderSuccess = (data: SubmissionResponse['data'], rawForm: OrderFormData) => {
    const uploadedImagesCount = (rawForm.images && rawForm.images.length > 0) ? rawForm.images.length : 1;
    const finalData: SubmissionResponse['data'] = {
      ...data,
      zaloName: data?.zaloName || rawForm.zaloName,
      phone: data?.phone || rawForm.phone,
      product: data?.product || rawForm.product,
      savedImages: (data && typeof data.savedImages === 'number' && data.savedImages > 0)
        ? data.savedImages
        : uploadedImagesCount,
      timestamp: data?.timestamp || new Date().toLocaleString('vi-VN')
    };
    setSuccessModalData(finalData);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#fcf8fa] text-slate-800 flex flex-col font-sans py-4 sm:py-8 px-3 sm:px-4">
      
      {/* Main Form Content - Focused entirely on Customer */}
      <main className="flex-1 max-w-xl w-full mx-auto flex flex-col justify-center">
        <CustomerOrderForm 
          scriptUrl={scriptUrl} 
          onSuccess={handleOrderSuccess}
        />
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
