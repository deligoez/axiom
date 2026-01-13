# Chorus Manuel QA Test Planı (Incremental)

**Tarih:** 2026-01-13
**Durum:** AKTIF
**Dil:** Türkçe (geçici plan)

---

## Felsefe: Incremental Testing

Her adımda **minimum setup** ile **maximum test coverage** hedefleniyor.
Dallanma noktalarında farklı yollar farklı test gruplarını açar.

```
[Base] ─────────────────────────────────────────────────────────────►
   │
   ├─► [A0: CLI Tests] ✓
   │
   └─► [A1: Git Repo] ─────────────────────────────────────────────►
          │
          ├─► [B1: Init Mode] ─────────────────────────────────────►
          │        │
          │        └─► [C1: Full Wizard] ── Planning ── Implementation
          │
          └─► [B2: Bypass Init] ───────────────────────────────────►
                   │
                   ├─► [C2: Manual Tasks] ── TaskPanel, Navigation
                   │
                   └─► [C3: E2E Fixtures] ── PTY Tests, Agent Grid
```

---

## ADIM 0: Base Setup (Minimum)

```bash
# Sadece alias gerekli
alias chorus="npx tsx /path/to/chorus/src/index.tsx"
# veya
alias chorus="node /path/to/chorus/dist/index.js"
```

### Açılan Testler: CLI Temel

| # | Komut | Beklenen | ✓ |
|---|-------|----------|---|
| 1 | `chorus --version` | `0.1.0` | ☐ |
| 2 | `chorus -v` | `0.1.0` | ☐ |
| 3 | `chorus --help` | USAGE, OPTIONS, EXAMPLES | ☐ |
| 4 | `chorus -h` | Aynı help | ☐ |
| 5 | `chorus --bilinmeyen` | Help gösterir (crash yok) | ☐ |
| 6 | `chorus garip-komut` | Help gösterir | ☐ |

**Bu adımda durabilirsin.** CLI temel davranışı test edildi.

---

## ADIM 1: Git Repo Oluştur

```bash
mkdir ~/qa-test && cd ~/qa-test
git init
git commit --allow-empty -m "init"
```

### Açılan Testler: Init Mode Başlangıcı

| # | Test | Komut/Senaryo | ✓ |
|---|------|---------------|---|
| 7 | Init tetiklenir | `chorus` (.chorus yok) | ☐ |
| 8 | Prerequisite check | "Checking..." mesajı görünür | ☐ |
| 9 | Git tespit edilir | ✓ Git başarılı | ☐ |
| 10 | Node version check | v20+ | ☐ |

**Bu adımda durabilirsin.** Init mode başlıyor mu?

---

## DALLANMA NOKTASI A: Init Wizard mı, Bypass mı?

### YOL A1: Init Wizard'ı Tamamla

Init wizard'dan geçerek **tam akış** test edilir.

```bash
# chorus çalıştır ve wizard'ı takip et
chorus
# → Project type tespiti
# → Quality commands (test, lint, build)
# → Plan review config
# → "Meet the team?" sorusu
```

#### Açılan Testler: Wizard Adımları

| # | Test | Kontrol | ✓ |
|---|------|---------|---|
| 11 | ProjectDetector | Proje tipi otomatik tespit | ☐ |
| 12 | QualityCommands | Test/lint/build input'ları | ☐ |
| 13 | PlanReviewConfig | Auto-approve threshold | ☐ |
| 14 | AgentIntro | "Meet the team?" y/n | ☐ |
| 15 | Config yazılır | `.chorus/config.json` oluşur | ☐ |
| 16 | State yazılır | `.chorus/planning-state.json` | ☐ |

**Wizard sonrası Planning Mode'a geçilir** → Yol A1-C1'e devam

---

### YOL A2: Init Bypass (Hızlı)

Manuel olarak `.chorus/` oluştur, wizard'ı atla.

```bash
mkdir -p .chorus
cat > .chorus/config.json << 'EOF'
{
  "qualityCommands": {
    "testCommand": "npm test",
    "lintCommand": "npm run lint"
  }
}
EOF
```

#### A2-B1: Sadece Config ile

```bash
# Şimdi chorus çalıştır
chorus
```

