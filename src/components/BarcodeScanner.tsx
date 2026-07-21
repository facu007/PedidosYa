import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { useAudio } from '../hooks/useAudio';
import { Camera, X, RefreshCw, AlertTriangle } from 'lucide-react';

interface BarcodeScannerProps {
  onScanSuccess: (code: string) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScanSuccess, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const { playScan, playError } = useAudio();

  useEffect(() => {
    // Configure hints to search strictly for 1D barcodes
    const hints = new Map();
    const formats = [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.ITF
    ];
    hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);

    const codeReader = new BrowserMultiFormatReader(hints);
    codeReaderRef.current = codeReader;

    const startScanner = async () => {
      try {
        setLoading(true);

        // Check for secure context and mediaDevices support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError('El escáner requiere una conexión segura (HTTPS) o permisos de cámara habilitados en el navegador.');
          setLoading(false);
          return;
        }

        // Force browser permission prompt first to populate devices
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
        tempStream.getTracks().forEach((track) => track.stop());

        const videoInputDevices = await codeReader.listVideoInputDevices();
        setDevices(videoInputDevices);

        if (videoInputDevices.length === 0) {
          setError('No se encontraron cámaras en este dispositivo.');
          setLoading(false);
          return;
        }

        // Try to find rear/back camera by default
        const backCamera = videoInputDevices.find((device) =>
          device.label.toLowerCase().includes('back') ||
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('entorno') ||
          device.label.toLowerCase().includes('trasera')
        );

        const defaultDevice = backCamera ? backCamera.deviceId : videoInputDevices[0].deviceId;
        setSelectedDevice(defaultDevice);
        setLoading(false);
      } catch (err: any) {
        console.error('Error listing cameras:', err);
        setError('Error al acceder a los dispositivos de cámara. Por favor verifica los permisos.');
        playError();
        setLoading(false);
      }
    };

    startScanner();

