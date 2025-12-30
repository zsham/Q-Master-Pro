
import React, { useState, useRef, useEffect } from 'react';
import { Ticket, QueueState, TicketStatus } from '../types';
import { QrCode, Smartphone, Info, Camera, X, Zap, Sparkles, CheckCircle, Loader2 } from 'lucide-react';
import jsQR from 'jsqr';

interface KioskViewProps {
  queue: QueueState;
  onTakeTicket: (forcedId?: string) => Ticket;
  setMyId: (id: string) => void;
}

const KioskView: React.FC<KioskViewProps> = ({ queue, onTakeTicket, setMyId }) => {
  const [lastGenerated, setLastGenerated] = useState<Ticket | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animationFrameId: number;
    let stream: MediaStream | null = null;

    const startScanner = async () => {
      if (!isScanning) return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          requestAnimationFrame(scan);
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setIsScanning(false);
      }
    };

    const scan = () => {
      if (!isScanning || !videoRef.current || !canvasRef.current) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (video.readyState === video.HAVE_ENOUGH_DATA && context) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code) {
          handleSuccessScan(code.data);
          return;
        }
      }
      animationFrameId = requestAnimationFrame(scan);
    };

    if (isScanning) {
      startScanner();
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isScanning]);

  const handleSuccessScan = (data: string) => {
    setIsScanning(false);
    setIsIssuing(true);
    
    // Simulate a bit of processing for dramatic effect
    setTimeout(() => {
      const ticket = onTakeTicket();
      // If it's a member pass, we link it
      if (data.startsWith('MEM_')) {
        setMyId(ticket.id);
      }
      setLastGenerated(ticket);
      setIsIssuing(false);
    }, 1500);
  };

  const stopScanner = () => {
    setIsScanning(false);
  };

  const waitingCount = queue.tickets.filter(t => t.status === TicketStatus.WAITING).length;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      <div className="bg-indigo-600 rounded-[3rem] p-10 md:p-16 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full -mr-48 -mt-48 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-400/20 rounded-full -ml-32 -mb-32 blur-3xl" />
        
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="text-center md:text-left space-y-8">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-5 py-2 rounded-full border border-white/20 text-xs font-black uppercase tracking-widest">
              <Zap size={14} className="text-yellow-300 fill-yellow-300" /> Fast Pass Kiosk
            </div>
            <h2 className="text-5xl md:text-7xl font-black leading-tight tracking-tighter">Show pass to check-in</h2>
            <p className="text-indigo-100 text-xl font-medium leading-relaxed opacity-80">
              Hold your Digital Member Pass QR up to the camera or tap the screen to join the queue.
            </p>
            
            <div className="flex gap-10 items-center pt-4 justify-center md:justify-start">
              <div className="text-center md:text-left">
                <p className="text-5xl font-black">{waitingCount}</p>
                <p className="text-indigo-300 text-[10px] uppercase tracking-[0.3em] font-black mt-1">Waiting</p>
              </div>
              <div className="w-px h-16 bg-white/10" />
              <div className="text-center md:text-left">
                <p className="text-5xl font-black">{waitingCount * 5}m</p>
                <p className="text-indigo-300 text-[10px] uppercase tracking-[0.3em] font-black mt-1">Est. Time</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center">
            {isScanning ? (
              <div className="w-full aspect-square max-w-[360px] bg-black rounded-[3.5rem] border-[12px] border-indigo-400 overflow-hidden relative shadow-2xl">
                <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" />
                <canvas ref={canvasRef} className="hidden" />
                
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                   <div className="w-56 h-56 border-4 border-dashed border-white/20 rounded-[2.5rem] relative">
                      <div className="absolute inset-x-0 top-0 h-2 bg-indigo-500 shadow-[0_0_25px_rgba(79,70,229,1)] animate-scanLine" />
                   </div>
                   <div className="mt-8">
                      <p className="text-white text-[10px] font-black uppercase tracking-[0.3em] bg-black/60 px-5 py-2 rounded-full backdrop-blur-md border border-white/10">Align Member QR Code</p>
                   </div>
                </div>

                <button 
                  onClick={stopScanner}
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/10 hover:bg-white/30 backdrop-blur-xl text-white p-4 rounded-3xl transition-all border border-white/10 shadow-lg"
                >
                  <X size={24} />
                </button>
              </div>
            ) : isIssuing ? (
              <div className="bg-white p-12 md:p-16 rounded-[4rem] shadow-2xl flex flex-col items-center gap-6 animate-pulse">
                  <div className="bg-indigo-100 p-8 rounded-full text-indigo-600">
                    <Loader2 size={64} className="animate-spin" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Issuing Ticket...</h3>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => setIsScanning(true)}
                  className="group relative bg-white p-1 rounded-[4rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] transition-all hover:scale-[1.03] active:scale-95"
                >
                  <div className="bg-slate-50 p-10 md:p-14 rounded-[3.5rem] border-4 border-dashed border-indigo-100 flex flex-col items-center gap-8">
                    <div className="relative">
                       <QrCode size={100} className="text-slate-800 transition-colors group-hover:text-indigo-600" />
                       <div className="absolute -top-4 -right-4 bg-indigo-600 p-4 rounded-2xl text-white shadow-xl rotate-12 group-hover:rotate-0 transition-transform">
                          <Camera size={28} />
                       </div>
                    </div>
                    <div className="text-center">
                      <span className="inline-block bg-indigo-600 text-white px-10 py-5 rounded-[2rem] font-black text-xl shadow-2xl shadow-indigo-200 group-hover:bg-indigo-700 transition-all uppercase tracking-tight">
                        Scan Member Pass
                      </span>
                    </div>
                  </div>
                </button>

                <button 
                  onClick={() => handleSuccessScan('SCREEN_TAP')}
                  className="w-full bg-slate-900/40 hover:bg-slate-900/60 backdrop-blur-md text-white py-6 rounded-[2.5rem] font-black text-lg transition-all border border-white/10 shadow-xl"
                >
                  No Pass? Tap Here
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {lastGenerated && (
        <div className="bg-white rounded-[3.5rem] p-10 shadow-2xl border border-slate-100 flex flex-col md:flex-row items-center gap-12 animate-slideUp">
          <div className="bg-slate-900 p-14 rounded-[3rem] text-white text-center w-full md:w-auto relative overflow-hidden group">
             <div className="absolute inset-0 bg-indigo-600/10 group-hover:scale-110 transition-transform duration-1000" />
             <p className="text-indigo-400 text-xs font-black uppercase tracking-[0.3em] mb-4 relative z-10">Your Number</p>
             <span className="text-9xl font-black block leading-none relative z-10 drop-shadow-2xl">{lastGenerated.number}</span>
             <div className="mt-8 flex items-center justify-center gap-2 relative z-10">
               <Sparkles size={16} className="text-yellow-300" />
               <p className="text-slate-500 text-[10px] font-mono tracking-widest uppercase">Check-in Success</p>
             </div>
          </div>
          
          <div className="flex-1 text-center md:text-left space-y-6">
            <div className="space-y-2">
               <h3 className="text-4xl font-black text-slate-900 tracking-tight">You're in!</h3>
               <p className="text-slate-500 text-xl font-medium leading-relaxed">Your digital pass has been updated. You can track your progress on your phone in the "My Pass" tab.</p>
            </div>
            <div className="pt-6">
              <button 
                onClick={() => setLastGenerated(null)}
                className="w-full md:w-auto bg-slate-900 text-white px-12 py-5 rounded-3xl font-black text-lg hover:bg-indigo-600 transition-all hover:shadow-2xl active:scale-95 uppercase tracking-tight"
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 text-slate-500 shadow-sm">
         <div className="bg-indigo-50 p-4 rounded-3xl text-indigo-500">
           <Info size={28} />
         </div>
         <p className="text-sm font-semibold leading-relaxed">This terminal is contactless. Simply hold up your Digital Membership Pass from the "My Pass" tab on your mobile device to join instantly.</p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scanLine {
          0% { top: 0; }
          100% { top: 100%; }
        }
        .animate-scanLine {
          animation: scanLine 2.5s ease-in-out infinite;
        }
      `}} />
    </div>
  );
};

export default KioskView;
