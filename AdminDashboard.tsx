import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LayoutDashboard, Map as MapIcon, List, AlertCircle, Clock, CheckCircle, Activity, Zap, Volume2, Wifi, Cpu } from 'lucide-react';
import { Issue, Stats, User } from '../types';
import IssueMap from './IssueMap';
import IssueTable from './IssueTable';
import StatsCards from './StatsCards';

const NOTIFICATION_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

interface AdminDashboardProps {
  user: User;
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [view, setView] = useState<'map' | 'list'>('map');
  const [loading, setLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isSerialConnected, setIsSerialConnected] = useState(false);
  const [syncLatency, setSyncLatency] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [issuesRes, statsRes] = await Promise.all([
        fetch('/api/issues'),
        fetch('/api/stats')
      ]);
      const issuesData = await issuesRes.json();
      const statsData = await statsRes.json();
      setIssues(issuesData);
      setStats(statsData);
    } catch (err) {
      console.error("Error fetching admin data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // WebSocket setup
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'NEW_ISSUE') {
        const now = Date.now();
        const created = new Date(data.payload.created_at).getTime();
        setSyncLatency(now - created);
        
        setIssues(prev => [data.payload, ...prev]);
        if (audioRef.current) {
          audioRef.current.play().catch(e => console.log("Audio play blocked", e));
        }
        fetch('/api/stats').then(res => res.json()).then(setStats);
      } else if (data.type === 'UPDATE_ISSUE') {
        setIssues(prev => prev.map(i => i.id === data.payload.id ? data.payload : i));
        fetch('/api/stats').then(res => res.json()).then(setStats);
      }
    };

    return () => ws.close();
  }, [fetchData]);

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      await fetch(`/api/issues/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      console.error("Status update failed", err);
    }
  };

  const triggerSmartReport = async (type: string, description: string) => {
    const chennaiBounds = {
      lat: [12.95, 13.15],
      lng: [80.15, 80.30]
    };
    const randomLat = Math.random() * (chennaiBounds.lat[1] - chennaiBounds.lat[0]) + chennaiBounds.lat[0];
    const randomLng = Math.random() * (chennaiBounds.lng[1] - chennaiBounds.lng[0]) + chennaiBounds.lng[0];

    try {
      await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          description,
          latitude: randomLat,
          longitude: randomLng,
          reporter_email: 'arduino-sensor@chennai.gov',
          priority: 'Critical',
          priority_reason: 'Arduino Smart Sensor Alert'
        }),
      });
      alert(`SMART ALERT: ${type} detected via Arduino!`);
    } catch (err) {
      console.error("Smart report failed", err);
    }
  };

  const connectSerial = async () => {
    if (!("serial" in navigator)) {
      alert("Web Serial API not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 9600 });
      setIsSerialConnected(true);

      const decoder = new TextDecoderStream();
      port.readable.pipeTo(decoder.writable);
      const inputStream = decoder.readable;
      const reader = inputStream.getReader();

      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          reader.releaseLock();
          break;
        }
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed === 'GARBAGE_FULL') {
            triggerSmartReport("Other", "SMART SENSOR: Garbage bin is full.");
          } else if (trimmed === 'PIPE_LEAK') {
            triggerSmartReport("Water Leak", "SMART SENSOR: Pipe leak detected.");
          } else if (trimmed === 'LIGHT_FAIL') {
            triggerSmartReport("Broken Streetlight", "SMART SENSOR: Streetlight failure detected.");
          }
        }
      }
    } catch (err) {
      console.error("Serial connection failed:", err);
      setIsSerialConnected(false);
    }
  };

  const simulateReport = async () => {
    setIsSimulating(true);
    const chennaiBounds = {
      lat: [12.95, 13.15],
      lng: [80.15, 80.30]
    };
    const randomLat = Math.random() * (chennaiBounds.lat[1] - chennaiBounds.lat[0]) + chennaiBounds.lat[0];
    const randomLng = Math.random() * (chennaiBounds.lng[1] - chennaiBounds.lng[0]) + chennaiBounds.lng[0];
    
    const types = ["Gas Leak", "Water Leak", "Broken Streetlight", "Traffic Signal Failure"];
    const randomType = types[Math.floor(Math.random() * types.length)];

    try {
      await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: randomType,
          description: `SIMULATED: Urgent ${randomType} reported via system simulation.`,
          latitude: randomLat,
          longitude: randomLng,
          reporter_email: 'system@chennai.gov'
        }),
      });
    } catch (err) {
      console.error("Simulation failed", err);
    } finally {
      setTimeout(() => setIsSimulating(false), 500);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-8">
      <audio ref={audioRef} src={NOTIFICATION_SOUND} preload="auto" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-slate-900">Infrastructure Monitoring</h1>
            {syncLatency !== null && (
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                syncLatency < 500 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                syncLatency < 2000 ? 'bg-amber-50 text-amber-600 border-amber-100' :
                'bg-red-50 text-red-600 border-red-100'
              }`}>
                <Wifi className="w-3 h-3" />
                Live Sync: {syncLatency}ms
              </div>
            )}
          </div>
          <p className="text-slate-500">Real-time oversight of city-wide maintenance requests in Chennai.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={connectSerial}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm border ${
              isSerialConnected 
                ? 'bg-emerald-600 text-white border-emerald-700' 
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Cpu className={`w-4 h-4 ${isSerialConnected ? 'animate-pulse' : ''}`} />
            {isSerialConnected ? 'Arduino Connected' : 'Connect to Arduino'}
          </button>

          <button
            onClick={simulateReport}
            disabled={isSimulating}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm border ${
              isSimulating 
                ? 'bg-slate-100 text-slate-400 border-slate-200' 
                : 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 hover:shadow-md active:scale-95'
            }`}
          >
            <Zap className={`w-4 h-4 ${isSimulating ? '' : 'fill-current'}`} />
            {isSimulating ? 'Simulating...' : 'Simulate Report'}
          </button>

          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <button
              onClick={() => setView('map')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                view === 'map' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <MapIcon className="w-4 h-4" />
              Map View
            </button>
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                view === 'list' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <List className="w-4 h-4" />
              Data Feed
            </button>
          </div>
        </div>
      </div>

      <StatsCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden min-h-[600px]">
          {view === 'map' ? (
            <IssueMap issues={issues} onStatusUpdate={handleStatusUpdate} />
          ) : (
            <IssueTable issues={issues} onStatusUpdate={handleStatusUpdate} />
          )}
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Live Feed</h2>
            <div className="flex items-center gap-2 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse" />
              Live
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {issues.slice(0, 15).map((issue) => (
              <div key={issue.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all group">
                <div className="flex flex-col gap-1 mb-2">
                  <div className="flex items-start justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      issue.priority === 'Critical' ? 'bg-red-600 text-white' :
                      issue.priority === 'High' ? 'bg-red-100 text-red-700' :
                      issue.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {issue.priority} Priority
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(issue.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {issue.priority_reason && (
                    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100 self-start">
                      Priority: {issue.priority_reason}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-slate-800 group-hover:text-slate-900 transition-colors">{issue.type}</h3>
                <p className="text-sm text-slate-500 line-clamp-2 mt-1">{issue.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


