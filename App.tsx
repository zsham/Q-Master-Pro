
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Layout, Users, ShieldCheck, Monitor, Ticket as TicketIcon, Bell, ChevronRight } from 'lucide-react';
import CustomerView from './components/CustomerView';
import AdminDashboard from './components/AdminDashboard';
import KioskView from './components/KioskView';
import DigitalPassView from './components/DigitalPassView';
import { ViewMode, Ticket, Counter, TicketStatus, QueueState, User, UserRole } from './types';

const INITIAL_COUNTERS: Counter[] = [
  { id: '1', name: 'Counter 1', isActive: true },
  { id: '2', name: 'Counter 2', isActive: true },
  { id: '3', name: 'Counter 3', isActive: false },
  { id: '4', name: 'Counter 4', isActive: false },
];

const INITIAL_USERS: User[] = [
  { id: 'admin-1', username: 'admin', password: '123', role: UserRole.FULL_ADMIN }
];

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('KIOSK');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [myTicketId, setMyTicketId] = useState<string | null>(() => {
    const saved = localStorage.getItem('my_ticket_id');
    return (saved === 'null' || !saved) ? null : saved;
  });

  const [queue, setQueue] = useState<QueueState>(() => {
    const saved = localStorage.getItem('q_system_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.counters || parsed.counters.length === 0) parsed.counters = INITIAL_COUNTERS;
        if (!parsed.users || parsed.users.length === 0) parsed.users = INITIAL_USERS;
        return parsed;
      } catch (e) {
        console.error("Failed to parse queue state", e);
      }
    }
    return { tickets: [], counters: INITIAL_COUNTERS, users: INITIAL_USERS, lastNumber: 100 };
  });

  useEffect(() => {
    localStorage.setItem('q_system_state', JSON.stringify(queue));
    if (myTicketId) {
      localStorage.setItem('my_ticket_id', myTicketId);
    } else {
      localStorage.removeItem('my_ticket_id');
    }
  }, [queue, myTicketId]);

  const activeTicket = useMemo(() => {
    if (!myTicketId) return null;
    const t = queue.tickets.find(t => t.id === myTicketId);
    if (!t || t.status === TicketStatus.SERVED || t.status === TicketStatus.CANCELLED) return null;
    return t;
  }, [myTicketId, queue.tickets]);

  const waitingTickets = useMemo(() => 
    queue.tickets.filter(t => t.status === TicketStatus.WAITING).sort((a, b) => a.createdAt - b.createdAt),
    [queue.tickets]
  );

  const myPosition = useMemo(() => {
    if (!activeTicket) return null;
    const pos = waitingTickets.findIndex(t => t.id === activeTicket.id) + 1;
    return pos > 0 ? pos : (activeTicket.status === TicketStatus.CALLING ? 'NOW' : null);
  }, [activeTicket, waitingTickets]);

  const createTicket = useCallback((forcedId?: string): Ticket => {
    const ticketId = forcedId || Math.random().toString(36).substr(2, 9);
    let newTicket: Ticket;

    setQueue(prev => {
      const nextNum = prev.lastNumber + 1;
      newTicket = {
        id: ticketId,
        number: nextNum,
        status: TicketStatus.WAITING,
        createdAt: Date.now(),
      };
      return {
        ...prev,
        tickets: [...prev.tickets, newTicket],
        lastNumber: nextNum
      };
    });

    return { 
      id: ticketId, 
      number: queue.lastNumber + 1, 
      status: TicketStatus.WAITING, 
      createdAt: Date.now() 
    };
  }, [queue.lastNumber]);

  const handleJoinQueue = useCallback(() => {
    const ticket = createTicket();
    setMyTicketId(ticket.id);
    setViewMode('MY_PASS');
  }, [createTicket]);

  const updateTicketStatus = useCallback((ticketId: string, status: TicketStatus, counterId?: string) => {
    setQueue(prev => ({
      ...prev,
      tickets: prev.tickets.map(t => 
        t.id === ticketId 
          ? { 
              ...t, 
              status, 
              counterId: counterId || t.counterId, 
              calledAt: status === TicketStatus.CALLING ? Date.now() : t.calledAt, 
              servedAt: status === TicketStatus.SERVED ? Date.now() : t.servedAt 
            } 
          : t
      ),
      counters: prev.counters.map(c => 
        c.id === counterId 
          ? { 
              ...c, 
              currentTicketId: status === TicketStatus.CALLING ? ticketId : 
                ((status === TicketStatus.SERVED || status === TicketStatus.CANCELLED) ? undefined : c.currentTicketId) 
            }
          : c
      )
    }));
  }, []);

  const toggleCounter = useCallback((counterId: string) => {
    setQueue(prev => ({
      ...prev,
      counters: prev.counters.map(c => c.id === counterId ? { ...c, isActive: !c.isActive } : c)
    }));
  }, []);

  const addCounter = useCallback((name: string) => {
    setQueue(prev => ({
      ...prev,
      counters: [...prev.counters, {
        id: `counter-${Math.random().toString(36).substr(2, 9)}`,
        name,
        isActive: true
      }]
    }));
  }, []);

  const registerStaff = useCallback((userData: Omit<User, 'id'>) => {
    setQueue(prev => ({
      ...prev,
      users: [...prev.users, {
        ...userData,
        id: `staff-${Math.random().toString(36).substr(2, 9)}`,
        voicePreference: userData.voicePreference || 'MAN'
      }]
    }));
  }, []);

  const deleteStaff = useCallback((userId: string) => {
    if (userId === 'admin-1') return;
    setQueue(prev => ({
      ...prev,
      users: prev.users.filter(u => u.id !== userId)
    }));
  }, []);

  const updateStaffVoice = useCallback((userId: string, voice: 'MAN' | 'WOMAN') => {
    setQueue(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === userId ? { ...u, voicePreference: voice } : u)
    }));
    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, voicePreference: voice } : null);
    }
  }, [currentUser]);

  const resetQueue = useCallback(() => {
    const factoryState = { 
      tickets: [], 
      counters: INITIAL_COUNTERS, 
      users: INITIAL_USERS, 
      lastNumber: 100 
    };
    setQueue(factoryState);
    setMyTicketId(null);
    setCurrentUser(null);
    localStorage.removeItem('my_ticket_id');
    localStorage.removeItem('q_system_state');
    localStorage.setItem('q_system_state', JSON.stringify(factoryState));
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-indigo-100 bg-slate-50">
      <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-shrink-0 cursor-pointer group" onClick={() => setViewMode('KIOSK')}>
            <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform">
              <Layout size={24} />
            </div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight hidden sm:block">Q-Master <span className="text-indigo-600">Pro</span></h1>
          </div>
          
          <nav className="flex-1 flex justify-center overflow-x-auto no-scrollbar">
            <div className="flex bg-slate-100 p-1.5 rounded-2xl">
              <button 
                onClick={() => setViewMode('KIOSK')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${viewMode === 'KIOSK' ? 'bg-white shadow-md text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <Monitor size={18} />
                <span className="text-xs font-bold uppercase tracking-tight">Kiosk</span>
              </button>
              
              {activeTicket && (
                <button 
                  onClick={() => setViewMode('MY_PASS')}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl transition-all whitespace-nowrap relative ${viewMode === 'MY_PASS' ? 'bg-white shadow-md text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <TicketIcon size={18} />
                  <span className="text-xs font-bold uppercase tracking-tight">My Pass</span>
                  <div className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-[10px] items-center justify-center text-white font-black">!</span>
                  </div>
                </button>
              )}

              <button 
                onClick={() => setViewMode('ADMIN')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${viewMode === 'ADMIN' ? 'bg-white shadow-md text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <ShieldCheck size={18} />
                <span className="text-xs font-bold uppercase tracking-tight">Admin</span>
              </button>
              
              <button 
                onClick={() => setViewMode('CUSTOMER')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${viewMode === 'CUSTOMER' ? 'bg-white shadow-md text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <Users size={18} />
                <span className="text-xs font-bold uppercase tracking-tight">Display</span>
              </button>
            </div>
          </nav>

          {activeTicket && (
            <div 
              onClick={() => setViewMode('MY_PASS')}
              className={`hidden md:flex items-center gap-3 bg-slate-900 text-white pl-4 pr-1.5 py-1.5 rounded-full cursor-pointer hover:bg-slate-800 transition-colors ${activeTicket.status === TicketStatus.CALLING ? 'ring-4 ring-emerald-500/20' : ''}`}
            >
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase text-indigo-400 leading-none">Position</span>
                <span className="text-sm font-black leading-none">{myPosition === 'NOW' ? 'SERVING' : `#${myPosition}`}</span>
              </div>
              <div className={`p-2 rounded-full ${activeTicket.status === TicketStatus.CALLING ? 'bg-emerald-500 animate-bounce' : 'bg-indigo-600'}`}>
                {activeTicket.status === TicketStatus.CALLING ? <Bell size={16} /> : <ChevronRight size={16} />}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-[1600px] mx-auto">
          {viewMode === 'KIOSK' && (
            <KioskView queue={queue} onTakeTicket={createTicket} setMyId={setMyTicketId} />
          )}
          {viewMode === 'ADMIN' && (
            <AdminDashboard 
              key={`${queue.users.length}-${queue.counters.length}`}
              queue={queue} 
              onUpdateStatus={updateTicketStatus} 
              onToggleCounter={toggleCounter}
              onAddCounter={addCounter}
              onReset={resetQueue}
              currentUser={currentUser}
              onLogin={setCurrentUser}
              onLogout={() => setCurrentUser(null)}
              onRegisterStaff={registerStaff}
              onDeleteStaff={deleteStaff}
              onUpdateVoice={updateStaffVoice}
            />
          )}
          {viewMode === 'CUSTOMER' && (
            <CustomerView tickets={queue.tickets} counters={queue.counters} />
          )}
          {viewMode === 'MY_PASS' && (
            <DigitalPassView 
              myTicketId={myTicketId} 
              tickets={queue.tickets} 
              counters={queue.counters}
              onJoin={handleJoinQueue}
              onClear={() => setMyTicketId(null)}
            />
          )}
        </div>
      </main>

      <footer className="bg-slate-900 text-white/50 p-6 text-center border-t border-white/5">
        <p className="text-xs md:text-sm font-medium">
          &copy; 2025 Q-Master Systems • Automated Efficiency
        </p>
      </footer>
    </div>
  );
};

export default App;
