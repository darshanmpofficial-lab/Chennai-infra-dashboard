import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("urbanfix.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    description TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    image_url TEXT,
    status TEXT DEFAULT 'Pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    priority TEXT,
    priority_reason TEXT,
    reporter_email TEXT
  )
`);

// Schema Migration: Add missing columns if they don't exist
const tableInfo = db.prepare("PRAGMA table_info(issues)").all() as any[];
const columnNames = tableInfo.map(c => c.name);

if (!columnNames.includes('priority_reason')) {
  db.exec("ALTER TABLE issues ADD COLUMN priority_reason TEXT");
}
if (!columnNames.includes('reporter_email')) {
  db.exec("ALTER TABLE issues ADD COLUMN reporter_email TEXT");
}

// Helper to calculate priority
function calculatePriority(type: string, createdAt: string, lat: number, lng: number): { priority: string, reason: string | null } {
  const highPriorityTypes = ["Water Leak", "Broken Streetlight", "Gas Leak"];
  const mediumPriorityTypes = ["Pothole", "Traffic Signal Failure"];
  
  // Chennai Context: Smart Geofencing
  const landmarks = [
    { name: "Rajiv Gandhi Govt Hospital", lat: 13.0827, lng: 80.2707, type: 'Medical' },
    { name: "Apollo Hospital (Greams Road)", lat: 13.0606, lng: 80.2512, type: 'Medical' },
    { name: "Chennai Central Metro", lat: 13.0818, lng: 80.2718, type: 'Transit' },
    { name: "IIT Madras / Anna University", lat: 12.9915, lng: 80.2337, type: 'Education' },
    { name: "CMBT Bus Terminus", lat: 13.0674, lng: 80.2057, type: 'Transit' }
  ];

  let smartPriority = null;
  let smartReason = null;

  for (const landmark of landmarks) {
    const dist = Math.sqrt(Math.pow(landmark.lat - lat, 2) + Math.pow(landmark.lng - lng, 2));
    if (dist < 0.005) { // Roughly 500m
      if (landmark.type === 'Medical') {
        smartPriority = "Critical";
        smartReason = `Near Medical Facility (${landmark.name})`;
      } else if (landmark.type === 'Education') {
        smartPriority = "High";
        smartReason = `Near Educational Institution (${landmark.name})`;
      } else if (landmark.type === 'Transit') {
        smartPriority = "High";
        smartReason = `Near Transit Hub (${landmark.name})`;
      }
      break;
    }
  }

  if (smartPriority) return { priority: smartPriority, reason: smartReason };

  let priority = "Low";
  if (highPriorityTypes.includes(type)) priority = "High";
  else if (mediumPriorityTypes.includes(type)) priority = "Medium";

  // Time-based escalation
  const createdDate = new Date(createdAt);
  const now = new Date();
  const diffHours = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
  
  if (diffHours > 24) {
    if (priority === "Low") priority = "Medium";
    else if (priority === "Medium") priority = "High";
  }

  return { priority, reason: null };
}

// Seed dummy data if empty
const count = db.prepare("SELECT count(*) as count FROM issues").get() as { count: number };
if (count.count === 0) {
  const dummyIssues = [
    { type: "Broken Streetlight", description: "Light flickering on North Usman Road, T. Nagar.", lat: 13.0418, lng: 80.2341, status: "Pending", email: "citizen@example.com" },
    { type: "Pothole", description: "Large pothole near Adyar Depot.", lat: 13.0067, lng: 80.2578, status: "Pending", email: "citizen@example.com" },
    { type: "Water Leak", description: "Water pipe burst near Velachery Phoenix Mall.", lat: 12.9791, lng: 80.2185, status: "In Progress", email: "user2@example.com" },
    { type: "Graffiti", description: "Graffiti on Kapaleeshwarar Temple wall area.", lat: 13.0330, lng: 80.2677, status: "Pending", email: "user2@example.com" },
    { type: "Broken Streetlight", description: "Dark stretch near Anna Nagar Tower Park.", lat: 13.0850, lng: 80.2101, status: "Pending", email: "citizen@example.com" },
    { type: "Pothole", description: "Deep pothole on OMR near Tidel Park.", lat: 12.9894, lng: 80.2447, status: "Resolved", email: "citizen@example.com" },
    { type: "Water Leak", description: "Small leak in Besant Nagar 2nd Main Road.", lat: 13.0003, lng: 80.2667, status: "Pending", email: "user2@example.com" },
    { type: "Other", description: "Abandoned vehicle near Marina Beach.", lat: 13.0500, lng: 80.2824, status: "Pending", email: "citizen@example.com" },
    { type: "Traffic Signal Failure", description: "Signal not working at Guindy intersection.", lat: 13.0067, lng: 80.2206, status: "Pending", email: "citizen@example.com" },
    { type: "Pothole", description: "Multiple potholes on Mount Road near Thousand Lights.", lat: 13.0612, lng: 80.2530, status: "Pending", email: "user2@example.com" },
  ];

  const insert = db.prepare("INSERT INTO issues (type, description, latitude, longitude, status, priority, priority_reason, created_at, reporter_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
  dummyIssues.forEach(issue => {
    const daysAgo = Math.floor(Math.random() * 3);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const dateStr = date.toISOString();
    const { priority, reason } = calculatePriority(issue.type, dateStr, issue.lat, issue.lng);
    insert.run(issue.type, issue.description, issue.lat, issue.lng, issue.status, priority, reason, dateStr, issue.email);
  });
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  app.use(express.json());

  // WebSocket broadcast
  function broadcast(data: any) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }

  // API Routes
  app.post("/api/login", (req, res) => {
    const { email, password, role } = req.body;
    
    // Mock Auth
    if (role === 'authority') {
      if (email === 'admin@chennai.gov' && password === 'password123') {
        return res.json({ email, role: 'authority', name: 'Chennai Admin' });
      }
    } else {
      // Any citizen can login for demo
      return res.json({ email, role: 'citizen', name: email.split('@')[0] });
    }
    
    res.status(401).json({ error: "Invalid credentials" });
  });

  app.get("/api/issues", (req, res) => {
    const email = req.query.email as string;
    let issues;
    if (email) {
      issues = db.prepare("SELECT * FROM issues WHERE reporter_email = ? ORDER BY created_at DESC").all(email);
    } else {
      issues = db.prepare("SELECT * FROM issues ORDER BY created_at DESC").all();
    }
    res.json(issues);
  });

  app.post("/api/issues", (req, res) => {
    const { type, description, latitude, longitude, image_url, reporter_email, priority: forcedPriority, priority_reason: forcedReason } = req.body;
    const createdAt = new Date().toISOString();
    const { priority: calculatedPriority, reason: calculatedReason } = calculatePriority(type, createdAt, latitude, longitude);
    
    const priority = forcedPriority || calculatedPriority;
    const reason = forcedReason || calculatedReason;
    
    const info = db.prepare(
      "INSERT INTO issues (type, description, latitude, longitude, image_url, priority, priority_reason, created_at, reporter_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(type, description, latitude, longitude, image_url, priority, reason, createdAt, reporter_email);
    
    const newIssue = {
      id: info.lastInsertRowid,
      type,
      description,
      latitude,
      longitude,
      image_url,
      status: 'Pending',
      priority,
      priority_reason: reason,
      created_at: createdAt,
      reporter_email
    };

    broadcast({ type: 'NEW_ISSUE', payload: newIssue });
    res.status(201).json(newIssue);
  });

  app.patch("/api/issues/:id/status", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    db.prepare("UPDATE issues SET status = ? WHERE id = ?").run(status, id);
    const updated = db.prepare("SELECT * FROM issues WHERE id = ?").get();
    
    broadcast({ type: 'UPDATE_ISSUE', payload: updated });
    res.json(updated);
  });

  app.get("/api/stats", (req, res) => {
    const total = db.prepare("SELECT count(*) as count FROM issues").get() as { count: number };
    const pending = db.prepare("SELECT count(*) as count FROM issues WHERE status = 'Pending'").get() as { count: number };
    const resolved = db.prepare("SELECT count(*) as count FROM issues WHERE status = 'Resolved'").get() as { count: number };
    
    // Average resolution time (mocked for now or calculated if we had resolved_at)
    res.json({
      total: total.count,
      pending: pending.count,
      resolved: resolved.count,
      avgResolutionTime: "4.2 hours"
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
