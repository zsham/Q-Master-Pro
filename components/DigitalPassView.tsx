
import React, { useState, useEffect, useMemo } from 'react';
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
  Loader2,
  TrendingUp,
  BellRing,
  Volume2,
  Lock
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
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  
  const myTicket = useMemo(() => tickets.find(t => t.id === myTicketId), [tickets, myTicketId]);
  const isFinished = myTicket && (myTicket.status === TicketStatus.SERVED || myTicket.status === TicketStatus.CANCELLED);
  
  const waitingTickets = useMemo(() => 
    tickets.filter(t => t.status === TicketStatus.WAITING).sort((a, b) => a.createdAt - b.createdAt),
    [tickets]
  );
  
  const myPosition = useMemo(() => 
    myTicket ? waitingTickets.findIndex(t => t.id === myTicket.id) + 1 : 0,
    [myTicket, waitingTickets]
  );
  
  const counter = useMemo(() => 
    myTicket?.counterId ? counters.find(c => c.id === myTicket.counterId) : null,
    [myTicket, counters]
  );

  const handleJoin = () => {
    setIsJoining(true);
    setTimeout(() => {
      onJoin();
      setIsJoining(false);
    }, 600);
  };

  // Progress logic
  const steps = [
    { label: 'In Queue', active: myTicket && !isFinished },
    { label: 'Next Up', active: myTicket && myPosition <= 3 && myPosition > 0 && myTicket.status === TicketStatus.WAITING },
    { label: 'At Counter', active: myTicket && myTicket.status === TicketStatus.CALLING }
  ];

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
                : "Join the queue or check in with your Member QR code."}
            </p>
          </div>

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
                <QRCodeSVG value="MEM_USER_DEFAULT" size={180} level="H" />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Member: #VIP-4402</p>
          </div>

          <div className="flex flex-col gap-4">
            <button 
              onClick={handleJoin}
              disabled={isJoining}
              className="w-full bg-slate-900 text-white py-6 rounded-[2.5rem] font-black text-xl shadow-2xl hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isJoining ? <Loader2 size={24} className="animate-spin" /> : <><Smartphone size={24} /> JOIN FROM PHONE</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-4 px-2 animate-fadeIn">
      {/* Live Status Progress Card */}
      <div className={`mb-6 rounded-[2.5rem] p-6 text-white shadow-xl flex items-center gap-4 transition-all duration-500 ${myTicket.status === TicketStatus.CALLING ? 'bg-emerald-500 scale-[1.02] ring-4 ring-emerald-500/20' : 'bg-slate-900'}`}>
        <div className="bg-white/20 p-4 rounded-2xl">
           {myTicket.status === TicketStatus.CALLING ? <AlertCircle size={32} className="animate-bounce" /> : <Clock size={32} />}
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-black leading-tight uppercase tracking-tighter italic">
            {myTicket.status === TicketStatus.CALLING ? 'IT\'S YOUR TURN!' : (myPosition <= 3 ? 'GET READY!' : 'WAITING')}
          </h3>
          <p className="text-white/70 text-sm font-medium">
            {myTicket.status === TicketStatus.CALLING ? `Go to ${counter?.name}` : `Position #${myPosition} • Est. ${myPosition * 4}m`}
          </p>
        </div>
      </div>

      {/* Live Progress Tracker */}
      <div className="mb-6 bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100">
         <div className="flex justify-between items-center mb-4 px-2">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Progress Tracker</h4>
            <div className="flex items-center gap-1.5">
               <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
               <span className="text-[10px] font-black text-slate-400 uppercase">Connected</span>
            </div>
         </div>
         
         <div className="relative flex justify-between px-4 pt-4">
            <div className="absolute top-[34px] left-0 right-0 h-1 bg-slate-100 -z-10 mx-12" />
            <div 
              className="absolute top-[34px] left-0 h-1 bg-indigo-600 -z-10 mx-12 transition-all duration-1000" 
              style={{ width: myTicket.status === TicketStatus.CALLING ? '100%' : myPosition <= 3 ? '50%' : '10%' }} 
            />
            
            {steps.map((step, idx) => (
               <div key={idx} className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${step.active ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'bg-white border-2 border-slate-100 text-slate-300'}`}>
                     {idx === 2 && step.active ? <Sparkles size={16} /> : <CheckCircle size={16} />}
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-tighter ${step.active ? 'text-indigo-600' : 'text-slate-300'}`}>
                    {step.label}
                  </span>
               </div>
            ))}
         </div>
      </div>

      {/* Notification Toggle Card */}
      <div className="mb-6 bg-white rounded-[2.5rem] p-5 border border-slate-100 shadow-sm flex items-center justify-between group">
         <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl transition-colors ${notificationsEnabled ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
               <BellRing size={20} className={notificationsEnabled ? 'animate-swing' : ''} />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Status Alerts</p>
               <h4 className="font-black text-slate-800 text-sm">Progress Notifications</h4>
            </div>
         </div>
         <button 
           onClick={() => setNotificationsEnabled(!notificationsEnabled)}
           className={`w-14 h-8 rounded-full transition-colors relative flex items-center px-1 ${notificationsEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
         >
            <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform ${notificationsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
         </button>
      </div>

      {/* Ticket Card */}
      <div className="relative">
        <div className="bg-white rounded-[3.5rem] overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
          <div className={`p-10 text-white relative overflow-hidden transition-colors duration-700 ${myTicket.status === TicketStatus.CALLING ? 'bg-emerald-600' : 'bg-indigo-600'}`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">PRO PASS TICKET</p>
                <h3 className="text-3xl font-black tracking-tighter italic">Official Pass</h3>
              </div>
              <TrendingUp className="text-white/30" size={28} />
            </div>

            <div className="mt-10 flex items-end justify-between relative z-10">
               <div>
                 <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">NUMBER</p>
                 <span className="text-9xl font-black leading-none drop-shadow-lg">{myTicket.number}</span>
               </div>
               <div className="text-right">
                  <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">CURRENT POS.</p>
                  <p className="text-3xl font-black italic">#{myPosition || '--'}</p>
               </div>
            </div>
          </div>

          <div className="p-10 flex flex-col items-center bg-white">
            {myTicket.status === TicketStatus.CALLING ? (
              <div className="w-full space-y-6 py-4 animate-fadeIn">
                 <div className="bg-slate-50 rounded-[2.5rem] p-10 border-4 border-emerald-500 flex flex-col items-center text-center shadow-inner">
                    <p className="text-emerald-500 text-xs font-black uppercase tracking-widest mb-4">PROCEED TO</p>
                    <div className="flex items-center gap-4">
                       <span className="text-5xl font-black text-slate-900 tracking-tighter">{counter?.name || 'Loading...'}</span>
                       <div className="p-3 bg-indigo-600 rounded-2xl text-white">
                          <MapPin size={32} />
                       </div>
                    </div>
                 </div>
                 <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                    <p className="text-center text-emerald-800 font-black text-sm uppercase tracking-tight">Show this screen to the staff at the desk.</p>
                 </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                 <div className="relative p-6 bg-slate-50 rounded-[3rem] border-2 border-slate-100 shadow-inner">
                    <QRCodeSVG value={myTicket.id} size={200} level="H" />
                    <div className="absolute inset-x-0 top-0 h-1 bg-indigo-500/30 blur-sm animate-scanLine pointer-events-none" />
                 </div>
                 <p className="mt-8 text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] italic">Member Access Key</p>
              </div>
            )}
          </div>

          <div className="bg-slate-50 p-8 border-t border-slate-100 mt-auto">
            <button 
              onClick={() => { if (window.confirm("Abandon your spot?")) onClear(); }}
              className="w-full py-4 text-slate-400 hover:text-rose-500 font-black text-[10px] flex items-center justify-center gap-2 transition-colors uppercase tracking-widest border-2 border-dashed border-slate-200 rounded-3xl"
            >
              <XCircle size={14} /> Abandon Queue Spot
            </button>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scanLine {
          0% { top: 0; }
          100% { top: 100%; }
        }
        @keyframes swing {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(15deg); }
          50% { transform: rotate(0deg); }
          75% { transform: rotate(-15deg); }
          100% { transform: rotate(0deg); }
        }
        .animate-scanLine {
          animation: scanLine 3s ease-in-out infinite;
        }
        .animate-swing {
          animation: swing 1s infinite;
        }
      `}} />
    </div>
  );
};

export default DigitalPassView;
