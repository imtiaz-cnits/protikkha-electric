"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, X, AlertCircle } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

interface CameraScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export function CameraScannerModal({ isOpen, onClose, onScanSuccess }: CameraScannerProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "pos-camera-qr-reader";

  useEffect(() => {
    if (!isOpen) {
      cleanupScanner();
      return;
    }

    let isMounted = true;
    setIsStarting(true);
    setErrorMsg(null);

    // Give DOM a frame to render the div
    const timer = setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode(scannerContainerId);
        scannerRef.current = html5QrCode;

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            if (isMounted) {
              // Beep sound feedback
              try {
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.frequency.value = 1000;
                gain.gain.value = 0.1;
                osc.start();
                setTimeout(() => {
                  osc.stop();
                  audioCtx.close();
                }, 100);
              } catch {}

              onScanSuccess(decodedText.trim());
              onClose();
            }
          },
          () => {
            // Frame scan failure (ignore continuous frame scans)
          }
        );

        if (isMounted) setIsStarting(false);
      } catch (err: any) {
        if (isMounted) {
          console.error("Camera scanner error:", err);
          setErrorMsg(err?.message || "Could not access camera. Please check camera permissions.");
          setIsStarting(false);
        }
      }
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      cleanupScanner();
    };
  }, [isOpen]);

  const cleanupScanner = () => {
    if (scannerRef.current) {
      if (scannerRef.current.isScanning) {
        scannerRef.current
          .stop()
          .then(() => {
            scannerRef.current?.clear();
            scannerRef.current = null;
          })
          .catch((err) => {
            console.error("Error stopping camera:", err);
            scannerRef.current = null;
          });
      } else {
        scannerRef.current = null;
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Sticky Header */}
        <div className="bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#b91c1c] px-4 py-3 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-white" />
            <h3 className="text-sm font-bold tracking-wide uppercase m-0 text-white">
              Live Barcode / QR Scanner
            </h3>
          </div>
          <button
            onClick={() => {
              cleanupScanner();
              onClose();
            }}
            className="w-7 h-7 rounded-full bg-[#dc2626] hover:bg-red-700 text-white flex items-center justify-center cursor-pointer transition-colors shadow"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera Viewport */}
        <div className="p-4 flex flex-col items-center">
          <div className="relative w-full aspect-square max-w-[320px] bg-black rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
            <div id={scannerContainerId} className="w-full h-full" />

            {isStarting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white gap-2 z-10">
                <RefreshCw className="w-8 h-8 animate-spin text-rose-400" />
                <p className="text-xs font-semibold">Starting camera feed...</p>
              </div>
            )}

            {/* Target Reticle Overlay */}
            {!isStarting && !errorMsg && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-dashed border-rose-400 rounded-lg relative animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.5)]">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-rose-500 -mt-1 -ml-1"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-rose-500 -mt-1 -mr-1"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-rose-500 -mb-1 -ml-1"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-rose-500 -mb-1 -mr-1"></div>
                </div>
              </div>
            )}
          </div>

          {errorMsg ? (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-start gap-2 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <div>
                <p className="font-bold">Camera Access Failed</p>
                <p>{errorMsg}</p>
                <p className="mt-1 text-[11px] text-gray-500">
                  Tip: Ensure HTTPS or localhost is used and grant browser camera permission.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 text-center">
              Align the barcode or QR code inside the box to automatically add to cart.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 flex justify-end border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              cleanupScanner();
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
