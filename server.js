const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.static(__dirname));
app.use(express.json());

// Set CSP header to allow Socket.io
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' ws: wss: http: https: data: blob:; connect-src 'self' ws: wss: http: https:;");
    next();
});

// Handle favicon request to avoid 404 errors
app.get('/favicon.ico', (req, res) => {
    res.status(204).end(); // No Content
});

// Store lobbies and games
const lobbies = new Map();
const games = new Map();

// Generate unique lobby ID
function generateLobbyId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Create lobby
app.post('/api/lobby/create', (req, res) => {
    const lobbyId = generateLobbyId();
    const lobby = {
        id: lobbyId,
        hostSocketId: null,
        players: [],
        gameState: null,
        status: 'waiting' // waiting, playing, finished
    };
    lobbies.set(lobbyId, lobby);
    res.json({ lobbyId });
});

// Get lobby info
app.get('/api/lobby/:id', (req, res) => {
    const lobby = lobbies.get(req.params.id);
    if (!lobby) {
        return res.status(404).json({ error: 'Lobby not found' });
    }
    res.json({
        id: lobby.id,
        players: lobby.players,
        status: lobby.status
    });
});

// List all lobbies
app.get('/api/lobbies', (req, res) => {
    const lobbyList = Array.from(lobbies.values()).map(lobby => ({
        id: lobby.id,
        players: lobby.players,
        status: lobby.status
    }));
    res.json(lobbyList);
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Host connects to lobby
    socket.on('host:join', (lobbyId) => {
        const lobby = lobbies.get(lobbyId);
        if (!lobby) {
            socket.emit('error', { message: 'Lobby not found' });
            return;
        }
        lobby.hostSocketId = socket.id;
        socket.join(`lobby:${lobbyId}`);
        socket.emit('host:joined', { lobbyId });
        io.to(`lobby:${lobbyId}`).emit('lobby:updated', {
            players: lobby.players,
            status: lobby.status
        });
    });

    // Player joins lobby
    socket.on('player:join', ({ lobbyId, playerName }) => {
        const lobby = lobbies.get(lobbyId);
        if (!lobby) {
            socket.emit('error', { message: 'Lobby not found' });
            return;
        }
        if (lobby.status !== 'waiting') {
            socket.emit('error', { message: 'Game already started' });
            return;
        }
        if (lobby.players.some(p => p.name === playerName)) {
            socket.emit('error', { message: 'Name already taken' });
            return;
        }

        const player = {
            id: socket.id,
            name: playerName,
            socketId: socket.id
        };
        lobby.players.push(player);
        socket.join(`lobby:${lobbyId}`);
        socket.emit('player:joined', { playerId: socket.id, playerName });
        io.to(`lobby:${lobbyId}`).emit('lobby:updated', {
            players: lobby.players,
            status: lobby.status
        });
    });

    // Host starts game
    socket.on('host:start-game', (lobbyId) => {
        const lobby = lobbies.get(lobbyId);
        if (!lobby || lobby.hostSocketId !== socket.id) {
            socket.emit('error', { message: 'Unauthorized' });
            return;
        }
        lobby.status = 'playing';
        games.set(lobbyId, { lobbyId, gameState: null });
        io.to(`lobby:${lobbyId}`).emit('game:started');
    });

    // Host syncs game state
    socket.on('host:sync-state', ({ lobbyId, gameState }) => {
        const game = games.get(lobbyId);
        if (game) {
            game.gameState = gameState;
            // Broadcast to all players except host
            socket.to(`lobby:${lobbyId}`).emit('game:state-updated', gameState);
        }
    });

    // Player action: spin wheel
    socket.on('player:spin-wheel', ({ lobbyId, playerId }) => {
        const lobby = lobbies.get(lobbyId);
        if (!lobby) return;
        const player = lobby.players.find(p => p.id === playerId);
        if (!player || player.socketId !== socket.id) return;
        
        // Forward to host
        if (lobby.hostSocketId) {
            io.to(lobby.hostSocketId).emit('player:action', {
                type: 'spin-wheel',
                playerId,
                playerName: player.name
            });
        }
    });

    // Player action: call consonant
    socket.on('player:call-consonant', ({ lobbyId, playerId, letter }) => {
        const lobby = lobbies.get(lobbyId);
        if (!lobby) return;
        const player = lobby.players.find(p => p.id === playerId);
        if (!player || player.socketId !== socket.id) return;
        
        if (lobby.hostSocketId) {
            io.to(lobby.hostSocketId).emit('player:action', {
                type: 'call-consonant',
                playerId,
                playerName: player.name,
                letter: letter.toUpperCase()
            });
        }
    });

    // Player action: buy vowel
    socket.on('player:buy-vowel', ({ lobbyId, playerId, letter }) => {
        const lobby = lobbies.get(lobbyId);
        if (!lobby) return;
        const player = lobby.players.find(p => p.id === playerId);
        if (!player || player.socketId !== socket.id) return;
        
        if (lobby.hostSocketId) {
            io.to(lobby.hostSocketId).emit('player:action', {
                type: 'buy-vowel',
                playerId,
                playerName: player.name,
                letter: letter.toUpperCase()
            });
        }
    });

    // Player action: solve
    socket.on('player:solve', ({ lobbyId, playerId, solution }) => {
        const lobby = lobbies.get(lobbyId);
        if (!lobby) return;
        const player = lobby.players.find(p => p.id === playerId);
        if (!player || player.socketId !== socket.id) return;
        
        if (lobby.hostSocketId) {
            io.to(lobby.hostSocketId).emit('player:action', {
                type: 'solve',
                playerId,
                playerName: player.name,
                solution: solution.toUpperCase()
            });
        }
    });

    // Player action: pass
    socket.on('player:pass', ({ lobbyId, playerId }) => {
        const lobby = lobbies.get(lobbyId);
        if (!lobby) return;
        const player = lobby.players.find(p => p.id === playerId);
        if (!player || player.socketId !== socket.id) return;
        
        if (lobby.hostSocketId) {
            io.to(lobby.hostSocketId).emit('player:action', {
                type: 'pass',
                playerId,
                playerName: player.name
            });
        }
    });

    // Disconnect handling
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        // Remove player from lobby
        for (const [lobbyId, lobby] of lobbies.entries()) {
            if (lobby.hostSocketId === socket.id) {
                // Host disconnected - remove lobby
                lobbies.delete(lobbyId);
                games.delete(lobbyId);
                io.to(`lobby:${lobbyId}`).emit('lobby:closed');
                break;
            } else {
                const playerIndex = lobby.players.findIndex(p => p.socketId === socket.id);
                if (playerIndex !== -1) {
                    lobby.players.splice(playerIndex, 1);
                    io.to(`lobby:${lobbyId}`).emit('lobby:updated', {
                        players: lobby.players,
                        status: lobby.status
                    });
                    break;
                }
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Listen on all network interfaces

server.listen(PORT, HOST, () => {
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    let localIP = 'localhost';
    
    // Find local IP address
    for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        for (const iface of interfaces) {
            if (iface.family === 'IPv4' && !iface.internal) {
                localIP = iface.address;
                break;
            }
        }
        if (localIP !== 'localhost') break;
    }
    
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Server accessible from network on http://${localIP}:${PORT}`);
    console.log(`Mobile page: http://${localIP}:${PORT}/mobile.html`);
});

