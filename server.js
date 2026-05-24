require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const JWT_SECRET = process.env.JWT_SECRET || 'magicspin-secret-change-in-prod';

function authMiddleware(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

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

app.use((req, res, next) => {
    const host = req.hostname;
    if (host && host.includes('onrender.com')) {
        return res.redirect(301, `https://magicspingame.com${req.originalUrl}`);
    }
    next();
});

app.use((req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' ws: wss: http: https: data: blob:; connect-src 'self' ws: wss: http: https:;");
    next();
});

// Handle favicon request to avoid 404 errors
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

// Public config endpoint — exposes only the anon key (safe to expose)
app.get('/api/config', (req, res) => {
    res.json({
        url: process.env.SUPABASE_URL,
        anonKey: process.env.SUPABASE_ANON_KEY,
    });
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

// Get all active puzzles from Supabase
app.get('/api/puzzles', async (req, res) => {
    const lang = req.query.lang === 'en' ? 'en' : 'it';
    let query = supabase.from('puzzles').select('hint, phrase').eq('active', true);
    query = query.eq('lang', lang);
    const { data, error } = await query;
    if (error) {
        console.error('[SUPABASE] Error fetching puzzles:', JSON.stringify(error));
        return res.status(500).json({ error: 'Failed to fetch puzzles', detail: JSON.stringify(error) });
    }
    res.json(data ?? []);
});

// Leaderboard — GET top 20 by mode
app.get('/api/leaderboard', async (req, res) => {
    const mode = req.query.mode === 'mp' ? 'mp' : 'solo';
    const lang = req.query.lang === 'en' ? 'en' : 'it';
    const nickname = req.query.nickname ? String(req.query.nickname).trim().slice(0, 30) : null;
    const TOP_N = 8;
    const orderCol = mode === 'solo' ? 'time_seconds' : 'score';
    const ascending = mode === 'solo';

    const { data: top, error } = await supabase
        .from('leaderboard')
        .select('nickname, score, time_seconds')
        .eq('mode', mode)
        .eq('lang', lang)
        .order(orderCol, { ascending })
        .limit(TOP_N);
    if (error) return res.status(500).json({ error: 'Failed to fetch leaderboard' });

    let userRank = null;
    let userWindow = null;

    if (nickname) {
        const { data: best } = await supabase
            .from('leaderboard')
            .select('nickname, score, time_seconds')
            .eq('mode', mode)
            .eq('lang', lang)
            .ilike('nickname', nickname)
            .order(orderCol, { ascending })
            .limit(1);

        if (best?.length) {
            const metric = mode === 'solo' ? best[0].time_seconds : best[0].score;
            const { count } = await supabase
                .from('leaderboard')
                .select('*', { count: 'exact', head: true })
                .eq('mode', mode)
                .eq('lang', lang)
                .filter(orderCol, ascending ? 'lt' : 'gt', metric);
            userRank = (count ?? 0) + 1;

            if (userRank > TOP_N) {
                const winStart = Math.max(0, userRank - 3);
                const { data: win } = await supabase
                    .from('leaderboard')
                    .select('nickname, score, time_seconds')
                    .eq('mode', mode)
                    .eq('lang', lang)
                    .order(orderCol, { ascending })
                    .range(winStart, winStart + 5);
                userWindow = { startRank: winStart + 1, entries: win ?? [] };
            }
        }
    }

    res.json({ top: top ?? [], userRank, userWindow });
});

// Leaderboard — POST submit score
app.post('/api/leaderboard', async (req, res) => {
    const { nickname, mode, score, time_seconds, lang } = req.body;
    if (!nickname || !mode || score == null) return res.status(400).json({ error: 'Missing fields' });
    if (!['solo', 'mp'].includes(mode)) return res.status(400).json({ error: 'Invalid mode' });
    if (typeof score !== 'number' || score < 0) return res.status(400).json({ error: 'Invalid score' });
    const clean = String(nickname).trim().slice(0, 30);
    if (!clean) return res.status(400).json({ error: 'Invalid nickname' });

    const { error } = await supabase.from('leaderboard').insert({
        nickname: clean,
        mode,
        score,
        time_seconds: time_seconds ?? null,
        lang: lang === 'en' ? 'en' : 'it',
    });
    if (error) return res.status(500).json({ error: 'Failed to submit score' });

    // Return rank
    const orderCol = mode === 'solo' ? 'time_seconds' : 'score';
    const ascending = mode === 'solo';
    const { count } = await supabase
        .from('leaderboard')
        .select('*', { count: 'exact', head: true })
        .eq('mode', mode)
        .eq('lang', lang === 'en' ? 'en' : 'it')
        .filter(orderCol, ascending ? 'lte' : 'gte', mode === 'solo' ? time_seconds : score);
    res.json({ success: true, rank: count ?? null });
});

// Mark puzzle as inactive in Supabase
app.post('/api/puzzle/remove', async (req, res) => {
    const { phrase } = req.body;
    if (!phrase) return res.status(400).json({ error: 'Phrase required' });

    const { data, error } = await supabase
        .from('puzzles')
        .update({ active: false })
        .eq('phrase', phrase)
        .select();

    if (error) {
        console.error('[SUPABASE] Error removing phrase:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
    if (data && data.length > 0) {
        console.log(`[SUPABASE] Phrase deactivated: "${phrase}"`);
        res.json({ success: true });
    } else {
        console.warn(`[SUPABASE] Phrase not found: "${phrase}"`);
        res.json({ success: false, message: 'Phrase not found' });
    }
});

// ===== AUTH =====
app.post('/api/auth/register', async (req, res) => {
    const { username, password, email } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username e password richiesti' });
    const clean = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(clean)) return res.status(400).json({ error: 'Username non valido (3-20 caratteri: lettere, numeri, _)' });
    const { data: existing } = await supabase.from('users').select('id').eq('username', clean).single();
    if (existing) return res.status(409).json({ error: 'Username già in uso' });
    const hash = await bcrypt.hash(password, 10);
    const { data: user, error } = await supabase.from('users').insert({
        username: clean,
        password_hash: hash,
        email: email?.trim() || null,
    }).select().single();
    if (error) return res.status(500).json({ error: 'Errore registrazione' });
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, username: user.username } });
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Campi mancanti' });
    const { data: user } = await supabase.from('users').select('*').eq('username', username.trim().toLowerCase()).single();
    if (!user) return res.status(401).json({ error: 'Credenziali errate' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Credenziali errate' });
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, username: user.username } });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
    res.json({ id: req.user.id, username: req.user.username });
});

