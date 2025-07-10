const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const app = express();

// Serve the frontend
app.use(express.static('public'));
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Player list
let players = {};

// Broadcast to all clients
function broadcast(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

wss.on('connection', ws => {
  const id = Math.random().toString(36).substr(2, 9);
  const playerName = `Player${Math.floor(Math.random() * 1000)}`;
  players[id] = { x: 200, y: 200, name: playerName };

  console.log(`🟢 Player connected: ${id} (${playerName})`);

  // Send initial state to new player
  ws.send(JSON.stringify({ id, players }));
  
  // Broadcast updated player list to all other clients
  broadcast({ players });

  ws.on('message', msg => {
    try {
      const data = JSON.parse(msg);

      if (data.type === 'move') {
        const p = players[id];
        if (!p) return;
        
        // Get canvas dimensions from client, with fallback to default
        const canvasWidth = data.canvasWidth || 800;
        const canvasHeight = data.canvasHeight || 600;
        
        // Keep players within canvas bounds (subtract 10 for player size)
        const newX = Math.max(0, Math.min(canvasWidth - 10, p.x + data.dx));
        const newY = Math.max(0, Math.min(canvasHeight - 10, p.y + data.dy));
        
        p.x = newX;
        p.y = newY;
        
        // Broadcast updated state to all clients
        broadcast({ players });
      }
    } catch (e) {
      console.error('Bad JSON:', e);
    }
  });

  ws.on('close', () => {
    console.log(`🔴 Player disconnected: ${id}`);
    delete players[id];
    // Broadcast updated state when player disconnects
    broadcast({ players });
  });
});

server.listen(3000, () => {
  console.log('🚀 Server running at http://localhost:3000');
});
