#!/usr/bin/env python3
"""
Phrase generation tester (Groq) — prompt tuning tool.
Usage: python3 scripts/test_prompt.py [--runs N]
"""

import os, re, json, sys, time, urllib.request, urllib.error

# ── Config ────────────────────────────────────────────────────────────────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL   = os.getenv("GROQ_MODEL", "gemma2-9b-it")
GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions"

RUNS = int(sys.argv[sys.argv.index("--runs") + 1]) if "--runs" in sys.argv else 1

# ── Prompt ────────────────────────────────────────────────────────────────────
PROMPT_BASE = """Sei un autore di puzzle per la trasmissione italiana "Ruota della Fortuna".
Genera esattamente 12 puzzle originali.

MECCANICA DEL PUZZLE:
L'hint è il TEMA o SOGGETTO. La frase lo DESCRIVE, COMPLETA o RACCONTA qualcosa su di esso.
Il concorrente legge prima l'hint — poi deve indovinare la frase lettera per lettera.

ESEMPI DI STILE (solo per capire il tono — NON ricopiare queste frasi, genera frasi originali):
  ERCOLE                 → COMPÌ DODICI FATICHE PER VOLERE DI ERA
  PIRATI DEI CARAIBI     → JACK SPARROW NAVIGA I MARI IN CERCA DI TESORI
  STORIA DEL CALCIO      → PELE SEGNÒ IL MILLESIMO GOL IN CARRIERA A SANTOS
  BUROCRAZIA ITALIANA    → PER FARE UN CERTIFICATO SERVONO TRE UFFICI DIVERSI
  FISICA QUANTISTICA     → UN ELETTRONE PUO TROVARSI IN DUE POSTI INSIEME

COSA IMPARARE DAGLI ESEMPI:
- Ogni frase ha struttura sintattica DIVERSA — NON usare mai lo stesso schema due volte
- La frase può iniziare con: verbo coniugato (VINSERO, ERA, USO, RACCONTA), sostantivo (KABUL), pronome (CHI)
- La frase NON inizia quasi mai con articolo (IL/LA/I/LE) — evita questo inizio
- La frase usa vocabolario ricco e specifico: FOGA, OLTREPASSANDO, DICHIARATI, INGANNO, ELETTRIZZANTI
- L'hint può essere: nome proprio, titolo show/film, frase celebre, termine tecnico, parola inglese, contesto storico
- hint e frase insieme formano un pensiero completo — la frase "appartiene" all'hint
- L'hint NON ripete parole chiave della frase
- VIETATO usare schemi fissi tipo "NELLA X E UN..." o "E IL/LA..." per tutte le frasi

VARIETÀ SINTATTICA obbligatoria — esempi di inizi diversi da distribuire:
  verbo passato: "VINSERO...", "DISSE...", "USO...", "COSTRUIRONO..."
  verbo presente: "RACCONTA...", "VIVE...", "PRODUCE..."
  sostantivo diretto: "KABUL E LA CAPITALE...", "THOR E FIGLIO DI..."
  pronome/congiunzione: "CHI CONOSCE...", "QUANDO ARRIVI..."
  complemento: "I CIBI VANNO...", "LE STELLE CADENTI..."

VARIETÀ TEMATICA: usa almeno 8 temi diversi tra: mitologia, storia, scienza, sport, TV italiana, cinema,
  geografia, cucina, personaggi famosi, cultura pop, proverbi/modi di dire, natura, curiosità

REGOLE TECNICHE (ogni violazione invalida la frase):
  1. Solo LETTERE MAIUSCOLE e SPAZI — zero punteggiatura, zero numeri, zero anni
  2. Apostrofi → spazio  (L'INGANNO → L INGANNO, DELL'ORO → DELL ORO)
  2b. Il verbo "essere" va scritto SEMPRE con accento: È (non E). Esempi: "KABUL È LA CAPITALE", "THOR È FIGLIO DI ODINO". La congiunzione "e" (and) rimane E senza accento.
  3. Lunghezza frase: MASSIMO 45 caratteri inclusi gli spazi, minimo 27. CONTA i caratteri prima di scrivere.
  4. Minimo 4 parole
  5. Fatti e riferimenti REALI e VERIFICABILI — ortografia italiana corretta
  6. VIETATO usare frasi banali del tipo "X È LA MONTAGNA PIÙ ALTA", "X È LA CAPITALE DI Y", "X È IL PAESE PIÙ GRANDE" — devono raccontare qualcosa di specifico e interessante, non un fatto enciclopedico ovvio
  7. Preferisci fatti curiosi, azioni specifiche, eventi precisi — non definizioni generiche
  6. Non usare mai anni o cifre — scrivi i numeri in lettere se necessario (MILLE non 1000)

Rispondi SOLO con questo JSON, zero testo aggiuntivo:
{"frasi": [
  {"frase": "USO L INGANNO PER CONCLUDERE LA GUERRA E FU PUNITO", "hint": "ULISSE", "difficolta": "medio"},
  ...
]}"""

def build_prompt(used_hints=None):
    p = PROMPT_BASE
    if used_hints:
        exclusions = ", ".join(used_hints[-20:])
        p += f"\n\nHINT GIÀ USATI (NON RIPETERE questi temi): {exclusions}"
    return p

