
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Layout, Users, ShieldCheck, Monitor } from 'lucide-react';
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

  const hasActiveTicket = useMemo(() => {
    if (!myTicketId) return false;
    const ticket = queue.tickets.find(t => t.id === myTicketId);
    return !!ticket && ticket.status !== TicketStatus.SERVED && ticket.status !== TicketStatus.CANCELLED;
  }, [myTicketId, queue.tickets]);

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
    localStorage.removeItem('q_system_state');
    localStorage.removeItem('my_ticket_id');
    localStorage.setItem('q_system_state', JSON.stringify(factoryState));
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-indigo-100">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2 flex-shrink-0 cursor-pointer" onClick={() => setViewMode('KIOSK')}>
          <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-100">
            <Layout size={24} />
          </div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight hidden sm:block">Q-Master <span className="text-indigo-600">Pro</span></h1>
        </div>
        
        <nav className="flex bg-slate-100 p-1 rounded-2xl overflow-x-auto no-scrollbar max-w-[70%] sm:max-w-none">
          <button 
            onClick={() => setViewMode('KIOSK')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${viewMode === 'KIOSK' ? 'bg-white shadow-md text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Monitor size={18} />
            <span className="text-xs md:text-sm">Kiosk</span>
          </button>
          <button 
            onClick={() => setViewMode('ADMIN')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${viewMode === 'ADMIN' ? 'bg-white shadow-md text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <ShieldCheck size={18} />
            <span className="text-xs md:text-sm">Admin</span>
          </button>
          <button 
            onClick={() => setViewMode('CUSTOMER')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${viewMode === 'CUSTOMER' ? 'bg-white shadow-md text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Users size={18} />
            <span className="text-xs md:text-sm">Display</span>
          </button>
        </nav>

        {hasActiveTicket && viewMode !== 'MY_PASS' && (
           <button 
             onClick={() => setViewMode('MY_PASS')}
             className="hidden sm:flex items-center gap-2 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full border border-indigo-100 text-xs font-black animate-pulse"
           >
             <div className="w-2 h-2 bg-indigo-600 rounded-full" />
             ACTIVE TICKET
           </button>
        )}
      </header>

      <main className="flex-1 overflow-auto bg-slate-50 p-4 md:p-8">
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
