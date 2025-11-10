// forum chat backend
const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

// --- Database Setup ---
const db = new sqlite3.Database("./messages.db", (err) => {
  if (err) console.error("❌ Database connection error:", err);
  else console.log("✅ Connected to SQLite database");
});

db.run(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT,
    msg TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// --- Express Setup ---
app.use(express.static(path.join(__dirname)));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "forum.html"));
});

// --- Chat Logic ---
let onlineUsers = {};

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // Send previous messages
  db.all("SELECT nickname, msg FROM messages ORDER BY id ASC", [], (err, rows) => {
    if (!err) socket.emit("load_messages", rows);
  });

  socket.on("set_nickname", (nickname) => {
    socket.nickname = nickname;
    onlineUsers[socket.id] = nickname;
    io.emit("update_users", Object.values(onlineUsers));
    console.log(`👤 ${nickname} joined`);
  });

  socket.on("chat_message", (data) => {
    db.run("INSERT INTO messages (nickname, msg) VALUES (?, ?)", [data.nickname, data.msg]);
    io.emit("chat_message", data);
  });

  socket.on("typing", (nickname) => {
    socket.broadcast.emit("typing", nickname);
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
    delete onlineUsers[socket.id];
    io.emit("update_users", Object.values(onlineUsers));
  });
});

// --- Start Server ---
const PORT = 3000;
http.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