// ===== FRIENDS =====
app.post('/api/friends/request', authMiddleware, async (req, res) => {
    const { friendUsername } = req.body;
    const { data: friend } = await supabase.from('users').select('id').eq('username', friendUsername?.toLowerCase()).single();
    if (!friend) return res.status(404).json({ error: 'Utente non trovato' });
    if (friend.id === req.user.id) return res.status(400).json({ error: 'Non puoi aggiungere te stesso' });
    const { error } = await supabase.from('friendships').insert({ user_id: req.user.id, friend_id: friend.id, status: 'pending' });
    if (error) return res.status(409).json({ error: 'Richiesta già inviata' });
    res.json({ success: true });
});

app.post('/api/friends/accept', authMiddleware, async (req, res) => {
    const { requesterId } = req.body;
    await supabase.from('friendships').update({ status: 'accepted' }).eq('user_id', requesterId).eq('friend_id', req.user.id);
    await supabase.from('friendships').insert({ user_id: req.user.id, friend_id: requesterId, status: 'accepted' });
    res.json({ success: true });
});

app.get('/api/friends', authMiddleware, async (req, res) => {
    const { data } = await supabase.from('friendships').select('friend_id').eq('user_id', req.user.id).eq('status', 'accepted');
    if (!data?.length) return res.json([]);
    const ids = data.map(r => r.friend_id);
    const { data: users } = await supabase.from('users').select('id, username').in('id', ids);
    res.json(users ?? []);
});

app.get('/api/friends/requests', authMiddleware, async (req, res) => {
    const { data } = await supabase.from('friendships').select('user_id').eq('friend_id', req.user.id).eq('status', 'pending');
    if (!data?.length) return res.json([]);
    const ids = data.map(r => r.user_id);
    const { data: users } = await supabase.from('users').select('id, username').in('id', ids);
    res.json(users ?? []);
});