**Sonuç:** Init atlanır, direkt **Planning Mode** başlar.

#### A2-B2: Implementation Mode'a Direkt Git

```bash
cat > .chorus/planning-state.json << 'EOF'
{
  "status": "implementation",
  "chosenMode": "semi-auto",
  "planSummary": { "userGoal": "Test", "estimatedTasks": 1 },
  "tasks": [],
  "reviewIterations": []
}
EOF
```

**Sonuç:** Direkt **Implementation Mode** açılır.

#### Açılan Testler: Implementation Layout

| # | Test | Kontrol | ✓ |
|---|------|---------|---|
| 17 | TwoColumnLayout | Sol: TaskPanel, Sağ: AgentGrid | ☐ |
| 18 | Header bar | Mode göstergesi (SEMI-AUTO) | ☐ |
| 19 | Footer bar | Kısayollar görünür | ☐ |
| 20 | Help panel | `?` açıp kapatır | ☐ |
| 21 | Quit | `q` çıkış yapar | ☐ |

---

## DALLANMA NOKTASI B: Task Nereden Gelecek?

### YOL B1: Manuel Task Oluştur

```bash
mkdir -p .chorus
cat > .chorus/tasks.jsonl << 'EOF'
{"id":"ch-test1","title":"İlk Test Task","status":"open","priority":1}
{"id":"ch-test2","title":"İkinci Task","status":"open","priority":2}
{"id":"ch-test3","title":"Üçüncü Task","status":"in_progress","priority":1}
EOF
```

#### Açılan Testler: TaskPanel + Navigation

| # | Test | Kontrol | ✓ |
|---|------|---------|---|
| 22 | Tasks (3) header | Task sayısı doğru | ☐ |
| 23 | Status göstergeleri | → open, ● in_progress | ☐ |
| 24 | `j` tuşu | Aşağı hareket | ☐ |
| 25 | `k` tuşu | Yukarı hareket | ☐ |
| 26 | `1-9` tuşları | Quick select | ☐ |
| 27 | Selection highlight | Seçili task belirgin | ☐ |
| 28 | TaskSummaryStats | "X done, Y running, Z pending" | ☐ |

---

### YOL B2: E2E Test Fixture Kullan

Test fixture'larını kullanarak otomatik testlerin yaptığını manuel yap.

```bash
# e2e-fixtures.ts'deki createTestProject mantığı:
mkdir -p .chorus

# Implementation state
cat > .chorus/planning-state.json << 'EOF'
{
  "status": "implementation",
  "chosenMode": "semi-auto",
  "planSummary": { "userGoal": "QA Test", "estimatedTasks": 5 },
  "tasks": [],
  "reviewIterations": []
}
EOF

# Çeşitli status'lerde tasklar
cat > .chorus/tasks.jsonl << 'EOF'
{"id":"ch-qa1","title":"Open Task","status":"open","priority":1}
{"id":"ch-qa2","title":"Running Task","status":"in_progress","priority":1}
{"id":"ch-qa3","title":"Done Task","status":"closed","priority":2}
{"id":"ch-qa4","title":"Blocked Task","status":"blocked","priority":1}
{"id":"ch-qa5","title":"Review Task","status":"review","priority":1}
EOF
```

#### Açılan Testler: Tüm Status Göstergeleri

| # | Status | Gösterge | ✓ |
|---|--------|----------|---|
| 29 | open | → | ☐ |
| 30 | in_progress | ● | ☐ |
| 31 | closed | ✓ | ☐ |
| 32 | blocked | ⊗ | ☐ |
| 33 | review | (özel gösterge) | ☐ |

---

## DALLANMA NOKTASI C: Hangi Mode?

### YOL C1: Semi-Auto Mode Testleri

Semi-auto mode'da kullanıcı kontrol eder.

```bash
# planning-state.json'da:
"chosenMode": "semi-auto"
```

#### Açılan Testler: Semi-Auto Kontrolleri

| # | Test | Tuş | Kontrol | ✓ |
|---|------|-----|---------|---|
| 34 | Mode göstergesi | - | SEMI-AUTO yazısı | ☐ |
| 35 | Manuel task assign | Enter | Task seçip agent başlat | ☐ |
| 36 | Agent durur | - | Task bitince bekler | ☐ |
| 37 | Mode toggle | `m` | Autopilot'a geç | ☐ |

