import React, { useState, useMemo } from 'react';
import { UserProfile, ActivityLog } from '../types';
import {
  ChevronLeft, UserMinus,
  Activity, Zap, Database, Cpu,
} from 'lucide-react';
import { format } from 'date-fns';
import SpiderLily from './SpiderLily';

interface AdminDashboardProps {
  users: UserProfile[];
  onKick: (id: string) => void;
  onViewProfile?: (id: string) => void;
  onBack?: () => void;
}

const MOCK_LOGS: ActivityLog[] = [
  { id: '1', timestamp: new Date(Date.now() - 1000 * 60 * 5), user: 'Sarah Chen', action: 'NEURAL_BURST', detail: 'Generated 4K AI Asset', status: 'success' },
  { id: '2', timestamp: new Date(Date.now() - 1000 * 60 * 15), user: 'Alex Rivera', action: 'LOGIN', detail: 'Authenticated via Node 7', status: 'success' },
  { id: '3', timestamp: new Date(Date.now() - 1000 * 60 * 45), user: 'Unknown', action: 'SYSTEM_OVERRIDE', detail: 'Invalid Key Attempt', status: 'critical' },
  { id: '4', timestamp: new Date(Date.now() - 1000 * 60 * 120), user: 'REI_SYSTEM', action: 'IDENTITY_CREATED', detail: 'New Hub Node Established', status: 'info' },
  { id: '5', timestamp: new Date(Date.now() - 1000 * 60 * 180), user: 'Design Squad', action: 'LINK_REQUEST', detail: 'Group sync initiated', status: 'warning' },
];

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  users,
  onKick,
  onViewProfile,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState<'active' | 'logs'>('active');
  const [logSearch, setLogSearch] = useState('');
  const [logSort, setLogSort] = useState<'newest' | 'oldest'>('newest');
  const [logFilter, setLogFilter] = useState<'all' | 'critical' | 'warning' | 'success' | 'info'>('all');

  const filteredLogs = useMemo(() => {
    let result = [...MOCK_LOGS];
    if (logSearch) {
      result = result.filter(log =>
        log.user.toLowerCase().includes(logSearch.toLowerCase()) ||
        log.detail.toLowerCase().includes(logSearch.toLowerCase()) ||
        log.action.toLowerCase().includes(logSearch.toLowerCase())
      );
    }
    if (logFilter !== 'all') {
      result = result.filter(log => log.status === logFilter);
    }
    result.sort((a, b) => {
      const timeA = a.timestamp.getTime();
      const timeB = b.timestamp.getTime();
      return logSort === 'newest' ? timeB - timeA : timeA - timeB;
    });
    return result;
  }, [logSearch, logSort, logFilter]);

  return (
    <div className="flex flex-col h-full bg-[#0a0101] overflow-hidden relative">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.03]">
        <SpiderLily size={800} className="text-red-600 -rotate-12" />
      </div>

      <div className="flex items-center justify-between px-6 py-4 border-b border-red-950 bg-[#0a0101]/95 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center">
          {onBack && (
            <button onClick={onBack} className="mr-4 p-1 text-red-500 hover:text-red-400 transition-colors">
              <ChevronLeft size={24} />
            </button>
          )}
          <div>
            <h2 className="font-black text-red-600 text-lg leading-tight uppercase tracking-tighter drop-shadow-[0_0_8px_rgba(220,38,38,0.3)]">Master Console</h2>
            <p className="text-[10px] text-red-700 uppercase tracking-[0.3em] font-black mt-0.5">Admin Level 0 • Neural Core v3.1</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10 no-scrollbar">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <VitalCard icon={<Cpu size={20}/>} label="Neural Load" value="24.8%" progress={24.8} color="red" />
            <VitalCard icon={<Zap size={20}/>} label="Sync Freq" value="144Hz" progress={85} color="red" />
            <VitalCard icon={<Database size={20}/>} label="Memory Map" value="1.2 TB" progress={40} color="red" />
             <VitalCard icon={<Activity size={20}/>} label="Active Nodes" value={users.length.toString()} progress={100} color="red" />
          </div>

          <div className="flex border-b border-red-950 gap-8">
            <TabButton active={activeTab === 'active'} onClick={() => setActiveTab('active')} label="Network Map" count={users.length} />
            <TabButton active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} label="Terminal Audit" />
          </div>

          <div className="space-y-6">
            {activeTab === 'active' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                {users.map((user) => (
                  <div key={user.id} className="group bg-[#130303]/80 border border-red-950 p-6 rounded-[2.5rem] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => onViewProfile?.(user.id)}
                      disabled={!onViewProfile}
                      className="flex items-center space-x-4 text-left disabled:cursor-default"
                    >
                      <img src={user.avatar || `https://picsum.photos/seed/${user.username}/200`} className="w-14 h-14 rounded-full object-cover border border-red-900/30" alt={user.username} />
                      <div>
                        <h4 className="text-red-50 font-black text-lg uppercase tracking-tight">{user.username}</h4>
                        <p className="text-red-700 text-xs font-medium">{user.email}</p>
                      </div>
                    </button>
                    <button onClick={() => onKick(user.id)} className="p-3 bg-red-950/40 text-red-600 rounded-2xl border border-red-900/30">
                      <UserMinus size={20} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="bg-[#130303]/60 border border-red-950 rounded-[2.5rem] overflow-hidden animate-in fade-in duration-300">
                <table className="w-full text-left">
                  <thead className="bg-red-950/20 text-[10px] font-black text-red-700 uppercase tracking-[0.2em] border-b border-red-950">
                    <tr>
                      <th className="px-6 py-4">Timestamp</th>
                      <th className="px-6 py-4">Subject</th>
                      <th className="px-6 py-4">Action</th>
                      <th className="px-6 py-4">Security</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-950/30">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-red-900/5 group transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-[11px] font-mono text-red-400">{format(log.timestamp, 'HH:mm:ss')}</td>
                        <td className="px-6 py-4 font-bold text-xs text-red-50">{log.user}</td>
                        <td className="px-6 py-4"><span className="px-2 py-1 bg-red-900/10 border border-red-900/20 rounded-md text-[9px] font-black text-red-500 uppercase">{log.action}</span></td>
                        <td className="px-6 py-4 text-[10px] font-black uppercase text-red-900">{log.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const VitalCard: React.FC<{ icon: React.ReactNode; label: string; value: string; progress: number; color: string }> = ({ icon, label, value, progress }) => (
  <div className="p-6 bg-[#130303]/80 border border-red-950 rounded-[2rem] relative overflow-hidden group">
    <div className="absolute top-0 left-0 h-1 bg-red-600" style={{ width: `${progress}%` }} />
    <div className="flex items-center justify-between mb-4">
      <div className="p-2.5 bg-red-950/40 text-red-500 rounded-xl group-hover:bg-red-600 group-hover:text-white transition-all">{icon}</div>
      <p className="text-2xl font-black text-red-50 tracking-tighter">{value}</p>
    </div>
    <p className="text-[10px] text-red-900 font-black uppercase tracking-widest">{label}</p>
  </div>
);

const TabButton: React.FC<{ active: boolean; onClick: () => void; label: string; count?: number }> = ({ active, onClick, label, count }) => (
  <button onClick={onClick} className={`pb-4 px-2 relative text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center space-x-2 ${active ? 'text-red-500' : 'text-red-900 hover:text-red-200'}`}>
    <span>{label}</span>
    {count !== undefined && <span className={`px-2 py-0.5 rounded-full text-[9px] ${active ? 'bg-red-600 text-white' : 'bg-red-950 text-red-800'}`}>{count}</span>}
    {active && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />}
  </button>
);

export default AdminDashboard;
