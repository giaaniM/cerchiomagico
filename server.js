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

// ─── Auth middleware ────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
}

// ─── Auth routes ─────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
    const { username, password, email } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username e password richiesti' });
    if (username.length < 3) return res.status(400).json({ error: 'Username minimo 3 caratteri' });
    if (password.length < 6) return res.status(400).json({ error: 'Password minimo 6 caratteri' });

    const { data: existing } = await supabase.from('users').select('id').eq('username', username).single();
    if (existing) return res.status(409).json({ error: 'Username già in uso' });

    const password_hash = await bcrypt.hash(password, 10);
    const insertData = { username, password_hash };
    if (email && email.trim()) insertData.email = email.trim().toLowerCase();
    const { data: user, error } = await supabase
        .from('users').insert(insertData).select('id, username, avatar_color').single();
    if (error) return res.status(500).json({ error: 'Errore registrazione' });

    await supabase.from('leaderboard_online').insert({ user_id: user.id });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, username: user.username, avatar_color: user.avatar_color } });
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username e password richiesti' });

    const { data: user } = await supabase
        .from('users').select('id, username, password_hash, avatar_color').eq('username', username).single();
    if (!user) return res.status(401).json({ error: 'Credenziali errate' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Credenziali errate' });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, username: user.username, avatar_color: user.avatar_color } });
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
    const { data: user } = await supabase
        .from('users').select('id, username, avatar_color').eq('id', req.user.id).single();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
});

// ─── Friends routes ───────────────────────────────────────────────────────────
app.post('/api/friends/request', authMiddleware, async (req, res) => {
    const { username } = req.body;
    const { data: target } = await supabase.from('users').select('id').eq('username', username).single();
    if (!target) return res.status(404).json({ error: 'Utente non trovato' });
    if (target.id === req.user.id) return res.status(400).json({ error: 'Non puoi aggiungere te stesso' });

    const { error } = await supabase.from('friendships')
        .insert({ user_id: req.user.id, friend_id: target.id });
    if (error) return res.status(409).json({ error: 'Richiesta già inviata' });
    res.json({ ok: true });
});

app.post('/api/friends/accept', authMiddleware, async (req, res) => {
    const { friendId } = req.body;
    const { error } = await supabase.from('friendships')
        .update({ status: 'accepted' })
        .eq('user_id', friendId).eq('friend_id', req.user.id);
    if (error) return res.status(500).json({ error: 'Errore' });
    // Create reverse friendship
    await supabase.from('friendships').upsert({ user_id: req.user.id, friend_id: friendId, status: 'accepted' });
    res.json({ ok: true });
});

app.get('/api/friends', authMiddleware, async (req, res) => {
    const { data } = await supabase
        .from('friendships')
        .select('friend_id, status, users!friendships_friend_id_fkey(username, avatar_color)')
        .eq('user_id', req.user.id);
    res.json({ friends: data || [] });
});

app.get('/api/friends/requests', authMiddleware, async (req, res) => {
    const { data } = await supabase
        .from('friendships')
        .select('user_id, users!friendships_user_id_fkey(username, avatar_color)')
        .eq('friend_id', req.user.id).eq('status', 'pending');
    res.json({ requests: data || [] });
});

// ─── Leaderboard online ───────────────────────────────────────────────────────
app.get('/api/leaderboard/online', async (req, res) => {
    const { data } = await supabase
        .from('leaderboard_online')
        .select('wins, losses, total_score, users(username, avatar_color)')
        .order('wins', { ascending: false })
        .limit(50);
    res.json({ leaderboard: data || [] });
});

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

// ─── Challenge game engine ────────────────────────────────────────────────────
const CHALLENGE_SEGMENTS = [
    300, 200, 700, 500, 'PASSA', 1000,
    'CROLLO', 350, 300, 450, 700, 'PASSA',
    'RADDOPPIA', 'PASSA', 800, 300, 600, 500,
    'SCUDO', 300, 500, 200, 'PASSA', 200
];

const challengeGames = new Map(); // challengeId → gameState
const userSockets   = new Map(); // userId → socketId

function spinWheel() {
    const idx = Math.floor(Math.random() * CHALLENGE_SEGMENTS.length);
    return CHALLENGE_SEGMENTS[idx];
}

function buildCells(phrase, revealed) {
    return phrase.split('').map((ch, i) => {
        if (ch === ' ') return { type: 'space' };
        if (revealed.has(i)) return { type: 'letter', ch };
        return { type: 'hidden' };
    });
}