---

### YOL C2: Autopilot Mode Testleri

```bash
# planning-state.json'da:
"chosenMode": "autopilot"
```

#### Açılan Testler: Autopilot Davranışı

| # | Test | Kontrol | ✓ |
|---|------|---------|---|
| 38 | Mode göstergesi | AUTOPILOT yazısı | ☐ |
| 39 | Otomatik başlama | Open task varsa agent başlar | ☐ |
| 40 | Zincirleme | Biten sonraki task'a geçer | ☐ |
| 41 | Pause | Space ile durdurur | ☐ |

---

## DALLANMA NOKTASI D: Agent Testleri

**Not:** Bu testler için **Claude CLI** kurulu olmalı.

```bash
which claude  # Kurulu mu?
```

### YOL D1: Agent Spawn (Claude CLI Yok)

Claude CLI yoksa agent spawn edilemez ama UI testleri yapılabilir.

| # | Test | Kontrol | ✓ |
|---|------|---------|---|
| 42 | Enter basınca | Hata mesajı (Claude not found) | ☐ |
| 43 | AgentGrid boş | Empty slots görünür | ☐ |

---

### YOL D2: Agent Spawn (Claude CLI Var)

```bash
# Task seç ve Enter bas
```

#### Açılan Testler: Agent Lifecycle

| # | Test | Kontrol | ✓ |
|---|------|---------|---|
| 44 | Worktree oluşur | `.worktrees/claude-ch-xxx` | ☐ |
| 45 | Branch oluşur | `agent/claude/ch-xxx` | ☐ |
| 46 | AgentTile görünür | Grid'de tile | ☐ |
| 47 | Output stream | Real-time output | ☐ |
| 48 | Progress bar | İlerleme gösterir | ☐ |

---

## DALLANMA NOKTASI E: Intervention Testleri

Agent çalışırken intervention testleri.

```bash
# Agent çalışırken 'i' tuşuna bas
```

### Açılan Testler: Intervention Panel

| # | Test | Tuş | Kontrol | ✓ |
|---|------|-----|---------|---|
| 49 | Panel açılır | `i` | Sarı border panel | ☐ |
| 50 | Panel kapanır | `Esc` | Normal view | ☐ |
| 51 | Pause | `p` | (PAUSED) göstergesi | ☐ |
| 52 | Resume | `p` | Devam eder | ☐ |
| 53 | Stop agent | `x` + # | Agent durur | ☐ |
| 54 | Redirect | `r` + # + # | Yeni task'a yönlendir | ☐ |

---

## OTOMATIK TESTLERİ MANUEL ÇALIŞTIR

### E2E Testleri (PTY)

```bash
# Tüm E2E testleri (forks pool, sequential)
npm run test:e2e

# Tek bir E2E test dosyası
npx vitest run src/e2e/task-navigation.e2e.test.ts --config vitest.e2e.config.ts

# Belirli test
npx vitest run -t "j key moves selection" --config vitest.e2e.config.ts
```

| E2E Test Dosyası | Ne Test Eder | Manuel Run | ✓ |
|------------------|--------------|------------|---|
| `task-navigation.e2e.test.ts` | j/k navigation | ☐ | ☐ |
| `intervention-menu-pty.e2e.test.ts` | i panel, Tab, 1-9 | ☐ | ☐ |
| `personas.e2e.test.ts` | AgentGrid, L toggle | ☐ | ☐ |
| `single-review.e2e.test.ts` | R review mode | ☐ | ☐ |
| `batch-review.e2e.test.ts` | Toplu review | ☐ | ☐ |
| `auto-approve.e2e.test.ts` | Auto approve | ☐ | ☐ |
| `feedback-flow.e2e.test.ts` | Feedback save | ☐ | ☐ |
| `tsx-runtime.e2e.test.ts` | CLI flags | ☐ | ☐ |
| `label-rules.e2e.test.ts` | Label filtering | ☐ | ☐ |

---

### Integration Testleri (Gerçek Claude API)

**⚠️ DİKKAT:** Bu testler gerçek Claude API çağrısı yapar!

