import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Camera, Send, CheckCircle2, Loader2, Navigation, Clock, List as ListIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { User, Issue } from '../types';
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

const ISSUE_TYPES = [
  "Broken Streetlight",
  "Pothole",
  "Water Leak",
  "Graffiti",
  "Traffic Signal Failure",
  "Gas Leak",
  "Other"
];

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 15);
  }, [center, map]);
  return null;
}

interface CitizenPortalProps {
  user: User;
}

export default function CitizenPortal({ user }: CitizenPortalProps) {
  const [type, setType] = useState(ISSUE_TYPES[0]);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([13.0827, 80.2707]);
  const [myIssues, setMyIssues] = useState<Issue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(true);

  const fetchMyIssues = async () => {
    try {
      const response = await fetch(`/api/issues?email=${user.email}`);
      const data = await response.json();
      setMyIssues(data);
    } catch (err) {
      console.error("Error fetching my issues:", err);
    } finally {
      setLoadingIssues(false);
    }
  };

  const requestLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setLocation(newLoc);
          setMapCenter([newLoc.lat, newLoc.lng]);
        },
        (err) => {
          console.error("Error getting location:", err);
          setError("Could not get your location. Please enable GPS.");
        },
        { enableHighAccuracy: true }
      );
    }
  };

  useEffect(() => {
    requestLocation();
    fetchMyIssues();
  }, [user.email]);

  const compressImage = (base64Str: string, maxWidth = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress to 70% quality
      };
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("Image too large (>2MB). Please compress or choose a smaller file.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const compressed = await compressImage(base64);
        setImage(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location) {
      setError("Location is required. Please wait for GPS or enable it.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          description,
          latitude: location.lat,
          longitude: location.lng,
          image_url: image,
          reporter_email: user.email
        }),
      });

      if (!response.ok) throw new Error("Failed to submit");
      
      const data = await response.json();
      setSubmittedId(data.id);
      fetchMyIssues();
      
      // Reset form
      setType(ISSUE_TYPES[0]);
      setDescription('');
      setImage(null);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedId) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto mt-12 p-8 bg-white rounded-3xl shadow-xl text-center border border-emerald-100"
      >
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Submission Successful!</h2>
        <p className="text-slate-600 mb-6">Thank you for helping us maintain our city infrastructure.</p>
        <div className="bg-slate-50 p-4 rounded-xl mb-8 border border-slate-100">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Tracking ID</span>
          <p className="text-2xl font-mono font-bold text-slate-800">#UF-{submittedId.toString().padStart(5, '0')}</p>
        </div>
        <button 
          onClick={() => setSubmittedId(null)}
          className="w-full py-4 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors"
        >
          Report Another Issue
        </button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Welcome, {user.name}</h1>
        <p className="text-slate-500">Help us identify and fix infrastructure problems in Chennai.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Send className="w-5 h-5 text-slate-400" />
              Report New Issue
            </h2>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Issue Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ISSUE_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`px-3 py-2 text-xs rounded-xl border transition-all ${
                      type === t 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Description</label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell us more about the problem..."
                className="w-full h-24 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Photo (Optional)</label>
                <label className={`flex items-center justify-center gap-3 p-4 rounded-xl border border-dashed cursor-pointer transition-all ${image ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-slate-50 border-slate-300'}`}>
                  <Camera className={`w-5 h-5 ${image ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span className={`text-sm font-medium ${image ? 'text-indigo-900' : 'text-slate-500'}`}>
                    {image ? 'Photo Attached' : 'Take or Upload Photo'}
                  </span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Location Confirmation</label>
                <div className="h-[100px] rounded-xl overflow-hidden border border-slate-100 relative">
                  <MapContainer center={mapCenter} zoom={15} className="h-full w-full" zoomControl={false} dragging={false}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {location && <Marker position={[location.lat, location.lng]} />}
                    <RecenterMap center={mapCenter} />
                  </MapContainer>
                  {!location && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-sm font-medium text-red-600 bg-red-50 p-3 rounded-lg">
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !location}
              className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                isSubmitting || !location ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg hover:shadow-xl active:scale-[0.98]'
              }`}
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" />Submit Report</>}
            </button>
          </form>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6">
              <ListIcon className="w-5 h-5 text-slate-400" />
              My Reported Issues
            </h2>
            
            <div className="space-y-4">
              {loadingIssues ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
              ) : myIssues.length === 0 ? (
                <p className="text-center py-8 text-slate-400 italic">You haven't reported any issues yet.</p>
              ) : (
                myIssues.map(issue => (
                  <div key={issue.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        issue.priority === 'Critical' ? 'bg-red-100 text-red-600' :
                        issue.priority === 'High' ? 'bg-orange-100 text-orange-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{issue.type}</h4>
                        <p className="text-xs text-slate-500">{formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      issue.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' :
                      issue.status === 'In Progress' ? 'bg-indigo-100 text-indigo-700' :
                      'bg-slate-200 text-slate-600'
                    }`}>
                      {issue.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl">
            <h3 className="text-lg font-bold mb-4">Chennai Smart City</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Your reports help the Greater Chennai Corporation prioritize infrastructure repairs near hospitals, schools, and critical hubs.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs font-bold text-slate-300">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                Critical: Near Hospitals/Schools
              </div>
              <div className="flex items-center gap-3 text-xs font-bold text-slate-300">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                High: Infrastructure Failure
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4">Quick Links</h3>
            <div className="space-y-2">
              <button className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-600 transition-all">Emergency Contacts</button>
              <button className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-600 transition-all">GCC Official Website</button>
              <button className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-600 transition-all">Smart City Portal</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