    // Cleanup on unmount
    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, []);

  const [isContinuousMode, setIsContinuousMode] = useState<boolean>(true);
  const [scannedToast, setScannedToast] = useState<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const lastCodeRef = useRef<string>('');

  // Handle active device changes
  useEffect(() => {
    if (loading || !selectedDevice || !codeReaderRef.current || !videoRef.current) return;

    // Reset scanner first
    codeReaderRef.current.reset();

    // Start decoding from constraints to request HD resolution
    codeReaderRef.current.decodeFromConstraints(
      {
        video: {
          deviceId: selectedDevice ? { ideal: selectedDevice } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment'
        }
      },
      videoRef.current,
      (result, _err) => {
        if (result) {
          const text = result.getText();
          // Extract last 5 digits of scanned barcode
          const last5 = text.replace(/\D/g, '').slice(-5);
          const now = Date.now();

          // Debounce 1.5s for same code in continuous mode
          if (last5) {
            if (last5 === lastCodeRef.current && (now - lastScanTimeRef.current) < 1500) {
              return;
            }
            
            lastCodeRef.current = last5;
            lastScanTimeRef.current = now;
            setScannedToast(`¡Código #${last5} Escaneado!`);
            playScan();
            onScanSuccess(last5);

            setTimeout(() => {
              setScannedToast(null);
            }, 1800);

            if (!isContinuousMode) {
              onClose();
            }
          } else {
            // Scanned something but no numbers
            playError();
          }
        }
      }
    ).catch(err => {
      console.error('Error starting camera decode loop:', err);
      setError('No se pudo inicializar la cámara. Por favor asegúrate de que no esté en uso por otra aplicación.');
    });

    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, [selectedDevice, loading, isContinuousMode]);

  const switchCamera = () => {
    if (devices.length <= 1) return;
    const currentIndex = devices.findIndex((d) => d.deviceId === selectedDevice);
    const nextIndex = (currentIndex + 1) % devices.length;
    setSelectedDevice(devices[nextIndex].deviceId);
  };

  const handleVideoPlay = async () => {
    try {
      if (!videoRef.current) return;
      const stream = videoRef.current.srcObject as MediaStream;
      if (!stream) return;
      const tracks = stream.getVideoTracks();
      if (tracks.length === 0) return;

      const track = tracks[0];
      const capabilities = (track.getCapabilities && typeof track.getCapabilities === 'function') 
        ? track.getCapabilities() 
        : {};

      const advancedConstraints: any = {};
      
      // Try to apply continuous autofocus if supported
      if ((capabilities as any).focusMode && (capabilities as any).focusMode.includes('continuous')) {
        advancedConstraints.focusMode = 'continuous';
      }
      
      // Try to zoom in slightly (e.g. 1.3x) to help focus on small 1D barcodes from a distance
      if ((capabilities as any).zoom) {
        const minZoom = (capabilities as any).zoom.min || 1;
        const maxZoom = (capabilities as any).zoom.max || 1;
        const targetZoom = Math.min(1.3, maxZoom);
        if (targetZoom > minZoom) {
          advancedConstraints.zoom = targetZoom;
        }
      }

      if (Object.keys(advancedConstraints).length > 0) {
        console.log('Applying advanced camera constraints:', advancedConstraints);
        await track.applyConstraints({ advanced: [advancedConstraints] });
      }
    } catch (err) {
      console.warn('Could not apply advanced camera focus constraints:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 z-50 flex flex-col justify-between p-4 md:p-6 backdrop-blur-sm">
      {/* Top bar */}
      <div className="flex items-center justify-between text-white w-full max-w-md mx-auto">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-[#FF1744]" />
          <h3 className="font-bold text-sm">Escanear Código de Barras</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsContinuousMode(!isContinuousMode)}
            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${
              isContinuousMode
                ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm shadow-emerald-500/50'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            {isContinuousMode ? '⚡ Modo Continuo' : '🎯 Modo Simple'}
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scanned Toast Notification */}
      {scannedToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-5 py-2.5 rounded-full font-black text-xs shadow-2xl animate-bounce flex items-center gap-2">
          <span>{scannedToast}</span>
        </div>
      )}

      {/* Video Scanner Area */}
      <div className="relative w-full max-w-md aspect-[3/4] mx-auto bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex items-center justify-center my-4">
        {/* Video feed */}
        <video
          ref={videoRef}
          onPlay={handleVideoPlay}
          className="w-full h-full object-contain block"
          muted
          playsInline
          autoPlay
        />

        {loading && (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-center text-slate-400 z-10">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-[#FF1744]" />
            <p className="text-sm">Iniciando cámara...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-center p-6 text-slate-400 z-10">
            <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-[#FF1744]" />
            <p className="text-sm mb-4 font-medium">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#FF1744] text-white rounded-lg text-xs font-semibold hover:bg-red-600 transition-colors cursor-pointer"
            >
              Cargar Manualmente
            </button>
          </div>
        )}

        {/* Scanning Overlay (Target Area) */}
        {!loading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {/* Dark mask overlays */}
            <div className="absolute inset-x-0 top-0 bg-slate-950/40 bottom-[60%]" />
            <div className="absolute inset-x-0 bottom-0 bg-slate-950/40 top-[60%]" />
            <div className="absolute left-0 w-[10%] top-[40%] bottom-[40%] bg-slate-950/40" />
            <div className="absolute right-0 w-[10%] top-[40%] bottom-[40%] bg-slate-950/40" />

            {/* Scanning viewport boundary */}
            <div className="w-[80%] aspect-[3/1] border-2 border-white rounded-xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
              {/* Corner markings */}
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-[#FF1744] rounded-tl-sm" />
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-[#FF1744] rounded-tr-sm" />
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-[#FF1744] rounded-bl-sm" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-[#FF1744] rounded-br-sm" />
              
              {/* Laser animation */}
              <div className="absolute left-1 right-1 top-1/2 h-0.5 bg-[#FF1744] animate-pulse shadow-[0_0_8px_#FF1744]" />
            </div>
            
            <p className="text-white text-xs font-semibold mt-6 px-4 py-2 bg-slate-900/80 rounded-full backdrop-blur-sm uppercase tracking-wide">
              Ubica el código de barras dentro del recuadro
            </p>
          </div>
        )}
      </div>

      {/* Camera switcher / Footer */}
      <div className="w-full max-w-md mx-auto flex flex-col gap-2 items-center text-center">
        {devices.length > 1 && !error && !loading && (
          <button
            onClick={switchCamera}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-full text-xs font-semibold hover:bg-slate-700 transition-colors shadow-md border border-slate-750"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Rotar Cámara ({devices.length})</span>
          </button>
        )}
        <p className="text-slate-400 text-xs mt-2 px-6">
          Se leerán los números automáticamente. Si hay problemas, cierra el escáner y escribe los últimos 5 dígitos a mano.
        </p>
      </div>
    </div>
  );
};
