import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, QrCode, Download, Share2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeModalProps {
  isOpen: boolean;
  email: string;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  email,
  onClose
}) => {
  const downloadQRCode = () => {
    const svg = document.getElementById("account-qr-code");
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = 300;
      canvas.height = 300;
      ctx?.drawImage(img, 0, 0, 300, 300);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `qr-${email.split('@')[0]}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl pointer-events-auto overflow-hidden flex flex-col"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">Mã QR Tài khoản</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email: {email}</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                    <QRCodeSVG 
                      id="account-qr-code"
                      value={email} 
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <p className="mt-6 text-[11px] text-center text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    Quét mã này để xem địa chỉ email của tài khoản. Mã QR chứa thông tin dạng văn bản thuần túy.
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-center gap-3">
                <button
                  onClick={downloadQRCode}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-[#4285F4] hover:bg-[#3367d6] shadow-lg shadow-blue-500/20 transition-all cursor-pointer active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  Tải xuống
                </button>
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: 'QR Code Tài khoản',
                        text: `Mã QR của ${email}`,
                        url: window.location.href
                      });
                    }
                  }}
                  className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