// Socket.io connection handling
io.on('connection', (socket) => {
    const online = io.engine.clientsCount;
    console.log(`[CONN] +1 connesso | online: ${online} | id: ${socket.id}`);

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
        console.log(`[LOBBY] ${playerName} è entrato nella lobby ${lobbyId} | giocatori: ${lobby.players.length}`);
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
        const playerNames = lobby.players.map(p => p.name).join(', ');
        console.log(`[GAME] Partita avviata | lobby: ${lobbyId} | giocatori: ${playerNames}`);
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
        const online = io.engine.clientsCount;
        console.log(`[CONN] -1 disconnesso | online: ${online} | id: ${socket.id}`);
        // Find if this socket belongs to a host or player
        for (const [lobbyId, lobby] of lobbies.entries()) {
            if (lobby.hostSocketId === socket.id) {
                // Host disconnected - remove lobby (host disconnection is still immediate for now)
                lobbies.delete(lobbyId);
                games.delete(lobbyId);
                io.to(`lobby:${lobbyId}`).emit('lobby:closed');
                console.log(`[LOBBY] Chiusa perché l'host si è disconnesso | lobby: ${lobbyId}`);
                break;
            } else {
                const player = lobby.players.find(p => p.socketId === socket.id);
                if (player) {
                    console.log(`[LOBBY] ${player.name} disconnesso | grace period 5 min | lobby: ${lobbyId}`);
                    const timerKey = `${lobbyId}:${player.persistentPlayerId}`;

                    // Set cleanup timer (grace period 5 minutes)
                    const timeout = setTimeout(() => {
                        console.log(`[LOBBY] Grace period scaduto per ${player.name} — rimosso dalla lobby ${lobbyId}`);
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

// ===== ONLINE MULTIPLAYER =====

const VOWELS_SET = new Set(['A','E','I','O','U']);
const VOWEL_COST = 1000;
const TURN_SECONDS = 10;
const MATCHMAKING_WAIT_MS = 10000;

// Italian consonant frequency (most → least common)
const IT_CONSONANT_ORDER = ['R','S','T','N','L','C','D','P','M','V','G','F','B','Z','H','Q','X','W','Y','J','K'];

const ONLINE_WHEEL = [
    { value: 500 }, { value: 300 }, { value: 700 }, { value: 200 },
    { value: 'CROLLO' }, { value: 350 }, { value: 900 }, { value: 400 },
    { value: 'PASSA' }, { value: 600 }, { value: 300 }, { value: 800 },
    { value: 'RADDOPPIA' }, { value: 500 }, { value: 200 }, { value: 400 },
    { value: 'PASSA' }, { value: 700 }, { value: 350 }, { value: 'CROLLO' },
];

function normalizeLetter(l) {
    return l.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
}
function normalizePhrase(p) {
    return p.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z ]/g, ' ');
}
function countOccurrences(normalized, letter) {
    let n = 0;
    for (const c of normalized) if (c === letter) n++;
    return n;
}
function spinOnlineWheel() {
    return ONLINE_WHEEL[Math.floor(Math.random() * ONLINE_WHEEL.length)];
}
function unrevealedConsonants(normalized, revealed) {
    const letters = new Set(normalized.split('').filter(c => c !== ' ' && !VOWELS_SET.has(c)));
    return [...letters].filter(l => !revealed.has(l));
}
function unrevealedCount(normalized, revealed) {
    return normalized.split('').filter(c => c !== ' ' && !revealed.has(c)).length;
}

// ─── 1v1 Challenge engine ──────────────────────────────────────────────────────
const CHALLENGE_SEGMENTS = [
    300, 200, 700, 500, 'PASSA', 1000,
    'CROLLO', 350, 300, 450, 700, 'PASSA',
    'RADDOPPIA', 'PASSA', 800, 300, 600, 500,
    'SCUDO', 300, 500, 200, 'PASSA', 200
];
const challengeGames = new Map();
const userSockets = new Map(); // profileId → socketId

function challengeSpinWheel() {
    return CHALLENGE_SEGMENTS[Math.floor(Math.random() * CHALLENGE_SEGMENTS.length)];
}

function chBuildCells(phrase, revealed) {
    return phrase.split('').map((ch, i) => {
        if (ch === ' ') return { type: 'space' };
        if (revealed.has(i)) return { type: 'letter', ch };
        return { type: 'hidden' };
    });
}

function chIsComplete(phrase, revealed) {
    return phrase.split('').every((ch, i) => ch === ' ' || revealed.has(i));
}

function chBroadcast(game) {
    io.to(`ch:${game.id}`).emit('challenge:state', {
        cells: chBuildCells(game.puzzle.phrase, game.revealed),
        hint: game.puzzle.hint,
        usedLetters: [...game.usedLetters],
        mancheScore: game.mancheScore,
        totalScore: game.totalScore,
        currentPlayerIdx: game.currentPlayerIdx,
        phase: game.phase,
        spinValue: game.currentSpinValue,
        players: game.players.map(p => ({ username: p.username, shield: p.shield })),
        timerValue: game.timerValue
    });
}

function chStartTimer(game) {
    chClearTimer(game);
    game.timerValue = 10;
    game.timer = setInterval(() => {
        game.timerValue--;
        io.to(`ch:${game.id}`).emit('challenge:timer', { seconds: game.timerValue });
        if (game.timerValue <= 0) { chClearTimer(game); chPassTurn(game); }
    }, 1000);
}

function chClearTimer(game) {
    if (game.timer) { clearInterval(game.timer); game.timer = null; }
}

function chPassTurn(game) {
    game.mancheScore[game.currentPlayerIdx] = 0;
    game.currentPlayerIdx = 1 - game.currentPlayerIdx;
    game.phase = 'spin';
    game.currentSpinValue = null;
    chBroadcast(game);
    chStartTimer(game);
}

async function chStartGame(game) {
    const { data: puzzles } = await supabase.from('puzzles').select('id, phrase, hint').eq('lang', game.lang).eq('active', true);
    if (!puzzles?.length) return;
    game.puzzle = puzzles[Math.floor(Math.random() * puzzles.length)];
    game.revealed = new Set();
    game.usedLetters = new Set();
    game.phase = 'spin';
    game.currentSpinValue = null;
    game.mancheScore = [0, 0];
    game.totalScore = [0, 0];
    io.to(`ch:${game.id}`).emit('challenge:started', { players: game.players.map(p => ({ username: p.username })) });
    chBroadcast(game);
    chStartTimer(game);
}

async function chEnd(game, winnerIdx) {
    chClearTimer(game);
    const winner = game.players[winnerIdx];
    const loser  = game.players[1 - winnerIdx];
    await supabase.from('challenges').update({
        status: 'completed', winner_id: winner.profileId,
        challenger_score: game.totalScore[0], opponent_score: game.totalScore[1],
        completed_at: new Date().toISOString()
    }).eq('id', game.id);

    for (let i = 0; i < 2; i++) {
        const p = game.players[i];
        const isWinner = i === winnerIdx;
        const { data: row } = await supabase.from('leaderboard_online').select('wins,losses,total_score').eq('user_id', p.profileId).single();
        if (row) {
            await supabase.from('leaderboard_online').update({
                wins: (row.wins || 0) + (isWinner ? 1 : 0),
                losses: (row.losses || 0) + (isWinner ? 0 : 1),
                total_score: (row.total_score || 0) + game.totalScore[i]
            }).eq('user_id', p.profileId);
        }
    }
    io.to(`ch:${game.id}`).emit('challenge:game-over', {
        winnerIdx, winner: winner.username, totalScore: game.totalScore,
        players: game.players.map(p => ({ username: p.username }))
    });
    setTimeout(() => challengeGames.delete(game.id), 60000);
}

// matchmaking queue: [{ socketId, userId, displayName, lang, joinedAt }]
const matchmakingQueue = [];
const onlineRooms = new Map(); // roomCode → room

function genRoomCode() {
    return Math.random().toString(36).slice(2, 7).toUpperCase();
}

async function fetchRandomPhrase(lang = 'it') {
    const { data } = await supabase
        .from('puzzles')
        .select('id, phrase, hint')
        .eq('active', true)
        .eq('lang', lang)
        .limit(50);
    if (!data?.length) return null;
    return data[Math.floor(Math.random() * data.length)];
}

function createRoom(p1, p2, isBot = false, privateCode = null) {
    const code = privateCode || genRoomCode();
    const normalized = normalizePhrase(p2.phrase || '');
    const room = {
        code,
        players: [p1, p2],
        isBot,
        phrase: p2.phrase,
        hint: p2.hint,
        normalized,
        revealed: new Set(),
        used: new Set(),
        scores: [0, 0],         // turn scores (reset on CROLLO/pass)
        total: [0, 0],
        currentTurn: 0,
        pendingValue: null,
        phase: 'spin',           // 'spin' | 'letter' | 'action'
        shielded: [false, false],
        timer: null,
        timerLeft: TURN_SECONDS,
        status: 'playing',
    };
    onlineRooms.set(code, room);
    return room;
}

function roomPublicState(room) {
    return {
        code: room.code,
        phrase: room.phrase,
        hint: room.hint,
        normalized: room.normalized,
        revealed: [...room.revealed],
        used: [...room.used],
        scores: room.scores,
        total: room.total,
        currentTurn: room.currentTurn,
        pendingValue: room.pendingValue,
        phase: room.phase,
        shielded: room.shielded,
        timerLeft: room.timerLeft,
        status: room.status,
        players: room.players.map((p, i) => ({
            displayName: p.displayName,
            userId: p.userId,
            isBot: p.isBot || false,
            score: room.total[i],
        })),
    };
}

function emitRoomState(room) {
    const state = roomPublicState(room);
    room.players.forEach((p, i) => {
        if (p.socketId) io.to(p.socketId).emit('online:state', { ...state, myIndex: i });
    });
}

function startTurnTimer(room) {
    clearInterval(room.timer);
    room.timerLeft = TURN_SECONDS;
    room.timer = setInterval(() => {
        room.timerLeft--;
        room.players.forEach(p => {
            if (p.socketId) io.to(p.socketId).emit('online:timer', room.timerLeft);
        });
        if (room.timerLeft <= 0) {
            clearInterval(room.timer);
            passTurnOnline(room, 'timeout');
        }
    }, 1000);
}

function passTurnOnline(room, reason = 'manual') {
    clearInterval(room.timer);
    room.scores[room.currentTurn] = 0;
    room.pendingValue = null;
    room.phase = 'spin';
    room.currentTurn = 1 - room.currentTurn;
    emitRoomState(room);
    if (room.isBot && room.currentTurn === 1) {
        scheduleBotTurn(room);
    } else {
        startTurnTimer(room);
    }
}

function applyWheelValue(room, segment) {
    const turn = room.currentTurn;
    const v = segment.value;
    if (v === 'CROLLO') {
        if (room.shielded[turn]) {
            room.shielded[turn] = false;
            room.phase = 'spin';
            emitRoomState(room);
            if (!(room.isBot && turn === 1)) startTurnTimer(room);
        } else {
            room.scores[turn] = 0;
            room.phase = 'spin';
            room.currentTurn = 1 - turn;
            emitRoomState(room);
            if (room.isBot && room.currentTurn === 1) scheduleBotTurn(room);
            else startTurnTimer(room);
        }
        return;
    }
    if (v === 'PASSA') {
        passTurnOnline(room, 'passa');
        return;
    }
    if (v === 'RADDOPPIA') {
        room.scores[turn] *= 2;
        room.pendingValue = null;
        room.phase = 'spin';
        emitRoomState(room);
        if (!(room.isBot && turn === 1)) startTurnTimer(room);
        return;
    }
    room.pendingValue = v;
    room.phase = 'letter';
    emitRoomState(room);
    if (!(room.isBot && turn === 1)) startTurnTimer(room);
}

function callLetterOnline(room, letter, isVowel) {
    clearInterval(room.timer);
    const L = normalizeLetter(letter);
    if (room.used.has(L)) {
        if (!(room.isBot && room.currentTurn === 1)) startTurnTimer(room);
        return;
    }
    room.used.add(L);

    if (isVowel) {
        if (room.total[room.currentTurn] < VOWEL_COST) {
            if (!(room.isBot && room.currentTurn === 1)) startTurnTimer(room);
            return;
        }
        room.total[room.currentTurn] -= VOWEL_COST;
        const count = countOccurrences(room.normalized, L);
        if (count > 0) {
            room.revealed.add(L);
            room.phase = 'action';
            emitRoomState(room);
            if (!(room.isBot && room.currentTurn === 1)) startTurnTimer(room);
        } else {
            passTurnOnline(room, 'no-letter');
        }
        return;
    }

    // Consonant
    const count = countOccurrences(room.normalized, L);
    if (count > 0) {
        room.revealed.add(L);
        const earned = (room.pendingValue || 0) * count;
        room.scores[room.currentTurn] += earned;
        room.total[room.currentTurn] += earned;
        room.pendingValue = null;
        room.phase = 'action';
        emitRoomState(room);
        if (!(room.isBot && room.currentTurn === 1)) startTurnTimer(room);
    } else {
        room.scores[room.currentTurn] = 0;
        room.pendingValue = null;
        room.phase = 'spin';
        passTurnOnline(room, 'no-letter');
    }
}

function trySolveOnline(room, attempt) {
    clearInterval(room.timer);
    const normalized = normalizePhrase(attempt);
    if (normalized === room.normalized) {
        room.total[room.currentTurn] += room.scores[room.currentTurn];
        finishGame(room, room.currentTurn);
    } else {
        room.scores[room.currentTurn] = 0;
        passTurnOnline(room, 'wrong-solve');
    }
}

async function finishGame(room, winnerIdx) {
    clearInterval(room.timer);
    room.status = 'finished';
    emitRoomState(room);
    // Persist stats (fire and forget)
    const winner = room.players[winnerIdx];
    if (winner?.userId) {
        supabase.from('profiles')
            .update({ games_won: supabase.rpc('increment', { x: 1 }) })
            .eq('id', winner.userId)
            .then(() => {});
    }
    room.players.forEach(p => {
        if (p?.userId) {
            supabase.from('profiles')
                .update({ games_played: supabase.rpc('increment', { x: 1 }) })
                .eq('id', p.userId)
                .then(() => {});
        }
    });
    // Clean up after 30s
    setTimeout(() => onlineRooms.delete(room.code), 30000);
}

// ── Bot logic ──
function scheduleBotTurn(room) {
    const delay = 800 + Math.random() * 1200;
    setTimeout(() => executeBotTurn(room), delay);
}

function executeBotTurn(room) {
    if (room.status !== 'playing' || room.currentTurn !== 1) return;

    if (room.phase === 'spin') {
        const seg = spinOnlineWheel();
        applyWheelValue(room, seg);
        // If bot still active after spin (got a value), schedule letter choice
        if (room.phase === 'letter' && room.currentTurn === 1) {
            setTimeout(() => executeBotTurn(room), 800 + Math.random() * 600);
        }
        return;
    }

    if (room.phase === 'letter') {
        // Smart endgame: if ≤2 unrevealed letters total → solve
        if (unrevealedCount(room.normalized, room.revealed) <= 2) {
            trySolveOnline(room, room.phrase);
            return;
        }
        // Pick least-used consonant from frequency list
        const remaining = unrevealedConsonants(room.normalized, room.used);
        let pick = null;
        for (const l of IT_CONSONANT_ORDER) {
            if (remaining.includes(l)) { pick = l; break; }
        }
        if (!pick) pick = remaining[0];
        if (!pick) { passTurnOnline(room, 'no-consonants'); return; }
        callLetterOnline(room, pick, false);
        // After consonant, if still bot's turn → spin again after delay
        if (room.phase === 'action' && room.currentTurn === 1) {
            setTimeout(() => {
                room.phase = 'spin';
                emitRoomState(room);
                scheduleBotTurn(room);
            }, 600);
        }
        return;
    }

    if (room.phase === 'action') {
        // Bot always spins again
        room.phase = 'spin';
        emitRoomState(room);
        scheduleBotTurn(room);
    }
}

// ── Private rooms (vs friend) ──
const privateRooms = new Map(); // code → { hostPlayer, lang, phrase }

// ── Socket handlers for online multiplayer ──
// (existing smartphone-controller handler above runs in parallel via Socket.io's stacked listeners)
io.on('connection', (socket) => {

    // ── Matchmaking ──
    socket.on('online:join_matchmaking', async ({ userId, displayName, lang }) => {
        // Remove any stale entry for this user
        const idx = matchmakingQueue.findIndex(e => e.userId === userId);
        if (idx !== -1) matchmakingQueue.splice(idx, 1);

        matchmakingQueue.push({ socketId: socket.id, userId, displayName, lang: lang || 'it', joinedAt: Date.now() });

        // Try to match with waiting player of same lang
        const others = matchmakingQueue.filter(e => e.socketId !== socket.id && e.lang === (lang || 'it'));
        if (others.length > 0) {
            const opponent = others[0];
            // Remove both from queue
            [socket.id, opponent.socketId].forEach(id => {
                const i = matchmakingQueue.findIndex(e => e.socketId === id);
                if (i !== -1) matchmakingQueue.splice(i, 1);
            });
            const phraseRow = await fetchRandomPhrase(lang || 'it');
            if (!phraseRow) return;
            const p1 = { socketId: socket.id, userId, displayName };
            const p2 = { socketId: opponent.socketId, userId: opponent.userId, displayName: opponent.displayName };
            const room = createRoom(p1, { ...p2, phrase: phraseRow.phrase, hint: phraseRow.hint }, false);
            room.players[0] = p1;
            room.players[1] = p2;
            room.phrase = phraseRow.phrase;
            room.hint = phraseRow.hint;
            room.normalized = normalizePhrase(phraseRow.phrase);
            [socket.id, opponent.socketId].forEach(id => io.to(id).emit('online:match_found', { code: room.code }));
            emitRoomState(room);
            startTurnTimer(room);
        } else {
            socket.emit('online:waiting', { position: matchmakingQueue.length });
            // Auto-bot after MATCHMAKING_WAIT_MS
            setTimeout(async () => {
                const stillWaiting = matchmakingQueue.find(e => e.socketId === socket.id);
                if (!stillWaiting) return;
                matchmakingQueue.splice(matchmakingQueue.indexOf(stillWaiting), 1);
                const phraseRow = await fetchRandomPhrase(lang || 'it');
                if (!phraseRow) return;
                const p1 = { socketId: socket.id, userId, displayName };
                const bot = { socketId: null, userId: null, displayName: '🤖 Bot', isBot: true };
                const room = createRoom(p1, bot, true);
                room.phrase = phraseRow.phrase;
                room.hint = phraseRow.hint;
                room.normalized = normalizePhrase(phraseRow.phrase);
                socket.emit('online:match_found', { code: room.code, vsBot: true });
                emitRoomState(room);
                startTurnTimer(room);
            }, MATCHMAKING_WAIT_MS);
        }
    });

    socket.on('online:cancel_matchmaking', ({ userId }) => {
        const idx = matchmakingQueue.findIndex(e => e.userId === userId);
        if (idx !== -1) matchmakingQueue.splice(idx, 1);
    });

    // ── Private room (vs friend) ──
    socket.on('online:create_private', async ({ userId, displayName, lang }) => {
        const code = genRoomCode();
        privateRooms.set(code, { hostSocket: socket.id, userId, displayName, lang: lang || 'it' });
        socket.emit('online:private_created', { code });
        // Clean up if no one joins in 5 min
        setTimeout(() => privateRooms.delete(code), 300000);
    });

    socket.on('online:join_private', async ({ code, userId, displayName }) => {
        const pending = privateRooms.get(code);
        if (!pending) { socket.emit('online:error', { msg: 'Codice non valido' }); return; }
        if (pending.userId === userId) { socket.emit('online:error', { msg: 'Non puoi sfidare te stesso' }); return; }
        privateRooms.delete(code);
        const phraseRow = await fetchRandomPhrase(pending.lang);
        if (!phraseRow) { socket.emit('online:error', { msg: 'Errore frasi' }); return; }
        const p1 = { socketId: pending.hostSocket, userId: pending.userId, displayName: pending.displayName };
        const p2 = { socketId: socket.id, userId, displayName };
        const room = createRoom(p1, p2, false, code);
        room.phrase = phraseRow.phrase;
        room.hint = phraseRow.hint;
        room.normalized = normalizePhrase(phraseRow.phrase);
        [pending.hostSocket, socket.id].forEach(id => io.to(id).emit('online:match_found', { code: room.code }));
        emitRoomState(room);
        startTurnTimer(room);
    });

    // ── In-game actions ──
    socket.on('online:spin', ({ code }) => {
        const room = onlineRooms.get(code);
        if (!room || room.status !== 'playing') return;
        const idx = room.players.findIndex(p => p.socketId === socket.id);
        if (idx !== room.currentTurn || room.phase !== 'spin') return;
        clearInterval(room.timer);
        const seg = spinOnlineWheel();
        applyWheelValue(room, seg);
        // Send the segment that was spun so client can animate
        room.players.forEach(p => {
            if (p.socketId) io.to(p.socketId).emit('online:spin_result', { segment: seg });
        });
    });

    socket.on('online:call_consonant', ({ code, letter }) => {
        const room = onlineRooms.get(code);
        if (!room || room.status !== 'playing') return;
        const idx = room.players.findIndex(p => p.socketId === socket.id);
        if (idx !== room.currentTurn || room.phase !== 'letter') return;
        callLetterOnline(room, letter, false);
    });

    socket.on('online:buy_vowel', ({ code, letter }) => {
        const room = onlineRooms.get(code);
        if (!room || room.status !== 'playing') return;
        const idx = room.players.findIndex(p => p.socketId === socket.id);
        if (idx !== room.currentTurn || room.phase !== 'action') return;
        callLetterOnline(room, letter, true);
    });

    socket.on('online:solve', ({ code, attempt }) => {
        const room = onlineRooms.get(code);
        if (!room || room.status !== 'playing') return;
        const idx = room.players.findIndex(p => p.socketId === socket.id);
        if (idx !== room.currentTurn) return;
        trySolveOnline(room, attempt);
    });

    socket.on('online:pass', ({ code }) => {
        const room = onlineRooms.get(code);
        if (!room || room.status !== 'playing') return;
        const idx = room.players.findIndex(p => p.socketId === socket.id);
        if (idx !== room.currentTurn) return;
        passTurnOnline(room, 'manual');
    });

    // ── 1v1 Challenge handlers ──
    socket.on('challenge:auth', ({ profileId, username }) => {
        userSockets.set(profileId, socket.id);
        socket.data.profileId = profileId;
        socket.data.username = username;
    });

    socket.on('challenge:send', async ({ toProfileId, lang }) => {
        const fromProfileId = socket.data.profileId;
        const fromUsername = socket.data.username;
        if (!fromProfileId) return;
        const { data: ch } = await supabase.from('challenges').insert({
            challenger_id: fromProfileId,
            opponent_id: toProfileId,
            status: 'pending',
            lang: lang || 'it'
        }).select().single();
        if (!ch) return;
        const toSocketId = userSockets.get(toProfileId);
        if (toSocketId) {
            io.to(toSocketId).emit('challenge:invite', { challengeId: ch.id, from: fromUsername, lang: ch.lang });
        }
        socket.emit('challenge:sent', { challengeId: ch.id });
    });

    socket.on('challenge:accept', async ({ challengeId }) => {
        const { data: ch } = await supabase.from('challenges').select('*').eq('id', challengeId).single();
        if (!ch || ch.status !== 'pending') return;
        await supabase.from('challenges').update({ status: 'active' }).eq('id', challengeId);
        const { data: profiles } = await supabase.from('users').select('id, username').in('id', [ch.challenger_id, ch.opponent_id]);
        const getName = (id) => {
            const p = profiles?.find(p => p.id === id);
            return p?.username || 'Giocatore';
        };
        const challengerSocketId = userSockets.get(ch.challenger_id);
        const game = {
            id: challengeId,
            players: [
                { profileId: ch.challenger_id, username: getName(ch.challenger_id), socketId: challengerSocketId, shield: false },
                { profileId: ch.opponent_id,   username: getName(ch.opponent_id),   socketId: socket.id, shield: false }
            ],
            lang: ch.lang || 'it',
            currentPlayerIdx: 0,
            mancheScore: [0, 0],
            totalScore: [0, 0],
            revealed: new Set(),
            usedLetters: new Set(),
            phase: 'spin',
            currentSpinValue: null,
            timer: null,
            timerValue: 10
        };
        challengeGames.set(challengeId, game);
        socket.join(`ch:${challengeId}`);
        if (challengerSocketId) io.in(challengerSocketId).socketsJoin(`ch:${challengeId}`);
        await chStartGame(game);
    });

    socket.on('challenge:decline', async ({ challengeId }) => {
        const { data: ch } = await supabase.from('challenges').select('challenger_id').eq('id', challengeId).single();
        await supabase.from('challenges').update({ status: 'declined' }).eq('id', challengeId);
        if (ch?.challenger_id) {
            const toSocketId = userSockets.get(ch.challenger_id);
            if (toSocketId) io.to(toSocketId).emit('challenge:declined', { challengeId });
        }
    });

    socket.on('challenge:spin', ({ challengeId }) => {
        const game = challengeGames.get(challengeId);
        if (!game) return;
        const idx = game.players.findIndex(p => p.socketId === socket.id);
        if (idx !== game.currentPlayerIdx || game.phase !== 'spin') return;
        chClearTimer(game);
        const seg = challengeSpinWheel();
        if (seg === 'CROLLO') {
            const p = game.players[idx];
            if (p.shield) { p.shield = false; }
            else { game.mancheScore[idx] = 0; }
            game.currentSpinValue = 'CROLLO';
            chPassTurn(game);
        } else if (seg === 'PASSA') {
            game.currentSpinValue = 'PASSA';
            chPassTurn(game);
        } else if (seg === 'SCUDO') {
            game.players[idx].shield = true;
            game.currentSpinValue = 'SCUDO';
            game.phase = 'spin';
            chBroadcast(game);
            chStartTimer(game);
        } else if (seg === 'RADDOPPIA') {
            game.mancheScore[idx] *= 2;
            game.currentSpinValue = 'RADDOPPIA';
            game.phase = 'action';
            chBroadcast(game);
            chStartTimer(game);
        } else {
            game.currentSpinValue = seg;
            game.phase = 'consonant';
            chBroadcast(game);
            chStartTimer(game);
        }
    });

    socket.on('challenge:consonant', ({ challengeId, letter }) => {
        const game = challengeGames.get(challengeId);
        if (!game) return;
        const idx = game.players.findIndex(p => p.socketId === socket.id);
        if (idx !== game.currentPlayerIdx || game.phase !== 'consonant') return;
        const l = normalizeLetter(letter);
        if (VOWELS_SET.has(l) || game.usedLetters.has(l)) return;
        chClearTimer(game);
        game.usedLetters.add(l);
        const normalized = normalizePhrase(game.puzzle.phrase);
        let count = 0;
        normalized.split('').forEach((ch, i) => { if (ch === l) { game.revealed.add(i); count++; } });
        if (count > 0) {
            game.mancheScore[idx] += count * game.currentSpinValue;
            if (chIsComplete(normalized, game.revealed)) {
                game.totalScore[idx] += game.mancheScore[idx];
                chEnd(game, idx);
                return;
            }
            game.phase = 'action';
            chBroadcast(game);
            chStartTimer(game);
        } else {
            chPassTurn(game);
        }
    });

    socket.on('challenge:vowel', ({ challengeId, letter }) => {
        const game = challengeGames.get(challengeId);
        if (!game) return;
        const idx = game.players.findIndex(p => p.socketId === socket.id);
        if (idx !== game.currentPlayerIdx || game.phase !== 'action') return;
        if (game.mancheScore[idx] < VOWEL_COST) return;
        const l = normalizeLetter(letter);
        if (!VOWELS_SET.has(l) || game.usedLetters.has(l)) return;
        chClearTimer(game);
        game.usedLetters.add(l);
        game.mancheScore[idx] -= VOWEL_COST;
        const normalized = normalizePhrase(game.puzzle.phrase);
        normalized.split('').forEach((ch, i) => { if (ch === l) game.revealed.add(i); });
        if (chIsComplete(normalized, game.revealed)) {
            game.totalScore[idx] += game.mancheScore[idx];
            chEnd(game, idx);
            return;
        }
        chBroadcast(game);
        chStartTimer(game);
    });

    socket.on('challenge:solve', ({ challengeId, attempt }) => {
        const game = challengeGames.get(challengeId);
        if (!game) return;
        const idx = game.players.findIndex(p => p.socketId === socket.id);
        if (idx !== game.currentPlayerIdx) return;
        chClearTimer(game);
        const normalized = normalizePhrase(game.puzzle.phrase);
        if (normalizePhrase(attempt) === normalized) {
            game.totalScore[idx] += game.mancheScore[idx];
            chEnd(game, idx);
        } else {
            chPassTurn(game);
        }
    });

    socket.on('challenge:action-spin', ({ challengeId }) => {
        const game = challengeGames.get(challengeId);
        if (!game) return;
        const idx = game.players.findIndex(p => p.socketId === socket.id);
        if (idx !== game.currentPlayerIdx || game.phase !== 'action') return;
        game.phase = 'spin';
        chBroadcast(game);
        chStartTimer(game);
    });
});

// ===== AI PHRASE GENERATION =====
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const GENERATION_PROMPT = `Sei un autore di puzzle per la trasmissione italiana "Ruota della Fortuna".
Genera esattamente 12 puzzle originali.

MECCANICA DEL PUZZLE:
L'hint è il TEMA o SOGGETTO. La frase lo DESCRIVE, COMPLETA o RACCONTA qualcosa su di esso.
Il concorrente legge prima l'hint — poi deve indovinare la frase lettera per lettera.

ESEMPI DI STILE (solo per capire il tono — NON ricopiare queste frasi, genera frasi originali):
  ERCOLE                 → COMPÌ DODICI FATICHE PER VOLERE DI ERA
  PIRATI DEI CARAIBI     → JACK SPARROW NAVIGA I MARI IN CERCA DI TESORI
  STORIA DEL CALCIO      → PELÈ SEGNÒ IL MILLESIMO GOL IN CARRIERA A SANTOS
  BUROCRAZIA ITALIANA    → PER FARE UN CERTIFICATO SERVONO TRE UFFICI DIVERSI
  FISICA QUANTISTICA     → UN ELETTRONE PUÒ TROVARSI IN DUE POSTI INSIEME

COSA IMPARARE DAGLI ESEMPI:
- Ogni frase ha struttura sintattica DIVERSA — NON usare mai lo stesso schema due volte
- La frase può iniziare con: verbo coniugato (VINSERO, ERA, COMPÌ), sostantivo (KABUL), pronome (CHI)
- La frase NON inizia quasi mai con articolo (IL/LA/I/LE) — evita questo inizio
- La frase usa vocabolario ricco e specifico
- hint e frase insieme formano un pensiero completo — la frase "appartiene" all'hint
- L'hint NON ripete parole chiave della frase
- VIETATO usare schemi fissi tipo "NELLA X È UN..." per tutte le frasi

VARIETÀ TEMATICA: usa almeno 8 temi diversi tra: mitologia, storia, scienza, sport, TV italiana, cinema,
  geografia, cucina, personaggi famosi, cultura pop, natura, curiosità

REGOLE TECNICHE (ogni violazione invalida la frase):
  1. Solo LETTERE MAIUSCOLE e SPAZI — zero punteggiatura, zero numeri, zero anni
  2. Apostrofi → spazio  (L'INGANNO → L INGANNO, DELL'ORO → DELL ORO)
  2b. Il verbo "essere" va scritto SEMPRE con accento: È (non E). La congiunzione "e" (and) rimane E.
  3. Lunghezza frase: MASSIMO 45 caratteri inclusi gli spazi, minimo 27
  4. Minimo 4 parole
  5. Fatti e riferimenti REALI e VERIFICABILI — ortografia italiana corretta
  6. VIETATO usare frasi banali del tipo "X È LA MONTAGNA PIÙ ALTA", "X È LA CAPITALE DI Y", "X È IL PAESE PIÙ GRANDE" — devono raccontare qualcosa di specifico e interessante, non un fatto enciclopedico ovvio
  7. Preferisci fatti curiosi, azioni specifiche, eventi precisi — non definizioni generiche

Rispondi SOLO con questo JSON, zero testo aggiuntivo:
{"frasi": [
  {"frase": "COMPÌ DODICI FATICHE PER VOLERE DI ERA", "hint": "ERCOLE", "difficolta": "medio"},
  ...
]}`;

function validatePhrase(p, debug = false) {
    if (!p.frase || !p.hint) { if (debug) console.log(`  ✗ [mancante] ${p.frase}`); return false; }
    const f = p.frase.trim().toUpperCase();
    if (!/^[A-ZÀÈÉÌÒÙÌ\s]+$/.test(f)) {
        const bad = [...f].filter(c => !/[A-ZÀÈÉÌÒÙÌ\s]/.test(c));
        if (debug) console.log(`  ✗ [caratteri: ${[...new Set(bad)].join('')}] ${f}`);
        return false;
    }
    if (f.length < 27 || f.length > 52) { if (debug) console.log(`  ✗ [${f.length}ch] ${f}`); return false; }
    if (f.split(' ').filter(w => w.length > 0).length < 4) { if (debug) console.log(`  ✗ [<4 parole] ${f}`); return false; }
    return true;
}

app.get('/api/generate-phrases', async (req, res) => {
    if (!GROQ_API_KEY) {
        console.warn('GROQ_API_KEY non configurata — uso database locale');
        return res.json({ phrases: [] });
    }

    try {
        const response = await fetch(GROQ_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'User-Agent': 'cerchiomagico/1.0'
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: [{ role: 'user', content: GENERATION_PROMPT }],
                temperature: 0.7,
                max_tokens: 4096,
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('Groq error:', err);
            return res.json({ phrases: [] });
        }

        const data = await response.json();
        const raw = data.choices?.[0]?.message?.content || '';

        let items = [];
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) items = parsed;
            else {
                const arr = Object.values(parsed).find(v => Array.isArray(v));
                items = arr || [];
            }
        } catch {
            const match = raw.match(/\[[\s\S]*\]/);
            if (match) items = JSON.parse(match[0]);
        }

        const normalized = items.map(p => ({
            ...p,
            frase: (p.frase || '').trim().toUpperCase().replace(/[''`']/g, ' ').replace(/\s+/g, ' ').trim(),
            hint:  (p.hint  || '').trim().toUpperCase().replace(/[''`']/g, ' ').replace(/\s+/g, ' ').trim(),
        }));
        const valid = normalized
            .filter(p => validatePhrase(p, true))
            .map(p => ({ phrase: p.frase, hint: p.hint, difficolta: p.difficolta || 'medio' }));

        console.log(`\nGroq: ${items.length} generate, ${valid.length} valide`);
        valid.forEach((p,i) => console.log(`  ${i+1}. [${p.hint}] ${p.phrase}`));
        res.json({ phrases: valid });

    } catch (err) {
        console.error('generate-phrases error:', err);
        res.json({ phrases: [] });
    }
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

