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

  // Handle active device changes
  useEffect(() => {
    if (!selectedDevice || !codeReaderRef.current || !videoRef.current) return;

    // Reset scanner first
    codeReaderRef.current.reset();

    // Start decoding from selected device
    codeReaderRef.current.decodeFromVideoDevice(
      selectedDevice,
      videoRef.current,
      (result, _err) => {
        if (result) {
          const text = result.getText();
          // Extract last 5 digits of scanned barcode
          const last5 = text.replace(/\D/g, '').slice(-5);
          if (last5) {
            playScan();
            onScanSuccess(last5);
          } else {
            // Scanned something but no numbers
            playError();
          }
        }
        // We ignore err here since the reader polls and throws errors continuously while looking for barcodes
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
  }, [selectedDevice]);

  const switchCamera = () => {
    if (devices.length <= 1) return;
    const currentIndex = devices.findIndex((d) => d.deviceId === selectedDevice);
    const nextIndex = (currentIndex + 1) % devices.length;
    setSelectedDevice(devices[nextIndex].deviceId);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 z-50 flex flex-col justify-between p-4 md:p-6 backdrop-blur-sm">
      {/* Top bar */}
      <div className="flex items-center justify-between text-white w-full max-w-md mx-auto">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-[#FF1744]" />
          <h3 className="font-bold text-sm">Escanear Código de Barras</h3>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Video Scanner Area */}
      <div className="relative w-full max-w-md aspect-[3/4] mx-auto bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex items-center justify-center my-4">
        {loading && (
          <div className="text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-[#FF1744]" />
            <p className="text-sm">Iniciando cámara...</p>
          </div>
        )}

        {error && (
          <div className="text-center p-6 text-slate-400 max-w-xs">
            <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-[#FF1744]" />
            <p className="text-sm mb-4 font-medium">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#FF1744] text-white rounded-lg text-xs font-semibold hover:bg-red-600 transition-colors"
            >
              Cargar Manualmente
            </button>
          </div>
        )}

        {/* Video feed */}
        <video
          ref={videoRef}
          className={`w-full h-full object-contain ${loading || error ? 'hidden' : 'block'}`}
          muted
          playsInline
          autoPlay
        />

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
