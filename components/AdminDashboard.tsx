
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { QueueState, TicketStatus, Ticket, Counter, User, UserRole } from '../types';
import { 
  Play, 
  CheckCircle, 
  Settings, 
  TrendingUp, 
  RefreshCcw,
  Volume2,
  BrainCircuit,
  Camera,
  X,
  Mic2,
  UserMinus,
  QrCode,
  Users,
  Lock,
  LogOut,
  UserPlus,
  ArrowRight,
  Shield,
  Waves,
  Trash2,
  AlertTriangle,
  Layout,
  VolumeX
} from 'lucide-react';
import { generateAIReport, generateCallingAudio } from '../services/geminiService';
import jsQR from 'jsqr';

// Audio Helpers
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

interface AdminDashboardProps {
  queue: QueueState;
  onUpdateStatus: (ticketId: string, status: TicketStatus, counterId?: string) => void;
  onToggleCounter: (counterId: string) => void;
  onAddCounter: (name: string) => void;
  onReset: () => void;
  currentUser: User | null;
  onLogin: (user: User) => void;
  onLogout: () => void;
  onRegisterStaff: (userData: Omit<User, 'id'>) => void;
  onDeleteStaff: (userId: string) => void;
  onUpdateVoice: (userId: string, voice: 'MAN' | 'WOMAN') => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  queue, 
  onUpdateStatus, 
  onToggleCounter, 
  onAddCounter,
  onReset,
  currentUser,
  onLogin,
  onLogout,
  onRegisterStaff,
  onDeleteStaff,
  onUpdateVoice
}) => {
  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // UI State
  const [activeTab, setActiveTab] = useState<'LIVE' | 'REPORT' | 'STAFF'>('LIVE');
  const [reportRange, setReportRange] = useState<'WEEK' | 'MONTH' | 'YEAR'>('WEEK');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isCallingAudio, setIsCallingAudio] = useState<string | null>(null);

  // Registration & Counter State
  const [regUser, setRegUser] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regCounter, setRegCounter] = useState('');
  const [newCounterName, setNewCounterName] = useState('');
  
  // Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [activeCounterForScan, setActiveCounterForScan] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);

  const waitingTickets = useMemo(() => 
    queue.tickets.filter(t => t.status === TicketStatus.WAITING).sort((a, b) => a.createdAt - b.createdAt),
    [queue.tickets]
  );

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = queue.users.find(u => u.username === username && u.password === password);
    if (user) {
      onLogin(user);
      setLoginError('');
      setUsername('');
      setPassword('');
    } else {
      setLoginError('Invalid credentials');
    }
  };

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
        console.error("Camera error:", err);
      }
    };

    const scan = () => {
      if (!isScanning || !videoRef.current || !canvasRef.current) return;
      const context = canvasRef.current.getContext('2d');
      if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && context) {
        canvasRef.current.height = videoRef.current.videoHeight;
        canvasRef.current.width = videoRef.current.videoWidth;
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        const imageData = context.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          const foundTicket = queue.tickets.find(t => t.id === code.data && t.status === TicketStatus.WAITING);
          if (foundTicket && activeCounterForScan) {
            handleCallTicket(foundTicket.id, activeCounterForScan);
            setIsScanning(false);
            return;
          }
        }
      }
      animationFrameId = requestAnimationFrame(scan);
    };

    if (isScanning) startScanner();
    return () => {
      cancelAnimationFrame(animationFrameId);
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [isScanning, activeCounterForScan, queue.tickets]);

  const playAnnouncement = async (ticketNumber: number, counterName: string, counterId: string) => {
    setIsCallingAudio(counterId);
    // Find the voice preference for the person logged in OR the person assigned to this counter
    const currentStaffPref = currentUser?.voicePreference;
    const assignedStaffPref = queue.users.find(u => u.assignedCounterId === counterId)?.voicePreference;
    const voicePref = currentStaffPref || assignedStaffPref || 'MAN';

    try {
      const base64Audio = await generateCallingAudio(ticketNumber, counterName, voicePref);
      if (base64Audio) {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') await ctx.resume();
        const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => setIsCallingAudio(null);
        source.start();
      } else {
        setIsCallingAudio(null);
      }
    } catch (error) {
      console.error("Audio Playback Error:", error);
      setIsCallingAudio(null);
    }
  };

  const handleCallNext = async (counterId: string) => {
    if (waitingTickets.length > 0) {
      const nextTicket = waitingTickets[0];
      const counter = queue.counters.find(c => c.id === counterId);
      onUpdateStatus(nextTicket.id, TicketStatus.CALLING, counterId);
      if (counter) await playAnnouncement(nextTicket.number, counter.name, counterId);
    }
  };

  const handleCallTicket = async (ticketId: string, counterId: string) => {
    const ticket = queue.tickets.find(t => t.id === ticketId);
    const counter = queue.counters.find(c => c.id === counterId);
    onUpdateStatus(ticketId, TicketStatus.CALLING, counterId);
    if (ticket && counter) await playAnnouncement(ticket.number, counter.name, counterId);
  };

  const handleRecall = async (ticket: Ticket, counter: Counter) => {
    await playAnnouncement(ticket.number, counter.name, counter.id);
  };

  const handleAIReport = async () => {
    setIsGeneratingReport(true);
    setAiReport(null);
    try {
      const report = await generateAIReport(queue.tickets, reportRange);
      setAiReport(report);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const isFullAdmin = currentUser?.role === UserRole.FULL_ADMIN;
  
  const assignedCounterIds = useMemo(() => 
    queue.users
      .filter(u => u.role === UserRole.STAFF)
      .map(u => u.assignedCounterId),
    [queue.users]
  );

  const availableCountersForRegistration = useMemo(() => 
    queue.counters.filter(c => !assignedCounterIds.includes(c.id)),
    [queue.counters, assignedCounterIds]
  );

  const handleDeleteStaffLocal = (userId: string) => {
    if (window.confirm("FATAL: Delete this staff account? Access will be revoked immediately and their counter will be freed.")) {
      onDeleteStaff(userId);
    }
  };

  const handleResetLocal = () => {
    if (window.confirm("WARNING: This will wipe ALL data, logout everyone, and reset to factory defaults. Are you absolutely sure?")) {
      onReset();
      alert("System has been fully reset to default state.");
    }
  };

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto py-20 animate-fadeIn">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 relative overflow-hidden text-center">
          <div className="absolute top-0 inset-x-0 h-2 bg-indigo-600" />
          <div className="bg-indigo-100 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto text-indigo-600 mb-6 shadow-inner">
             <Lock size={36} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Admin Portal</h2>
          <p className="text-slate-500 font-medium mb-10">Sign in to manage the queue</p>

          <form onSubmit={handleLogin} className="space-y-6 text-left">
            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Username</label>
               <input 
                 type="text" 
                 value={username}
                 onChange={(e) => setUsername(e.target.value)}
                 className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 focus:border-indigo-500 transition-all outline-none font-bold"
                 placeholder="admin"
               />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Password</label>
               <input 
                 type="password" 
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 focus:border-indigo-500 transition-all outline-none font-bold"
                 placeholder="••••••••"
               />
            </div>
            {loginError && <p className="text-rose-500 text-sm font-bold text-center">{loginError}</p>}
            <button className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl">
               PROCEED TO DASHBOARD <ArrowRight size={20} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  const filteredCounters = isFullAdmin 
    ? queue.counters 
    : queue.counters.filter(c => c.id === currentUser.assignedCounterId);

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      {/* Scanner Modal */}
      {isScanning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 backdrop-blur-md p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-lg overflow-hidden relative shadow-2xl">
            <button onClick={() => setIsScanning(false)} className="absolute top-6 right-6 z-10 p-3 bg-slate-100 rounded-2xl"><X /></button>
            <div className="p-10 space-y-8">
               <div className="text-center"><h3 className="text-2xl font-black">Scan QR</h3><p className="text-slate-500">Scanning for customer pass...</p></div>
               <div className="relative aspect-square bg-slate-900 rounded-[2rem] overflow-hidden border-8 border-indigo-600">
                  <video ref={videoRef} className="h-full w-full object-cover scale-x-[-1]" />
                  <canvas ref={canvasRef} className="hidden" />
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
           <div className="bg-indigo-600 p-4 rounded-2xl text-white shadow-lg">
             {isFullAdmin ? <Shield size={28} /> : <Users size={28} />}
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logged in as</p>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">{currentUser.username} <span className="text-indigo-600 text-sm font-bold opacity-50 ml-2">[{currentUser.role}]</span></h2>
           </div>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
           <button onClick={() => setActiveTab('LIVE')} className={`px-6 py-3 rounded-xl text-sm font-black transition-all ${activeTab === 'LIVE' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}>Live Control</button>
           {isFullAdmin && (
             <>
               <button onClick={() => setActiveTab('REPORT')} className={`px-6 py-3 rounded-xl text-sm font-black transition-all ${activeTab === 'REPORT' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}>Analytics</button>
               <button onClick={() => setActiveTab('STAFF')} className={`px-6 py-3 rounded-xl text-sm font-black transition-all ${activeTab === 'STAFF' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}>System Settings</button>
             </>
           )}
        </div>

        <button onClick={onLogout} className="px-6 py-3 text-rose-600 hover:bg-rose-50 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all">
          <LogOut size={16} /> Logout
        </button>
      </div>

      {activeTab === 'LIVE' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
             {/* Voice Preference Section for Current User */}
             <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                   <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600">
                      <Volume2 size={24} />
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Call Settings</p>
                      <h4 className="font-black text-slate-800">Announcement Voice</h4>
                   </div>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                   <button 
                     onClick={() => onUpdateVoice(currentUser.id, 'MAN')}
                     className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-xs font-black transition-all ${currentUser.voicePreference === 'MAN' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}
                   >
                     Male (Puck)
                   </button>
                   <button 
                     onClick={() => onUpdateVoice(currentUser.id, 'WOMAN')}
                     className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-xs font-black transition-all ${currentUser.voicePreference === 'WOMAN' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}
                   >
                     Female (Kore)
                   </button>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredCounters.length === 0 ? (
                  <div className="bg-white p-12 rounded-[2.5rem] border border-dashed border-slate-200 text-center col-span-full">
                     <AlertTriangle size={48} className="mx-auto text-amber-500 mb-4 opacity-30" />
                     <p className="text-slate-500 font-bold">No counters assigned to your account.</p>
                  </div>
                ) : (
                  filteredCounters.map(counter => {
                    const currentTicket = queue.tickets.find(t => t.id === counter.currentTicketId);
                    const isCalling = isCallingAudio === counter.id;
                    return (
                      <div key={counter.id} className="bg-white rounded-[2.5rem] border-2 border-slate-50 p-8 shadow-xl">
                         <div className="flex items-center justify-between mb-8">
                            <div>
                               <h3 className="text-2xl font-black text-slate-900">{counter.name}</h3>
                               <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Station Active</span>
                            </div>
                            <button 
                              onClick={() => { setIsScanning(true); setActiveCounterForScan(counter.id); }}
                              className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-all"
                            >
                              <Camera size={24} />
                            </button>
                         </div>

                         <div className={`rounded-[2rem] p-10 flex flex-col items-center justify-center transition-all duration-500 ${isCalling ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-50 border border-slate-100'}`}>
                            {currentTicket ? (
                              <>
                                <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">Serving Now</p>
                                <span className="text-8xl font-black">{currentTicket.number}</span>
                              </>
                            ) : (
                              <div className="text-center opacity-40">
                                 <Play size={40} className="mx-auto mb-4" />
                                 <p className="font-black text-xs uppercase">Awaiting Call</p>
                              </div>
                            )}
                         </div>

                         <div className="mt-8 grid grid-cols-1 gap-4">
                            {currentTicket ? (
                              <div className="flex flex-col gap-3">
                                 <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => onUpdateStatus(currentTicket.id, TicketStatus.SERVED, counter.id)} className="bg-emerald-600 text-white py-4 rounded-2xl font-black hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-100">DONE</button>
                                    <button onClick={() => onUpdateStatus(currentTicket.id, TicketStatus.CANCELLED, counter.id)} className="bg-rose-50 text-rose-600 py-4 rounded-2xl font-black hover:bg-rose-100 transition-all active:scale-95 border border-rose-100">SKIP</button>
                                 </div>
                                 <button 
                                   disabled={isCalling}
                                   onClick={() => handleRecall(currentTicket, counter)} 
                                   className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all border-2 border-dashed ${isCalling ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-wait' : 'bg-white text-indigo-600 border-indigo-200 hover:border-indigo-600 hover:bg-indigo-50 active:scale-95'}`}
                                 >
                                    {isCalling ? <RefreshCcw className="animate-spin" size={16} /> : <Volume2 size={16} />} 
                                    {isCalling ? 'Announcing...' : 'Recall Number'}
                                 </button>
                              </div>
                            ) : (
                              <button 
                                disabled={waitingTickets.length === 0 || isCalling}
                                onClick={() => handleCallNext(counter.id)}
                                className="bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-slate-100 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                              >
                                {isCalling ? <RefreshCcw className="animate-spin" /> : <Volume2 />} 
                                {isCalling ? 'CALLING...' : 'CALL NEXT'}
                              </button>
                            )}
                         </div>
                      </div>
                    );
                  })
                )}
             </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 flex flex-col min-h-[500px]">
             <h3 className="text-xl font-black mb-8 flex items-center gap-3"><Users className="text-indigo-600" /> QUEUE POOL</h3>
             <div className="space-y-4 flex-1 overflow-auto pr-2 custom-scrollbar">
                {waitingTickets.length === 0 ? (
                  <div className="text-center py-20 text-slate-300 font-black italic">No customers waiting</div>
                ) : (
                  waitingTickets.map((t, idx) => (
                    <div key={t.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-indigo-500 transition-all">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black group-hover:bg-indigo-600 transition-colors">{t.number}</div>
                          <span className="text-xs font-black text-slate-400">#{idx + 1} In Line</span>
                       </div>
                       <QrCode size={20} className="text-slate-200" />
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>
      )}

      {activeTab === 'STAFF' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fadeIn">
           <div className="space-y-8">
              {/* Register Staff Section */}
              <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl">
                <h3 className="text-2xl font-black mb-8 flex items-center gap-3"><UserPlus className="text-indigo-600" /> Register Staff</h3>
                <div className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Username</label>
                      <input value={regUser} onChange={(e) => setRegUser(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 font-bold" placeholder="staff_name" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Password</label>
                      <input type="password" value={regPass} onChange={(e) => setRegPass(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 font-bold" placeholder="••••••••" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Assign Counter</label>
                      <select value={regCounter} onChange={(e) => setRegCounter(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 font-bold appearance-none">
                         <option value="">Select Counter...</option>
                         {availableCountersForRegistration.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      {availableCountersForRegistration.length === 0 && (
                        <p className="text-[10px] font-bold text-rose-500 ml-4 uppercase mt-1 flex items-center gap-1"><AlertTriangle size={12} /> No Counters Available</p>
                      )}
                   </div>
                   <button 
                     disabled={availableCountersForRegistration.length === 0}
                     onClick={() => {
                       if(!regUser || !regPass || !regCounter) return alert('Fill all fields');
                       onRegisterStaff({ username: regUser, password: regPass, role: UserRole.STAFF, assignedCounterId: regCounter, voicePreference: 'MAN' });
                       setRegUser(''); setRegPass(''); setRegCounter('');
                       alert('Staff member registered!');
                     }}
                     className={`w-full py-5 rounded-2xl font-black text-lg transition-all shadow-xl ${availableCountersForRegistration.length === 0 ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white hover:bg-indigo-600'}`}
                   >
                     CREATE STAFF ACCOUNT
                   </button>
                </div>
              </div>

              {/* Add Counter Section (NEW) */}
              <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl">
                <h3 className="text-2xl font-black mb-8 flex items-center gap-3"><Layout className="text-indigo-600" /> Counter Management</h3>
                <div className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Counter Name</label>
                      <input 
                        value={newCounterName} 
                        onChange={(e) => setNewCounterName(e.target.value)} 
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 font-bold" 
                        placeholder="e.g. Counter 5 or VIP Desk" 
                      />
                   </div>
                   <button 
                     onClick={() => {
                       if(!newCounterName) return alert('Please enter a counter name');
                       onAddCounter(newCounterName);
                       setNewCounterName('');
                       alert(`Counter "${newCounterName}" added successfully!`);
                     }}
                     className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-xl"
                   >
                     ADD NEW COUNTER
                   </button>
                </div>
              </div>

              {/* Danger Zone Section */}
              <div className="bg-white p-10 rounded-[3rem] border border-rose-100 shadow-xl bg-rose-50/20">
                <div className="flex items-center gap-3 text-rose-600 mb-6">
                   <AlertTriangle size={24} />
                   <h4 className="font-black uppercase tracking-widest text-xs">Danger Zone</h4>
                </div>
                <button 
                  onClick={handleResetLocal} 
                  className="w-full py-5 text-rose-600 border-2 border-rose-100 rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all active:scale-95"
                >
                  <RefreshCcw size={18} /> WIPE ALL SYSTEM DATA
                </button>
              </div>
           </div>

           <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl flex flex-col h-full">
              <h3 className="text-2xl font-black mb-8">System Directory</h3>
              <div className="space-y-6 flex-1 overflow-auto pr-2 custom-scrollbar">
                 <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Active Staff</p>
                    {queue.users.map(u => (
                      <div key={u.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black ${u.role === UserRole.FULL_ADMIN ? 'bg-slate-900 text-white shadow-md' : 'bg-indigo-100 text-indigo-600'}`}>
                               {u.username[0].toUpperCase()}
                            </div>
                            <div>
                               <p className="font-black text-slate-900 tracking-tight">{u.username}</p>
                               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                  {u.role} {u.assignedCounterId ? `• ${queue.counters.find(c => c.id === u.assignedCounterId)?.name}` : ''}
                               </p>
                            </div>
                         </div>
                         
                         {u.id !== 'admin-1' && (
                           <button 
                             onClick={() => handleDeleteStaffLocal(u.id)}
                             className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                           >
                              <Trash2 size={20} />
                           </button>
                         )}
                      </div>
                    ))}
                 </div>

                 <div className="space-y-3 pt-6 border-t border-slate-100">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">System Counters</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       {queue.counters.map(c => (
                         <div key={c.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                            <span className="font-black text-slate-700">{c.name}</span>
                            <div className={`w-2 h-2 rounded-full ${c.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'REPORT' && (
        <div className="space-y-8 animate-fadeIn">
           <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden">
              <div className="relative z-10 space-y-8">
                 <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                       <BrainCircuit size={48} className="text-indigo-400" />
                       <h3 className="text-3xl font-black">AI Business Analytics</h3>
                    </div>
                    <button 
                      onClick={handleAIReport} 
                      disabled={isGeneratingReport} 
                      className="px-10 py-5 bg-indigo-600 rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all flex items-center gap-3"
                    >
                      {isGeneratingReport ? <RefreshCcw className="animate-spin" /> : <TrendingUp />} GENERATE REPORT
                    </button>
                 </div>

                 <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/10 min-h-[400px]">
                    {aiReport ? (
                      <div className="prose prose-invert max-w-none whitespace-pre-wrap leading-relaxed">{aiReport}</div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-20">
                         <Waves size={100} className="mb-6 animate-pulse" />
                         <p className="text-2xl font-black">Run report to see AI-driven insights</p>
                      </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 10px;
        }
      `}} />
    </div>
  );
};

export default AdminDashboard;
