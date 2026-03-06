import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Issue } from '../types';
import { formatDistanceToNow } from 'date-fns';

// Fix for default marker icons in Leaflet with React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface IssueMapProps {
  issues: Issue[];
  onStatusUpdate?: (id: number, status: string) => void;
}

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center);
  return null;
}

export default function IssueMap({ issues, onStatusUpdate }: IssueMapProps) {
  const defaultCenter: [number, number] = [13.0827, 80.2707]; // Chennai, India

  return (
    <div className="h-full w-full relative">
      <MapContainer 
        center={defaultCenter} 
        zoom={13} 
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {issues.map((issue) => (
          <Marker 
            key={issue.id} 
            position={[issue.latitude, issue.longitude]}
          >
            <Popup className="custom-popup">
              <div className="p-1 min-w-[200px]">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    issue.priority === 'Critical' ? 'bg-red-600 text-white' :
                    issue.priority === 'High' ? 'bg-red-100 text-red-700' :
                    issue.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {issue.priority}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm mb-1">{issue.type}</h3>
                <p className="text-xs text-slate-600 mb-2 leading-relaxed">{issue.description}</p>
                
                {issue.priority_reason && (
                  <div className="mb-3 p-2 bg-red-50 border border-red-100 rounded-lg">
                    <p className="text-[10px] font-bold text-red-600 uppercase leading-tight">
                      Smart Priority Reason:
                    </p>
                    <p className="text-[10px] text-red-700 font-medium">
                      {issue.priority_reason}
                    </p>
                  </div>
                )}
                
                {issue.image_url && (
                  <div className="mb-3 rounded-lg overflow-hidden border border-slate-100">
                    <img 
                      src={issue.image_url} 
                      alt="Issue" 
                      className="w-full h-24 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 mb-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Status</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    issue.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' :
                    issue.status === 'In Progress' ? 'bg-indigo-100 text-indigo-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {issue.status}
                  </span>
                </div>

                {onStatusUpdate && (
                  <div className="flex gap-1">
                    <button 
                      onClick={() => onStatusUpdate(issue.id, 'In Progress')}
                      className="flex-1 py-1.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-lg hover:bg-indigo-100 transition-all"
                    >
                      Start
                    </button>
                    <button 
                      onClick={() => onStatusUpdate(issue.id, 'Resolved')}
                      className="flex-1 py-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg hover:bg-emerald-100 transition-all"
                    >
                      Resolve
                    </button>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      <div className="absolute bottom-6 left-6 z-[1000] bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-lg border border-white/20">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Map Legend</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]" />
            <span className="text-xs font-semibold text-slate-700">Critical Priority</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
            <span className="text-xs font-semibold text-slate-700">High Priority</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            <span className="text-xs font-semibold text-slate-700">Medium Priority</span>
          </div>
        </div>
      </div>
    </div>
  );
}
