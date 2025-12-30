
import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  QrCode, 
  Smartphone, 
  ArrowRight, 
  CheckCircle, 
  Sparkles, 
  Clock, 
  MapPin, 
  AlertCircle,
  XCircle,
  ChevronRight,
  Users,
  ShieldCheck,
  Zap,
  Loader2
} from 'lucide-react';
import { Ticket, TicketStatus, Counter } from '../types';

interface DigitalPassViewProps {
  myTicketId: string | null;
  tickets: Ticket[];
  counters: Counter[];
  onJoin: () => void;
  onClear: () => void;
}

const DigitalPassView: React.FC<DigitalPassViewProps> = ({ 
  myTicketId, 
  tickets, 
  counters, 
  onJoin, 
  onClear 
}) => {
  const [isJoining, setIsJoining] = useState(false);
  const myTicket = tickets.find(t => t.id === myTicketId);
  const isFinished = myTicket && (myTicket.status === TicketStatus.SERVED || myTicket.status === TicketStatus.CANCELLED);
  
  const waitingTickets = tickets.filter(t => t.status === TicketStatus.WAITING).sort((a, b) => a.createdAt - b.createdAt);
  const myPosition = myTicket ? waitingTickets.findIndex(t => t.id === myTicket.id) + 1 : 0;
  
  const counter = myTicket?.counterId ? counters.find(c => c.id === myTicket.counterId) : null;

  const handleJoin = () => {
    setIsJoining(true);
    // Add a small delay for feedback
    setTimeout(() => {
      onJoin();
      setIsJoining(false);
    }, 600);
  };

  // If no ticket, show the Member Pass UI
  if (!myTicket || isFinished) {
    return (
      <div className="max-w-md mx-auto py-8 px-4 animate-fadeIn">
        <div className="text-center space-y-8">
          <div className="relative inline-block">
             <div className="absolute inset-0 bg-indigo-500 rounded-full blur-2xl opacity-20 animate-pulse" />
             <div className="bg-indigo-600 w-32 h-32 rounded-[2.5rem] flex items-center justify-center mx-auto text-white shadow-2xl relative rotate-3">
                <QrCode size={64} />
             </div>
          </div>
          
          <div className="space-y-3">
            <h2 className="text-4xl font-black text-slate-800 tracking-tighter italic">
              {isFinished ? "Service Completed" : "Quick Check-in"}
            </h2>
            <p className="text-slate-500 text-lg font-medium leading-relaxed">
              {isFinished 
                ? "Thanks for visiting! Ready for another round?" 
                : "Hold this code up to the Entry Kiosk to join the queue instantly."}
            </p>
          </div>

          {/* This is the Member Pass that the Kiosk reads */}
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-100 flex flex-col items-center gap-6 relative overflow-hidden group">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-indigo-600" />
              <div className="w-full flex justify-between items-center mb-2">
                 <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-indigo-600" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Digital Identity</span>
                 </div>
                 <Zap size={18} className="text-yellow-400 fill-yellow-400" />
              </div>
              <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 shadow-inner group-hover:scale-105 transition-transform duration-500">
                <QRCodeSVG 
                  value="MEM_USER_DEFAULT" 
                  size={180}
                  level="H"
                />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Member: #VIP-4402</p>
          </div>

          <div className="flex flex-col gap-4">
            <button 
              onClick={handleJoin}
              disabled={isJoining}
              className="w-full bg-slate-900 text-white py-6 rounded-[2.5rem] font-black text-xl shadow-2xl hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isJoining ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <>
                  <Smartphone size={24} />
                  JOIN FROM PHONE
                </>
              )}
            </button>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">or use the kiosk at the entrance</p>
          </div>

          <div className="pt-4 grid grid-cols-2 gap-4">
             <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm text-center">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">WAITING</p>
                <p className="text-3xl font-black text-slate-800">{waitingTickets.length}</p>
             </div>
             <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm text-center">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">AVG. WAIT</p>
                <p className="text-3xl font-black text-slate-800">~15m</p>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-4 px-2 animate-fadeIn">
      {/* Dynamic Status Banner */}
      <div className={`mb-6 rounded-[2.5rem] p-6 text-white shadow-lg flex items-center gap-4 transition-colors duration-500 ${myTicket.status === TicketStatus.CALLING ? 'bg-emerald-500 animate-pulse' : 'bg-slate-900'}`}>
        <div className="bg-white/20 p-3 rounded-2xl">
           {myTicket.status === TicketStatus.CALLING ? <AlertCircle size={28} /> : <Clock size={28} />}
        </div>
        <div>
          <h3 className="text-lg font-black leading-tight uppercase tracking-tighter italic">
            {myTicket.status === TicketStatus.CALLING ? 'IT\'S YOUR TURN!' : 'WAITING FOR SERVICE'}
          </h3>
          <p className="text-white/70 text-sm font-medium">
            {myTicket.status === TicketStatus.CALLING ? `Please head to ${counter?.name}` : `Currently at position #${myPosition}`}
          </p>
        </div>
      </div>

      {/* Main Digital Ticket Card */}
      <div className="relative group">
        <div className="absolute inset-0 bg-indigo-500 rounded-[3rem] blur-3xl opacity-10" />
        
        <div className="relative bg-white rounded-[3.5rem] overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
          {/* Card Top Section */}
          <div className="bg-indigo-600 p-10 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest mb-1">PRIORITY PASS</p>
                <h3 className="text-3xl font-black tracking-tighter italic">Q-Master Pro</h3>
              </div>
              <Sparkles className="text-yellow-300 fill-yellow-300" size={28} />
            </div>

            <div className="mt-10 flex items-end justify-between relative z-10">
               <div>
                 <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">YOUR NUMBER</p>
                 <span className="text-9xl font-black leading-none drop-shadow-lg">{myTicket.number}</span>
               </div>
               <div className="text-right">
                  <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">ISSUED AT</p>
                  <p className="text-2xl font-black">{new Date(myTicket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
               </div>
            </div>
          </div>

          {/* Card Middle: Instruction / QR */}
          <div className="p-10 flex flex-col items-center bg-white">
            {myTicket.status === TicketStatus.CALLING ? (
              <div className="w-full space-y-6 py-4">
                 <div className="bg-slate-50 rounded-[2.5rem] p-10 border-2 border-emerald-500 flex flex-col items-center text-center">
                    <p className="text-emerald-500 text-xs font-black uppercase tracking-widest mb-4">NOW SERVING AT</p>
                    <div className="flex items-center gap-4">
                       <span className="text-6xl font-black text-slate-900 tracking-tighter">{counter?.name || 'Counter'}</span>
                       <MapPin className="text-indigo-600" size={48} />
                    </div>
                 </div>
                 <p className="text-center text-slate-500 font-medium px-4">Please present your screen to the staff at the counter to verify your arrival.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                 <div className="relative p-6 bg-slate-50 rounded-[3rem] border-2 border-slate-100 shadow-inner">
                    <QRCodeSVG 
                      value={myTicket.id} 
                      size={200}
                      level="H"
                    />
                    <div className="absolute inset-x-0 top-0 h-1 bg-indigo-500/30 blur-sm animate-scanLine pointer-events-none" />
                 </div>
                 <p className="mt-8 text-slate-400 text-xs font-bold uppercase tracking-[0.3em]">SCAN AT DESK IF ASKED</p>
              </div>
            )}
          </div>

          {/* Card Bottom: Summary */}
          <div className="bg-slate-50 p-10 border-t border-slate-100 mt-auto">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-slate-100">
                    <Users size={24} className="text-indigo-600" />
                 </div>
                 <div>
                    <p className="text-slate-400 text-[10px] font-black uppercase">PEOPLE AHEAD</p>
                    <p className="text-xl font-black text-slate-800">{Math.max(0, myPosition - 1)} Individuals</p>
                 </div>
              </div>
              <ChevronRight className="text-slate-300" />
            </div>

            <button 
              onClick={() => {
                if (window.confirm("Abandon your spot in the queue?")) onClear();
              }}
              className="w-full py-4 text-slate-400 hover:text-rose-500 font-bold text-sm flex items-center justify-center gap-2 transition-colors uppercase tracking-widest"
            >
              <XCircle size={18} /> Cancel My Ticket
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-5 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm text-slate-500">
         <div className="bg-indigo-50 p-4 rounded-3xl text-indigo-600">
           <AlertCircle size={28} />
         </div>
         <p className="text-sm font-medium leading-relaxed"> We will notify you on this screen when your number is called. Please stay nearby!</p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scanLine {
          0% { top: 0; }
          100% { top: 100%; }
        }
        .animate-scanLine {
          animation: scanLine 4s ease-in-out infinite;
        }
      `}} />
    </div>
  );
};

export default DigitalPassView;
