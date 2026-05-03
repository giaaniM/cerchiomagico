const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.static(path.join(__dirname, 'public')));
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

const os = require('os');

function getLocalIp() {
    const interfaces = os.networkInterfaces();
    const candidates = [];

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Node.js < 18 uses string 'IPv4', Node.js >= 18 uses number 4
            if ((iface.family === 'IPv4' || iface.family === 4) && !iface.internal) {
                candidates.push(iface.address);
                console.log(`Potential IP found: ${iface.address} on interface ${name}`);
            }
        }
    }

    // Prioritize addresses in the 192.168.x.x or 10.x.x.x range (typical local Wi-Fi)
    const preferredPrefixes = ['192.168.', '10.', '172.16.', '172.31.'];
    const bestMatch = candidates.find(ip => preferredPrefixes.some(prefix => ip.startsWith(prefix)));

    if (bestMatch) {
        console.log(`Selected BEST IP: ${bestMatch}`);
        return bestMatch;
    }

    if (candidates.length > 0) {
        console.log(`Selected fallback IP: ${candidates[0]}`);
        return candidates[0];
    }

    return 'localhost';
}

function getLocalHostname() {
    try {
        const hostname = os.hostname();
        return hostname.endsWith('.local') ? hostname : `${hostname}.local`;
    } catch (e) {
        return null;
    }
}

// Store lobbies and games
// Store lobbies and games
const lobbies = new Map();
const games = new Map();
const disconnectTimers = new Map();
const playerSessions = new Map();
let localIP = 'localhost';

// Generate unique lobby ID
function generateLobbyId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Create lobby
app.post('/api/lobby/create', (req, res) => {
    const lobbyId = generateLobbyId();
    lobbies.set(lobbyId, {
        id: lobbyId,
        hostSocketId: null,
        players: [],
        gameState: null,
        status: 'waiting' // waiting, playing, finished
    });
    console.log(`Lobby CREATED: ${lobbyId}. Total lobbies: ${lobbies.size}`);
    res.json({ 
        lobbyId, 
        localIp: getLocalIp(), 
        hostname: getLocalHostname(),
        port: PORT 
    });
});

