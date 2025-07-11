const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const GameServer = require('./classes/GameServer');

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Initialize and start the game server
const gameServer = new GameServer();
gameServer.initialize(app, server, wss);
gameServer.start();