function isComplete(phrase, revealed) {
    return phrase.split('').every((ch, i) => ch === ' ' || revealed.has(i));
}

function startTurnTimer(game) {
    clearTurnTimer(game);
    game.timerValue = 10;
    game.timer = setInterval(() => {
        game.timerValue--;
        io.to(`challenge:${game.id}`).emit('challenge:timer', { seconds: game.timerValue });
        if (game.timerValue <= 0) {
            clearTurnTimer(game);
            passTurn(game);
        }
    }, 1000);
}

function clearTurnTimer(game) {
    if (game.timer) { clearInterval(game.timer); game.timer = null; }
}

function passTurn(game) {
    game.mancheScore[game.currentPlayerIdx] = 0;
    game.currentPlayerIdx = 1 - game.currentPlayerIdx;
    game.phase = 'spin';
    game.currentSpinValue = null;
    broadcastState(game);
    startTurnTimer(game);
}

function broadcastState(game) {
    io.to(`challenge:${game.id}`).emit('challenge:state', {
        cells: buildCells(game.puzzle.phrase, game.revealed),
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

async function startChallengeGame(game) {
    const lang = game.lang || 'it';
    const { data: puzzles } = await supabase.from('puzzles').select('id, phrase, hint').eq('lang', lang).eq('active', true);
    if (!puzzles || !puzzles.length) return;
    const puzzle = puzzles[Math.floor(Math.random() * puzzles.length)];
    game.puzzle = puzzle;
    game.revealed = new Set();
    game.usedLetters = new Set();
    game.phase = 'spin';
    game.currentSpinValue = null;
    game.mancheScore = [0, 0];
    game.totalScore = [0, 0];
    game.timerValue = 10;
    game.timer = null;
    io.to(`challenge:${game.id}`).emit('challenge:started', {
        players: game.players.map(p => ({ username: p.username }))
    });
    broadcastState(game);
    startTurnTimer(game);
}

async function endChallenge(game, winnerIdx) {
    clearTurnTimer(game);
    const winner = game.players[winnerIdx];
    const loser  = game.players[1 - winnerIdx];

    await supabase.from('challenges').update({
        status: 'completed',
        winner_id: winner.userId,
        challenger_score: game.totalScore[0],
        opponent_score: game.totalScore[1],
        completed_at: new Date().toISOString()
    }).eq('id', game.id);

    // Update leaderboard
    for (let i = 0; i < 2; i++) {
        const p = game.players[i];
        const isWinner = i === winnerIdx;
        await supabase.from('leaderboard_online').upsert({
            user_id: p.userId,
            wins: isWinner ? 1 : 0,
            losses: isWinner ? 0 : 1,
            total_score: game.totalScore[i]
        }, {
            onConflict: 'user_id',
            ignoreDuplicates: false
        });
        // Raw SQL increment
        await supabase.rpc ? null : null; // increment handled via separate update below
    }
    // Increment wins/losses properly
    if (winner.userId) {
        await supabase.from('leaderboard_online')
            .update({ wins: supabase.raw ? undefined : undefined })
            .eq('user_id', winner.userId);
        // Use raw SQL increment
        const { createClient: cc } = require('@supabase/supabase-js');
        // Simple approach: fetch then update
        const { data: wRow } = await supabase.from('leaderboard_online').select('wins,losses,total_score').eq('user_id', winner.userId).single();
        if (wRow) await supabase.from('leaderboard_online').update({ wins: (wRow.wins||0)+1, total_score: (wRow.total_score||0)+game.totalScore[winnerIdx] }).eq('user_id', winner.userId);
        const { data: lRow } = await supabase.from('leaderboard_online').select('wins,losses,total_score').eq('user_id', loser.userId).single();
        if (lRow) await supabase.from('leaderboard_online').update({ losses: (lRow.losses||0)+1, total_score: (lRow.total_score||0)+game.totalScore[1-winnerIdx] }).eq('user_id', loser.userId);
    }

    io.to(`challenge:${game.id}`).emit('challenge:game-over', {
        winnerIdx,
        winner: winner.username,
        totalScore: game.totalScore,
        players: game.players.map(p => ({ username: p.username }))
    });
    setTimeout(() => challengeGames.delete(game.id), 60000);
}

// ─── Socket.io connection handling ───────────────────────────────────────────
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

    // ─── Challenge socket events ────────────────────────────────────────────
    socket.on('challenge:auth', ({ token }) => {
        try {
            const payload = jwt.verify(token, JWT_SECRET);
            socket.userId   = payload.id;
            socket.username = payload.username;
            userSockets.set(payload.id, socket.id);
            socket.emit('challenge:auth-ok');
        } catch {
            socket.emit('challenge:auth-err');
        }
    });

    socket.on('challenge:send', async ({ opponentId }) => {
        if (!socket.userId) return;
        const { data: challenge, error } = await supabase.from('challenges')
            .insert({ challenger_id: socket.userId, opponent_id: opponentId, status: 'pending' })
            .select().single();
        if (error) return socket.emit('challenge:error', 'Errore creazione sfida');

        const opponentSocket = userSockets.get(opponentId);
        if (opponentSocket) {
            io.to(opponentSocket).emit('challenge:invite', {
                challengeId: challenge.id,
                from: socket.username
            });
        }
        socket.emit('challenge:sent', { challengeId: challenge.id });
    });

    socket.on('challenge:accept', async ({ challengeId }) => {
        if (!socket.userId) return;
        const { data: ch } = await supabase.from('challenges').select('*').eq('id', challengeId).single();
        if (!ch || ch.opponent_id !== socket.userId) return;

        await supabase.from('challenges').update({ status: 'active' }).eq('id', challengeId);

        const { data: challenger } = await supabase.from('users').select('id, username').eq('id', ch.challenger_id).single();
        const { data: opponent }   = await supabase.from('users').select('id, username').eq('id', ch.opponent_id).single();

        const game = {
            id: challengeId,
            lang: ch.lang || 'it',
            players: [
                { userId: challenger.id, socketId: userSockets.get(challenger.id), username: challenger.username, shield: false },
                { userId: opponent.id,   socketId: socket.id, username: opponent.username, shield: false }
            ],
            currentPlayerIdx: 0,
            puzzle: null, revealed: null, usedLetters: null,
            phase: 'spin', currentSpinValue: null,
            mancheScore: [0, 0], totalScore: [0, 0],
            timer: null, timerValue: 10
        };
        challengeGames.set(challengeId, game);

        // Both join the room
        socket.join(`challenge:${challengeId}`);
        const challengerSocket = userSockets.get(challenger.id);
        if (challengerSocket) io.sockets.sockets.get(challengerSocket)?.join(`challenge:${challengeId}`);

        await startChallengeGame(game);
    });

    socket.on('challenge:decline', async ({ challengeId }) => {
        if (!socket.userId) return;
        await supabase.from('challenges').update({ status: 'declined' }).eq('id', challengeId);
        const { data: ch } = await supabase.from('challenges').select('challenger_id').eq('id', challengeId).single();
        if (ch) {
            const challengerSocket = userSockets.get(ch.challenger_id);
            if (challengerSocket) io.to(challengerSocket).emit('challenge:declined', { challengeId });
        }
    });

    socket.on('challenge:spin', ({ challengeId }) => {
        if (!socket.userId) return;
        const game = challengeGames.get(challengeId);
        if (!game || game.phase !== 'spin') return;
        if (game.players[game.currentPlayerIdx].userId !== socket.userId) return;

        clearTurnTimer(game);
        const value = spinWheel();
        game.currentSpinValue = value;

        if (value === 'PASSA') {
            io.to(`challenge:${game.id}`).emit('challenge:spin-result', { value, label: 'PASSA' });
            setTimeout(() => passTurn(game), 1500);
        } else if (value === 'CROLLO') {
            const p = game.players[game.currentPlayerIdx];
            if (p.shield) {
                p.shield = false;
                io.to(`challenge:${game.id}`).emit('challenge:spin-result', { value, label: 'CROLLO', shielded: true });
                game.phase = 'spin';
                broadcastState(game);
                setTimeout(() => startTurnTimer(game), 1800);
            } else {
                game.mancheScore[game.currentPlayerIdx] = 0;
                io.to(`challenge:${game.id}`).emit('challenge:spin-result', { value, label: 'CROLLO' });
                setTimeout(() => passTurn(game), 1500);
            }
        } else if (value === 'SCUDO') {
            game.players[game.currentPlayerIdx].shield = true;
            io.to(`challenge:${game.id}`).emit('challenge:spin-result', { value, label: 'SCUDO' });
            game.phase = 'spin';
            broadcastState(game);
            setTimeout(() => startTurnTimer(game), 1800);
        } else if (value === 'RADDOPPIA') {
            game.mancheScore[game.currentPlayerIdx] *= 2;
            io.to(`challenge:${game.id}`).emit('challenge:spin-result', { value, label: 'RADDOPPIA' });
            game.phase = 'consonant';
            broadcastState(game);
            setTimeout(() => startTurnTimer(game), 1800);
        } else {
            // Numeric
            io.to(`challenge:${game.id}`).emit('challenge:spin-result', { value, label: `${value}€` });
            game.phase = 'consonant';
            broadcastState(game);
            setTimeout(() => startTurnTimer(game), 1800);
        }
    });

    socket.on('challenge:consonant', ({ challengeId, letter }) => {
        if (!socket.userId) return;
        const game = challengeGames.get(challengeId);
        if (!game || game.phase !== 'consonant') return;
        if (game.players[game.currentPlayerIdx].userId !== socket.userId) return;

        clearTurnTimer(game);
        const L = letter.toUpperCase();
        if (game.usedLetters.has(L)) { startTurnTimer(game); return; }
        game.usedLetters.add(L);

        const phrase = game.puzzle.phrase;
        let count = 0;
        phrase.split('').forEach((ch, i) => {
            if (ch === L) { game.revealed.add(i); count++; }
        });

        if (count > 0) {
            const spinVal = typeof game.currentSpinValue === 'number' ? game.currentSpinValue : 300;
            game.mancheScore[game.currentPlayerIdx] += spinVal * count;
            game.phase = 'action';
            if (isComplete(phrase, game.revealed)) {
                game.totalScore[game.currentPlayerIdx] += game.mancheScore[game.currentPlayerIdx];
                broadcastState(game);
                setTimeout(() => endChallenge(game, game.currentPlayerIdx), 2000);
                return;
            }
        } else {
            game.phase = 'spin';
            broadcastState(game);
            setTimeout(() => passTurn(game), 1500);
            return;
        }
        broadcastState(game);
        startTurnTimer(game);
    });

    socket.on('challenge:vowel', ({ challengeId, letter }) => {
        if (!socket.userId) return;
        const game = challengeGames.get(challengeId);
        if (!game || game.phase !== 'action') return;
        if (game.players[game.currentPlayerIdx].userId !== socket.userId) return;
        if (game.mancheScore[game.currentPlayerIdx] < 1000) return;

        clearTurnTimer(game);
        const L = letter.toUpperCase();
        if (game.usedLetters.has(L)) { startTurnTimer(game); return; }
        game.usedLetters.add(L);
        game.mancheScore[game.currentPlayerIdx] -= 1000;

        const phrase = game.puzzle.phrase;
        phrase.split('').forEach((ch, i) => {
            if (ch === L) game.revealed.add(i);
        });

        if (isComplete(phrase, game.revealed)) {
            game.totalScore[game.currentPlayerIdx] += game.mancheScore[game.currentPlayerIdx];
            broadcastState(game);
            setTimeout(() => endChallenge(game, game.currentPlayerIdx), 2000);
            return;
        }
        broadcastState(game);
        startTurnTimer(game);
    });

    socket.on('challenge:solve', ({ challengeId, solution }) => {
        if (!socket.userId) return;
        const game = challengeGames.get(challengeId);
        if (!game) return;
        if (game.players[game.currentPlayerIdx].userId !== socket.userId) return;

        clearTurnTimer(game);
        const correct = solution.toUpperCase().trim() === game.puzzle.phrase.trim();
        if (correct) {
            game.totalScore[game.currentPlayerIdx] += game.mancheScore[game.currentPlayerIdx];
            broadcastState(game);
            setTimeout(() => endChallenge(game, game.currentPlayerIdx), 2000);
        } else {
            io.to(`challenge:${game.id}`).emit('challenge:solve-wrong', { by: socket.username });
            setTimeout(() => passTurn(game), 1500);
        }
    });

    socket.on('challenge:action-spin', ({ challengeId }) => {
        if (!socket.userId) return;
        const game = challengeGames.get(challengeId);
        if (!game || game.phase !== 'action') return;
        if (game.players[game.currentPlayerIdx].userId !== socket.userId) return;
        game.phase = 'spin';
        game.currentSpinValue = null;
        broadcastState(game);
        startTurnTimer(game);
    });

    // Disconnect handling
    socket.on('disconnect', () => {
        const online = io.engine.clientsCount;
        console.log(`[CONN] -1 disconnesso | online: ${online} | id: ${socket.id}`);
        // Clean up user socket mapping
        if (socket.userId) userSockets.delete(socket.userId);
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