// Get lobby info
app.get('/api/lobby/:id', (req, res) => {
    const lobby = lobbies.get(req.params.id);
    if (!lobby) {
        console.log(`Lobby lookup FAILED for ID: ${req.params.id}`);
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
    const list = Array.from(lobbies.values());
    console.log(`API [GET /api/lobbies] requested. Active lobbies: ${list.length}`);
    const lobbyList = list.map(lobby => ({
        id: lobby.id,
        players: lobby.players,
        status: lobby.status
    }));
    res.json(lobbyList);
});

// Remove puzzle from puzzles.js file
app.post('/api/puzzle/remove', (req, res) => {
    const { phrase } = req.body;
    if (!phrase) return res.status(400).json({ error: 'Phrase required' });

    const fs = require('fs');
    const puzzlesPath = path.join(__dirname, 'public', 'puzzles.js');

    try {
        let content = fs.readFileSync(puzzlesPath, 'utf8');

        // Match the object containing the phrase. 
        // We use a regex to find the object and any trailing comma/spaces.
        // We handle both simple quotes and double quotes.
        // We also need to be careful with apostrophes in the phrase being escaped or not.
        // Since we sanitizePhrase before selecting, the phrase on disk and the phrase in memory should match.
        // Escape special regex characters in the phrase
        const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // This regex is very flexible but precise:
        // - \{[^{]*? ensures we start at the opening brace of the target object
        // - phrase:\s*["']${escapedPhrase}["'] finds the exact phrase
        // - [^}]*?\} ensures we end at the closing brace of the same object
        const regex = new RegExp(`\\{[^{]*?phrase:\\s*["']${escapedPhrase}["'][^}]*?\\},?\\s*`, 'g');

        const newContent = content.replace(regex, '');

        if (content !== newContent) {
            fs.writeFileSync(puzzlesPath, newContent, 'utf8');
            console.log(`[FILE SUCCESS] Removed phrase from puzzles.js: "${phrase}"`);
            res.json({ success: true });
        } else {
            console.warn(`[FILE WARNING] Phrase NOT found in puzzles.js: "${phrase}"`);
            console.warn(`[FILE INFO] Search term (escaped): ${escapedPhrase}`);
            res.json({ success: false, message: 'Phrase not found' });
        }
    } catch (err) {
        console.error('[FILE] Error updating puzzles.js:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Host connects to lobby
    socket.on('host:join', (lobbyId) => {
        const lobby = lobbies.get(lobbyId);
        if (!lobby) {
            console.log(`Host join failed: Lobby ${lobbyId} not found`);
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
    socket.on('player:join', ({ lobbyId, playerName, persistentPlayerId }) => {
        const lobby = lobbies.get(lobbyId);
        if (!lobby) {
            console.log(`Player join failed: Lobby ${lobbyId} not found`);
            socket.emit('error', { message: 'Lobby not found' });
            return;
        }

        // Check if this is a reconnection
        const existingPlayer = lobby.players.find(p => p.persistentPlayerId === persistentPlayerId);

        if (existingPlayer) {
            console.log(`Player ${playerName} reconnected to lobby ${lobbyId}`);
            // Clear disconnect timer if exists
            const timerKey = `${lobbyId}:${persistentPlayerId}`;
            if (disconnectTimers.has(timerKey)) {
                clearTimeout(disconnectTimers.get(timerKey));
                disconnectTimers.delete(timerKey);
            }

            // Update socket ID
            existingPlayer.socketId = socket.id;
            existingPlayer.id = socket.id; // Many events use player.id which was socket.id
            socket.join(`lobby:${lobbyId}`);
            socket.emit('player:joined', { playerId: socket.id, playerName, persistentPlayerId });

            // Notify others
            io.to(`lobby:${lobbyId}`).emit('lobby:updated', {
                players: lobby.players,
                status: lobby.status
            });

            // If game is in progress, sync state immediately
            const game = games.get(lobbyId);
            if (game && game.gameState) {
                socket.emit('game:started');
                socket.emit('game:state-updated', game.gameState);
            }
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
            socketId: socket.id,
            persistentPlayerId: persistentPlayerId
        };
        lobby.players.push(player);
        socket.join(`lobby:${lobbyId}`);
        socket.emit('player:joined', { playerId: socket.id, playerName, persistentPlayerId });
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

    // Pass
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

    // Mystery choice
    socket.on('host:mystery-offer', ({ lobbyId, playerId }) => {
        const lobby = lobbies.get(lobbyId);
        if (lobby && lobby.hostSocketId === socket.id) {
            io.to(playerId).emit('game:mystery-offer');
        }
    });

    socket.on('host:mystery-resolved', (lobbyId) => {
        const lobby = lobbies.get(lobbyId);
        if (lobby && lobby.hostSocketId === socket.id) {
            io.to(`lobby:${lobbyId}`).emit('game:mystery-resolved');
        }
    });

    socket.on('player:mystery-choice', ({ lobbyId, choice }) => {
        const lobby = lobbies.get(lobbyId);
        if (lobby && lobby.hostSocketId) {
            io.to(lobby.hostSocketId).emit('lobby:mystery-choice', choice);
        }
    });

    // Disconnect handling
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        // Find if this socket belongs to a host or player
        for (const [lobbyId, lobby] of lobbies.entries()) {
            if (lobby.hostSocketId === socket.id) {
                // Host disconnected - remove lobby (host disconnection is still immediate for now)
                lobbies.delete(lobbyId);
                games.delete(lobbyId);
                io.to(`lobby:${lobbyId}`).emit('lobby:closed');
                console.log(`Lobby CLOSED because host ${socket.id} disconnected: ${lobbyId}`);
                break;
            } else {
                const player = lobby.players.find(p => p.socketId === socket.id);
                if (player) {
                    console.log(`Player ${player.name} disconnected. Starting grace period.`);
                    const timerKey = `${lobbyId}:${player.persistentPlayerId}`;

                    // Set cleanup timer (grace period 5 minutes)
                    const timeout = setTimeout(() => {
                        console.log(`Grace period expired for player ${player.name}. Removing.`);
                        const playerIndex = lobby.players.findIndex(p => p.persistentPlayerId === player.persistentPlayerId);
                        if (playerIndex !== -1) {
                            lobby.players.splice(playerIndex, 1);
                            io.to(`lobby:${lobbyId}`).emit('lobby:updated', {
                                players: lobby.players,
                                status: lobby.status
                            });
                            disconnectTimers.delete(timerKey);
                        }
                    }, 300000); // 5 minutes grace period

                    disconnectTimers.set(timerKey, timeout);
                    break;
                }
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Listen on all network interfaces

server.listen(PORT, HOST, () => {
    localIP = getLocalIp();

    console.log(`\n==========================================`);
    console.log(`🚀 Cerchio Magico SERVER ATTIVO`);
    console.log(`✅ Route /api/puzzle/remove REGISTRATA`);
    console.log(`==========================================\n`);
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Server accessible from network on http://${localIP}:${PORT}`);
    const hostName = getLocalHostname();
    if (hostName) {
        console.log(`Server also accessible via: http://${hostName}:${PORT}`);
    }
    console.log(`Mobile page: http://${localIP}:${PORT}/mobile.html`);
});

