
import React, { useMemo } from 'react';
import { Ticket, Counter, TicketStatus } from '../types';
import { User, Layers, ArrowRight, CheckCircle, Clock, Users } from 'lucide-react';

interface CustomerViewProps {
  tickets: Ticket[];
  counters: Counter[];
}

const CustomerView: React.FC<CustomerViewProps> = ({ tickets, counters }) => {
  const callingTickets = useMemo(() => 
    tickets.filter(t => t.status === TicketStatus.CALLING).sort((a, b) => (b.calledAt || 0) - (a.calledAt || 0)),
    [tickets]
  );

  const recentlyServed = useMemo(() => 
    tickets.filter(t => t.status === TicketStatus.SERVED).sort((a, b) => (b.servedAt || 0) - (a.servedAt || 0)).slice(0, 8),
    [tickets]
  );

  const waitingCount = useMemo(() => 
    tickets.filter(t => t.status === TicketStatus.WAITING).length,
    [tickets]
  );

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Top Info Bar - Great for all devices */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Current Time</p>
            <p className="text-xl font-black text-slate-800">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600">
            <Users size={24} />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">In Queue</p>
            <p className="text-xl font-black text-slate-800">{waitingCount} People Waiting</p>
          </div>
        </div>
        <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg flex items-center gap-4 text-white">
          <div className="bg-white/20 p-3 rounded-xl">
            <Layers size={24} />
          </div>
          <div>
            <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-wider">System Status</p>
            <p className="text-xl font-black">Active & Serving</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Board - Now Calling Section */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden flex flex-col h-full min-h-[500px]">
            <div className="bg-slate-900 px-8 py-6 flex justify-between items-center text-white">
              <h2 className="text-xl md:text-2xl font-black flex items-center gap-3">
                <div className="w-3 h-3 bg-indigo-500 rounded-full animate-ping" />
                NOW SERVING
              </h2>
              <span className="text-slate-400 text-xs font-bold tracking-widest hidden sm:inline">PLEASE PROCEED TO COUNTER</span>
            </div>

            <div className="flex-1 p-6 md:p-8">
              {callingTickets.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-20">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                    <User size={48} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-400">All counters are currently clear</h3>
                  <p className="text-slate-400 max-w-xs">Please hold your ticket. Your number will appear here when a counter is available.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {callingTickets.map((ticket, idx) => {
                    const counter = counters.find(c => c.id === ticket.counterId);
                    const isNewest = idx === 0;
                    return (
                      <div 
                        key={ticket.id} 
                        className={`relative group bg-slate-50 rounded-[2rem] p-8 border-2 transition-all duration-500 ${isNewest ? 'border-indigo-500 bg-indigo-50/30 scale-[1.02] shadow-indigo-100' : 'border-slate-100 shadow-sm'} animate-slideUp`}
                        style={{ animationDelay: `${idx * 100}ms` }}
                      >
                        {isNewest && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-black px-4 py-1 rounded-full shadow-lg z-10">
                            NEW CALL
                          </div>
                        )}
                        <div className="flex flex-col items-center text-center space-y-4">
                          <div>
                            <p className="text-indigo-500 font-black text-xs uppercase tracking-[0.2em] mb-1">TICKET</p>
                            <span className="text-8xl md:text-9xl font-black text-slate-900 leading-none">
                              {ticket.number}
                            </span>
                          </div>
                          
                          <div className="w-full h-px bg-slate-200 my-2" />
                          
                          <div className="flex flex-col items-center">
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">PROCEED TO</p>
                            <div className="flex items-center gap-3">
                              <span className="text-3xl md:text-4xl font-black text-indigo-700">{counter?.name || 'Counter'}</span>
                              <ArrowRight className="text-indigo-600 animate-pulse" size={28} />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Recently Served & History */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-indigo-400 tracking-tight">HISTORY</h3>
              <CheckCircle className="text-slate-700" size={20} />
            </div>

            <div className="space-y-3 flex-1 overflow-auto pr-2 custom-scrollbar">
              {recentlyServed.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-600">
                  <Clock size={40} className="mb-4 opacity-20" />
                  <p className="text-sm font-medium italic">No history yet today</p>
                </div>
              ) : (
                recentlyServed.map((ticket, idx) => (
                  <div 
                    key={ticket.id} 
                    className="flex items-center justify-between bg-white/5 p-5 rounded-2xl border border-white/5 transition-all hover:bg-white/10"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                        <span className="text-emerald-500 font-black text-lg">#{ticket.number}</span>
                      </div>
                      <div>
                        <p className="text-white font-bold text-lg leading-none mb-1">Served</p>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                          {counters.find(c => c.id === ticket.counterId)?.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-slate-500 text-[10px] font-bold mb-1">FINISHED</p>
                       <p className="text-slate-300 text-xs font-mono">
                         {new Date(ticket.servedAt || 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 bg-slate-900/50 backdrop-blur-sm">
              <div className="flex items-center justify-between px-2">
                <div>
                  <p className="text-indigo-400 font-black text-[10px] uppercase tracking-widest mb-1">DAILY TOTAL</p>
                  <p className="text-4xl font-black">{tickets.filter(t => t.status === TicketStatus.SERVED).length}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mb-1">EFFICIENCY</p>
                  <p className="text-2xl font-black text-emerald-500">98%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}} />
    </div>
  );
};

export default CustomerView;