# ── Validation (mirrors server.js logic) ─────────────────────────────────────
VALID_RE = re.compile(r'^[A-ZÀÈÉÌÒÙÌ\s]+$')

def normalize(frase: str) -> str:
    s = frase.strip().upper()
    s = re.sub(r"[''`’‘]", ' ', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def validate(p: dict) -> tuple:
    reasons = []
    raw_frase = p.get("frase", "")
    raw_hint  = p.get("hint", "")
    if not raw_frase or not raw_hint:
        reasons.append("frase o hint mancante")
        return False, reasons

    f = normalize(raw_frase)
    if not VALID_RE.match(f):
        bad = set(c for c in f if not re.match(r'[A-ZÀÈÉÌÒÙÌ\s]', c))
        reasons.append(f"caratteri non validi: {bad}")
    if len(f) < 27 or len(f) > 52:
        reasons.append(f"lunghezza {len(f)} (limite 27-52, target ≤45)")
    words = [w for w in f.split(' ') if w]
    if len(words) < 4:
        reasons.append(f"solo {len(words)} parole (min 3)")

    return len(reasons) == 0, reasons

# ── Groq call ─────────────────────────────────────────────────────────────────
def call_groq(prompt: str) -> tuple:
    payload = json.dumps({
        "model": GROQ_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
        "max_tokens": 8192,
        "response_format": {"type": "json_object"}
    }).encode()

    req = urllib.request.Request(GROQ_URL, data=payload, headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "User-Agent": "python-requests/2.31.0"
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return [], f"HTTP {e.code}: {e.read().decode()}"

    raw = data.get("choices", [{}])[0].get("message", {}).get("content", "")

    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return parsed, ""
        for v in parsed.values():
            if isinstance(v, list):
                return v, ""
        return [], f"JSON senza array: {raw[:300]}"
    except json.JSONDecodeError:
        m = re.search(r'\[[\s\S]*\]', raw)
        if m:
            try:
                return json.loads(m.group()), ""
            except Exception:
                pass
        return [], f"Parse error — raw: {raw[:300]}"

# ── Pretty print ──────────────────────────────────────────────────────────────
RESET  = "\033[0m"
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
DIM    = "\033[2m"

def bar(ratio: float, width: int = 20) -> str:
    filled = round(ratio * width)
    return "█" * filled + "░" * (width - filled)

# ── Main ──────────────────────────────────────────────────────────────────────
def run_once(run_n: int, used_hints=None) -> dict:
    print(f"\n{BOLD}{CYAN}━━━ RUN {run_n} [{GROQ_MODEL}] ━━━{RESET}")
    t0 = time.time()
    phrases, err = call_groq(build_prompt(used_hints))
    elapsed = time.time() - t0

    if err:
        print(f"{RED}Errore: {err}{RESET}")
        return {"generated": 0, "valid": 0, "phrases": []}

    print(f"{DIM}API: {elapsed:.1f}s  |  Frasi ricevute: {len(phrases)}{RESET}\n")

    valid_phrases = []
    invalid_phrases = []

    for p in phrases:
        ok, reasons = validate(p)
        f_norm = normalize(p.get("frase", ""))
        hint   = normalize(p.get("hint", ""))
        diff   = p.get("difficolta", "?")
        length = len(f_norm)

        if ok:
            valid_phrases.append(p)
            detail = f"{DIM}[{length}ch] [{diff}]{RESET}"
            print(f"  {GREEN}✓{RESET} {BOLD}{f_norm}{RESET}")
            print(f"     hint: {CYAN}{hint}{RESET}  {detail}")
        else:
            invalid_phrases.append((p, reasons))
            raw = p.get("frase", "")
            print(f"  {RED}✗{RESET} {DIM}{raw}{RESET}")
            for r in reasons:
                print(f"     {YELLOW}→ {r}{RESET}")

    n_gen   = len(phrases)
    n_valid = len(valid_phrases)
    ratio   = n_valid / n_gen if n_gen else 0

    print(f"\n{BOLD}Risultato:{RESET} {GREEN}{n_valid}{RESET}/{n_gen} valide  "
          f"{bar(ratio)}  {round(ratio*100)}%")

    return {"generated": n_gen, "valid": n_valid, "phrases": valid_phrases}

def main():
    if not GROQ_API_KEY:
        print(f"{RED}GROQ_API_KEY non impostata{RESET}")
        sys.exit(1)

    all_results = []
    used_hints = []
    for i in range(1, RUNS + 1):
        result = run_once(i, used_hints)
        all_results.append(result)
        for p in result["phrases"]:
            h = normalize(p.get("hint", ""))
            if h:
                used_hints.append(h)
        if i < RUNS:
            time.sleep(2)

    if RUNS > 1:
        total_gen   = sum(r["generated"] for r in all_results)
        total_valid = sum(r["valid"] for r in all_results)
        ratio = total_valid / total_gen if total_gen else 0
        print(f"\n{BOLD}{'━'*40}")
        print(f"TOTALE {RUNS} run: {GREEN}{total_valid}{RESET}/{total_gen} valide  "
              f"{bar(ratio)}  {round(ratio*100)}%{RESET}")
        print(f"Media per run: {total_valid/RUNS:.1f} frasi valide")

if __name__ == "__main__":
    main()