```bash
# Tüm integration testleri
npm run test:integration

# Tek dosya
npx vitest run src/integration/claude-cli.integration.test.ts --config vitest.integration.config.ts
```

| Integration Test | Ne Test Eder | Manuel Run | ✓ |
|------------------|--------------|------------|---|
| `claude-cli.integration.test.ts` | CLI spawn | ☐ | ☐ |
| `file-operations.integration.test.ts` | Dosya okuma/yazma | ☐ | ☐ |
| `signal-parsing.integration.test.ts` | `<chorus>` signals | ☐ | ☐ |
| `learnings.integration.test.ts` | Learning storage | ☐ | ☐ |
| `learning-propagation.integration.test.ts` | Learning inject | ☐ | ☐ |

---

## HIZLI TEST YOLLARI

### Yol 1: Sadece CLI (2 dakika)

```bash
chorus --version && chorus --help && chorus --unknown
```
**Sonuç:** 6 test tamamlandı

---

### Yol 2: Implementation Mode UI (5 dakika)

```bash
mkdir ~/qa-test && cd ~/qa-test
git init && git commit --allow-empty -m "init"

mkdir -p .chorus
echo '{"status":"implementation","chosenMode":"semi-auto","planSummary":{"userGoal":"Test","estimatedTasks":3},"tasks":[],"reviewIterations":[]}' > .chorus/planning-state.json
echo '{"id":"ch-t1","title":"Task 1","status":"open","priority":1}
{"id":"ch-t2","title":"Task 2","status":"in_progress","priority":1}
{"id":"ch-t3","title":"Task 3","status":"closed","priority":2}' > .chorus/tasks.jsonl

chorus
# Test: j/k, ?, Tab, 1-9, q
```
**Sonuç:** 28 test tamamlandı

---

### Yol 3: Full E2E (10 dakika)

```bash
npm run test:e2e
```
**Sonuç:** 130 E2E test (20 dosya)

---

### Yol 4: Integration (Claude API gerekli, 5+ dakika)

```bash
npm run test:integration
```
**Sonuç:** 99 integration test

---

## KEYBOARD SHORTCUTS TAM LİSTE

| Kategori | Tuş | Açıklama | Test# |
|----------|-----|----------|-------|
| **NAVIGATION** | `j` / `↓` | Aşağı | 24 |
| | `k` / `↑` | Yukarı | 25 |
| | `Tab` | Panel değiştir | - |
| | `1-9` | Quick select | 26 |
| **AGENT** | `Enter` | Task ata | 35 |
| | `s` | Agent spawn | - |
| | `x` | Agent durdur | 53 |
| | `r` | Redirect | 54 |
| **MODE** | `m` | Mode toggle | 37 |
| | `Space` | Pause/resume | 41 |
| | `a` | Autopilot başlat | - |
| **VIEW** | `?` | Help panel | 20 |
| | `L` | Learnings | - |
| | `l` | Logs | - |
| | `f` | Fullscreen | - |
| | `M` | Merge queue | - |
| **INTERVENTION** | `i` | Intervention panel | 49 |
| | `p` | Pause (panel içinde) | 51 |
| | `Esc` | Kapat | 50 |
| **SYSTEM** | `q` | Quit | 21 |
| | `c` | Checkpoint | - |
| | `R` | Rollback menu | - |
| | `u` | Undo | - |

---

## TEST METADATA

```
Test Tarihi: ____________________
Test Eden: ____________________
Chorus Version: 0.1.0
Platform: macOS / Linux
Node Version: ____________________
Claude CLI: ☐ Yok  ☐ Var (version: ______)
Terminal: ____________________
```

---

## TEST SONUÇ ÖZETİ

| Adım | Test Sayısı | Geçen | Notlar |
|------|-------------|-------|--------|
| A0: CLI | 6 | | |
| A1: Init | 10 | | |
| B1: Tasks | 7 | | |
| B2: Status | 5 | | |
| C1: Semi-auto | 4 | | |
| C2: Autopilot | 4 | | |
| D2: Agent | 5 | | |
| E: Intervention | 6 | | |
| E2E (otomatik) | 130 | | |
| Integration | 99 | | |
| **TOPLAM** | **~276** | | |
