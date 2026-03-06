import React, { useState } from 'react';
import { Issue } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, Clock, MapPin, CheckCircle2, Activity, Image as ImageIcon, X, ImageOff } from 'lucide-react';

interface IssueTableProps {
  issues: Issue[];
  onStatusUpdate?: (id: number, status: string) => void;
}

export default function IssueTable({ issues, onStatusUpdate }: IssueTableProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto relative">
      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-50 border-b border-slate-100">
          <tr>
            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Issue & Description</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Smart Priority</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {issues.map((issue) => (
            <tr key={issue.id} className="hover:bg-slate-50/50 transition-colors group">
              <td className="px-6 py-5">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    issue.priority === 'Critical' ? 'bg-red-600 text-white' :
                    issue.priority === 'High' ? 'bg-red-50 text-red-600' :
                    issue.priority === 'Medium' ? 'bg-amber-50 text-amber-600' :
                    'bg-blue-50 text-blue-600'
                  }`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">{issue.type}</h4>
                    <p className="text-sm text-slate-500 line-clamp-1">{issue.description}</p>
                    {issue.priority_reason && (
                      <p className="text-[10px] font-bold text-red-600 mt-1 uppercase tracking-tight">
                        Reason: {issue.priority_reason}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                        <MapPin className="w-3 h-3" />
                        {issue.latitude.toFixed(4)}, {issue.longitude.toFixed(4)}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-5 text-center">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  issue.priority === 'Critical' ? 'bg-red-600 text-white' :
                  issue.priority === 'High' ? 'bg-red-100 text-red-700' :
                  issue.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    issue.priority === 'Critical' ? 'bg-white' :
                    issue.priority === 'High' ? 'bg-red-600' :
                    issue.priority === 'Medium' ? 'bg-amber-600' :
                    'bg-blue-600'
                  }`} />
                  {issue.priority}
                </span>
              </td>
              <td className="px-6 py-5 text-center">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  issue.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' :
                  issue.status === 'In Progress' ? 'bg-indigo-100 text-indigo-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {issue.status === 'Resolved' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {issue.status}
                </span>
              </td>
              <td className="px-6 py-5 text-right">
                <div className="flex items-center justify-end gap-2">
                  {issue.image_url ? (
                    <button 
                      onClick={() => setSelectedImage(issue.image_url!)}
                      className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all shadow-sm"
                      title="View Evidence Image"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                  ) : (
                    <div 
                      className="p-2 bg-slate-50 text-slate-300 rounded-lg border border-slate-100 cursor-not-allowed" 
                      title="No Evidence Image Provided"
                    >
                      <ImageOff className="w-4 h-4 opacity-50" />
                    </div>
                  )}
                  
                  {onStatusUpdate && (
                    <>
                      <button 
                        onClick={() => onStatusUpdate(issue.id, 'In Progress')}
                        className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all"
                        title="Mark as In Progress"
                      >
                        <Activity className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onStatusUpdate(issue.id, 'Resolved')}
                        className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all"
                        title="Mark as Resolved"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden">
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 p-2 bg-white/80 hover:bg-white rounded-full text-slate-900 shadow-md transition-all z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-2">
              <img 
                src={selectedImage} 
                alt="Issue Evidence" 
                className="w-full h-auto max-h-[80vh] object-contain rounded-2xl"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <p className="text-sm font-bold text-slate-900">Issue Evidence Photo</p>
              <button 
                onClick={() => setSelectedImage(null)}
                className="px-6 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {issues.length === 0 && (
        <div className="p-12 text-center">
          <p className="text-slate-400 font-medium italic">No issues reported yet.</p>
        </div>
      )}
    </div>
  );
}


