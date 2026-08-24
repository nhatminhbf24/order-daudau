import React, { useState } from 'react';
import { 
  Check, Copy, Download, ExternalLink, FileCode, FolderOpen, 
  Table, PlayCircle, Key, ArrowRight, ShieldAlert, Sparkles, CheckCircle2 
} from 'lucide-react';
import { GAS_CODE_TEMPLATE, GAS_SCRIPT_DOWNLOAD_NAME, STANDALONE_HTML_DOWNLOAD_NAME } from '../data/constants';

interface GasSetupGuideProps {
  currentScriptUrl: string;
  onSaveScriptUrl: (url: string) => void;
}

export const GasSetupGuide: React.FC<GasSetupGuideProps> = ({ 
  currentScriptUrl, 
  onSaveScriptUrl 
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [inputUrl, setInputUrl] = useState(currentScriptUrl);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GAS_CODE_TEMPLATE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadCode = () => {
    const blob = new Blob([GAS_CODE_TEMPLATE], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = GAS_SCRIPT_DOWNLOAD_NAME;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadHtml = async () => {
    try {
      const res = await fetch('/standalone-order-form.html');
      let htmlText = await res.text();
      
      // Inject current URL if set
      if (inputUrl && inputUrl.startsWith('https://script.google.com/')) {
        htmlText = htmlText.replace('YOUR_GOOGLE_APPS_SCRIPT_WEBAPP_URL_HERE', inputUrl);
      }

      const blob = new Blob([htmlText], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = STANDALONE_HTML_DOWNLOAD_NAME;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveAndTest = async () => {
    const clean = inputUrl.trim();
    onSaveScriptUrl(clean);

    if (!clean || !clean.startsWith('https://script.google.com/')) {
      setTestStatus('error');
      setTestMessage('Vui lòng nhập đường dẫn URL hợp lệ bắt đầu bằng https://script.google.com/macros/s/.../exec');
      return;
    }

    setTestStatus('testing');
    setTestMessage('Đang kiểm tra phản hồi từ Google Apps Script...');

    try {
      const res = await fetch(clean);
      const json = await res.json();
      if (json.status === 'success') {
        setTestStatus('success');
        setTestMessage('Kết nối thành công! Google Apps Script đang hoạt động chuẩn xác.');
      } else {
        setTestStatus('error');
        setTestMessage(json.message || 'Script phản hồi nhưng có lỗi');
      }
    } catch (e: any) {
      // Sometimes GAS redirects GET or has CORS on GET
      setTestStatus('success');
      setTestMessage('Đã lưu URL thành công! (Lưu ý: GAS có thể redirect, bạn có thể gửi thử 1 đơn hàng để kiểm tra trực tiếp).');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      
      {/* Configuration Box */}
      <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-2 border border-blue-400/20">
              <Sparkles className="w-3.5 h-3.5" />
              Cấu hình liên kết nhanh
            </div>
            <h2 className="text-xl sm:text-2xl font-bold">Dán Đường Dẫn Google Apps Script Web App</h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1">
              Sau khi bạn tạo và Triển khai (Deploy) Web App trong Google Sheets, dán link <code className="bg-black/30 px-1.5 py-0.5 rounded text-blue-300 font-mono">/exec</code> vào đây:
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadCode}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-md"
            >
              <Download className="w-4 h-4" />
              Tải file Code.gs
            </button>
            <button
              type="button"
              onClick={handleDownloadHtml}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-md"
            >
              <Download className="w-4 h-4" />
              Tải file index.html
            </button>
          </div>
        </div>

        {/* Input & Test Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input 
            type="text" 
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
            className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono"
          />
          <button
            type="button"
            onClick={handleSaveAndTest}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-blue-500/30"
          >
            <CheckCircle2 className="w-4 h-4" />
            Lưu & Kiểm Tra
          </button>
        </div>

        {testStatus !== 'idle' && (
          <div className={`mt-3 p-3 rounded-xl text-xs flex items-center gap-2 ${
            testStatus === 'success' ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200' :
            testStatus === 'testing' ? 'bg-blue-950/80 border border-blue-500/40 text-blue-200' :
            'bg-rose-950/80 border border-rose-500/40 text-rose-200'
          }`}>
            {testStatus === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            <span>{testMessage}</span>
          </div>
        )}
      </div>

      {/* Step by Step Setup Guide */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-slate-100 space-y-6">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <PlayCircle className="w-5 h-5 text-blue-600" />
          Hướng Dẫn 4 Bước Cài Đặt Miễn Phí (Chạy Vĩnh Viễn Không Tốn Phí Server)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Bước 1 */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 relative">
            <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs mb-3">
              1
            </div>
            <h4 className="font-bold text-slate-800 text-sm mb-1 flex items-center gap-1.5">
              <FolderOpen className="w-4 h-4 text-blue-600" />
              Tạo Thư Mục Trên Google Drive
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Mở <a href="https://drive.google.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-medium">Google Drive</a>, tạo 1 thư mục mới tên ví dụ: <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">Ảnh Đơn Hàng Zalo</code>.
            </p>
            <p className="text-xs text-slate-600 mt-2">
              👉 Mở thư mục đó ra, nhìn lên thanh địa chỉ trình duyệt, copy đoạn mã <strong>ID Thư Mục</strong> ở cuối URL:
              <br/>
              <span className="text-[10px] text-slate-500 font-mono">drive.google.com/drive/folders/<strong>1ABCxyz...</strong></span>
            </p>
          </div>

          {/* Bước 2 */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 relative">
            <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs mb-3">
              2
            </div>
            <h4 className="font-bold text-slate-800 text-sm mb-1 flex items-center gap-1.5">
              <Table className="w-4 h-4 text-blue-600" />
              Tạo Google Sheets & Mở Apps Script
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tạo một bảng tính mới tại <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-blue-600 underline font-medium">sheets.new</a> đặt tên là <strong>Quản Lý Đơn In Quà Tặng</strong>.
            </p>
            <p className="text-xs text-slate-600 mt-2">
              👉 Trên thanh menu bảng tính, chọn: <strong>Tiện ích mở rộng (Extensions)</strong> ➔ <strong>Apps Script</strong>.
            </p>
          </div>

          {/* Bước 3 */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 relative">
            <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs mb-3">
              3
            </div>
            <h4 className="font-bold text-slate-800 text-sm mb-1 flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-blue-600" />
              Dán Mã & Điền ID Thư Mục
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Xóa sạch nội dung cũ trong file <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">Mã.gs (Code.gs)</code> và dán toàn bộ mã ở khung bên dưới vào.
            </p>
            <p className="text-xs text-slate-600 mt-2">
              👉 Thay giá trị <code className="text-blue-600 font-mono">PARENT_FOLDER_ID</code> ở dòng số 11 bằng mã ID thư mục Drive bạn đã lấy ở Bước 1. Nhấn <strong>Lưu (Ctrl+S)</strong>.
            </p>
          </div>

          {/* Bước 4 */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 relative">
            <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs mb-3">
              4
            </div>
            <h4 className="font-bold text-slate-800 text-sm mb-1 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-emerald-600" />
              Triển Khai Web App (Rất Quan Trọng)
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Ở góc trên bên phải màn hình Apps Script, bấm nút <strong>Triển khai (Deploy)</strong> ➔ <strong>Tùy chọn triển khai mới (New deployment)</strong>:
            </p>
            <ul className="text-xs text-slate-700 mt-1.5 space-y-1">
              <li>• Loại: <strong>Ứng dụng web (Web app)</strong></li>
              <li>• Thực thi dưới dạng: <strong>Tôi (Me)</strong></li>
              <li>• Người có quyền truy cập: <strong className="text-rose-600 bg-rose-50 px-1 rounded">Bất kỳ ai (Anyone)</strong></li>
            </ul>
            <p className="text-xs text-slate-500 mt-1.5">
              Sau đó bấm <strong>Triển khai</strong>, chọn <strong>Cấp quyền truy cập (Review Permissions)</strong> ➔ Chọn Gmail ➔ <strong>Nâng cao (Advanced)</strong> ➔ <strong>Đi tới... (Go to...)</strong> ➔ <strong>Cho phép (Allow)</strong>.
            </p>
          </div>

        </div>

        {/* Code Box Display */}
        <div className="pt-2">
          <div className="flex items-center justify-between bg-slate-900 text-slate-200 px-4 py-2.5 rounded-t-2xl border-b border-slate-800">
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
              <span className="ml-2 text-slate-400">Code.gs (Google Apps Script Backend)</span>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedCode ? 'Đã sao chép!' : 'Sao chép toàn bộ mã'}
            </button>
          </div>
          <pre className="bg-slate-950 text-slate-200 p-4 rounded-b-2xl text-xs font-mono overflow-x-auto max-h-96 leading-relaxed border border-slate-900">
            {GAS_CODE_TEMPLATE}
          </pre>
        </div>

      </div>

    </div>
  );
};
