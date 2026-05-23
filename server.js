require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

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

