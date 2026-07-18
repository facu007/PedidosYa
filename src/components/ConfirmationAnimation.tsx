import React, { useEffect } from 'react';
import { Check } from 'lucide-react';

interface ConfirmationAnimationProps {
  isVisible: boolean;
  onFinished: () => void;
  message?: string;
}

export const ConfirmationAnimation: React.FC<ConfirmationAnimationProps> = ({ 
  isVisible, 
  onFinished,
  message = "¡Producto Registrado!"
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onFinished();
      }, 1500); // 1.5 seconds duration
      return () => clearTimeout(timer);
    }
  }, [isVisible, onFinished]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 flex flex-col items-center max-w-sm w-full mx-4 text-center transform scale-90 animate-bounce-short">
        
        {/* Animated Check Circle */}
        <div className="relative w-20 h-20 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center text-green-500 mb-4 animate-scale-up">
          <Check className="w-10 h-10 stroke-[3] animate-draw-check" />
          
          {/* Outer ripples */}
          <span className="absolute inset-0 rounded-full border-4 border-green-500/20 animate-ping-slow pointer-events-none" />
        </div>

        <h3 className="text-xl font-extrabold text-slate-850 dark:text-white mb-2">
          {message}
        </h3>
        
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Guardado en la base de datos local (IndexedDB)
        </p>
      </div>
    </div>
  );
};
