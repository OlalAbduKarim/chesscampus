import React from 'react';

interface CustomDialogProps {
  open: boolean;
  title: string;
  contentText: string;
  handleContinue: () => void;
  children?: React.ReactNode;
}

export default function CustomDialog({ open, title, contentText, handleContinue, children }: CustomDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in p-4">
      <div className="bg-dark-surface border border-dark-border w-full max-w-sm md:max-w-md rounded-xl shadow-2xl transform transition-all scale-100 flex flex-col overflow-hidden">
        
        <div className="p-6">
          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <p className="text-slate-300 leading-relaxed">{contentText}</p>
          {children}
        </div>
        
        <div className="bg-dark-bg/50 p-4 flex justify-end gap-3 border-t border-dark-border">
          <button 
            onClick={handleContinue}
            className="px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-bold text-sm transition-colors shadow-lg shadow-brand-900/20"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}