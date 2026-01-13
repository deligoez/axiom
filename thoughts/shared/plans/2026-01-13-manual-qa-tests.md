# Chorus Manuel QA Test Planı

**Tarih:** 2026-01-13
**Durum:** TASLAK
**Versiyon:** 2.0 (Codebase-based)

---

## İçindekiler

1. [Test Ortamı Hazırlığı](#test-ortamı-hazırlığı)
2. [Mevcut Test Coverage](#mevcut-test-coverage)
3. [Temel CLI Testleri (Level 1)](#temel-cli-testleri-level-1)
4. [Init Mode Testleri (Level 2)](#init-mode-testleri-level-2)
5. [Planning Mode Testleri (Level 3)](#planning-mode-testleri-level-3)
6. [Implementation Mode Testleri (Level 4)](#implementation-mode-testleri-level-4)
7. [Keyboard Navigation Testleri (Level 5)](#keyboard-navigation-testleri-level-5)
8. [Agent Lifecycle Testleri (Level 6)](#agent-lifecycle-testleri-level-6)
9. [Intervention System Testleri (Level 7)](#intervention-system-testleri-level-7)
10. [Learning System Testleri (Level 8)](#learning-system-testleri-level-8)
11. [Merge & Worktree Testleri (Level 9)](#merge--worktree-testleri-level-9)
12. [Recovery & Checkpoint Testleri (Level 10)](#recovery--checkpoint-testleri-level-10)
13. [Sprint & Review Testleri (Level 11)](#sprint--review-testleri-level-11)
14. [Stress & Edge Case Testleri (Level 12)](#stress--edge-case-testleri-level-12)

---

## Test Ortamı Hazırlığı

### Ön Koşullar

```bash
# 1. Boş bir test dizini oluştur
mkdir ~/chorus-qa-test
cd ~/chorus-qa-test

# 2. Git repo başlat (ZORUNLU - Chorus git repo gerektirir)
git init
git commit --allow-empty -m "Initial commit"

# 3. Basit bir proje yapısı oluştur
mkdir src
echo 'export const hello = () => "world";' > src/index.ts
echo '{ "name": "qa-test", "type": "module" }' > package.json
git add . && git commit -m "Add basic project structure"

# 4. Bağımlılıkları kontrol et (InitMode bunları otomatik kontrol eder)
which git       # Git kurulu olmalı
node -v         # Node.js 20+ olmalı
which claude    # Claude CLI kurulu olmalı (opsiyonel - agent testleri için)
```

### Chorus'u Çalıştırma

```bash
# Development modunda
cd /path/to/chorus
npm run dev

# Veya npx ile
npx chorus

# CLI flagları
npx chorus --version          # Versiyon göster
npx chorus --help             # Yardım göster
npx chorus init               # Init mode başlat
npx chorus plan               # Planning mode başlat
```

---

## Mevcut Test Coverage

Chorus'un otomatik test coverage'ı:

| Test Türü | Dosya Sayısı | Test Sayısı | Konum |
|-----------|--------------|-------------|-------|
| **Unit Tests** | 205 | 2285 | `src/**/*.test.ts` |
| **E2E Tests (PTY)** | 9 | 31 | `src/e2e/*.e2e.test.ts` |
| **Integration Tests** | 11 | 99 | `src/integration/*.integration.test.ts` |
| **Toplam** | **225** | **2415** | - |

### Otomatik Testleri Çalıştırma

```bash
npm test                    # Watch mode
npm run test:run            # Single run (unit + E2E)
npm run test:integration    # Integration (gerçek Claude API çağrısı yapar!)
npm run quality             # Full pipeline (test + typecheck + lint + knip)
```

---

## Temel CLI Testleri (Level 1)

### T1.1: CLI Argümanları

| # | Komut | Beklenen Sonuç | Durum |
|---|-------|----------------|-------|
| 1 | `npx chorus --version` | Versiyon numarası (örn: `0.1.0`) | ☐ |
| 2 | `npx chorus --help` | Yardım mesajı (USAGE, COMMANDS, OPTIONS, EXAMPLES) | ☐ |
| 3 | `npx chorus --unknown` | Yardım mesajı gösterir (hata yerine) | ☐ |
| 4 | `npx chorus` (git repo yok) | Hata veya Init Mode | ☐ |
| 5 | `npx chorus` (.chorus/ yok) | Init Mode başlar | ☐ |
| 6 | `npx chorus` (.chorus/ + planning-state.json var) | State'e göre mode | ☐ |
| 7 | `npx chorus init` | Init Mode başlar (force) | ☐ |
| 8 | `npx chorus plan` | Planning Mode başlar (force) | ☐ |

### T1.2: Dizin Yapısı Kontrolü

**Senaryo:** Init sonrası `.chorus/` dizin yapısı

```bash
ls -la .chorus/
```

**Beklenen Dosyalar:**
- [ ] `.chorus/config.json` - Ana konfigürasyon
- [ ] `.chorus/state.json` veya `state.xstate.json` - State persistence
- [ ] `.chorus/planning-state.json` - Planning state (opsiyonel)
- [ ] `.chorus/LEARNINGS.jsonl` - Öğrenme kayıtları (opsiyonel)
- [ ] `.chorus/audit/` - Audit logları (opsiyonel)

---

## Init Mode Testleri (Level 2)

**Kaynak Dosya:** `src/modes/InitMode.tsx`

### T2.1: Prerequisite Kontrolü

**Senaryo:** Chorus ilk kez başlatıldığında

**Adımlar:**
```bash
rm -rf .chorus   # Varsa temizle
npx chorus
```

**Kontrol Listesi:**
- [ ] "Checking" mesajı görünür
- [ ] Git kontrolü yapılır (✓ veya ✗)
- [ ] Node.js versiyonu kontrol edilir (v20+ gerekli)
- [ ] Claude CLI kontrolü yapılır
- [ ] Tüm kontroller geçerse wizard başlar

### T2.2: Config Wizard - Proje Tespiti

**Senaryo:** ProjectDetector çalışır

**Kontrol Listesi:**
- [ ] Proje tipi otomatik tespit edilir (Node.js, Python, Go, etc.)
- [ ] Test komutu önerilir (`npm test`, `pytest`, etc.)
- [ ] Lint komutu önerilir
- [ ] Build komutu önerilir
- [ ] Kullanıcı değerleri değiştirebilir

### T2.3: Config Wizard - Quality Commands

**Senaryo:** Quality komutları yapılandırılır

**Kontrol Listesi:**
- [ ] Test command input'u var
- [ ] Lint command input'u var
- [ ] Build command input'u var (opsiyonel)
- [ ] Komutlar validate edilir
- [ ] Config dosyasına yazılır

### T2.4: Plan Review Config

**Senaryo:** Plan review ayarları (PlanReviewConfigStep)

**Kontrol Listesi:**
- [ ] Auto-approve threshold seçilebilir
- [ ] Review mode seçilebilir
- [ ] Settings kaydedilir

### T2.5: Agent Introduction (Meet the Team)

**Senaryo:** "Would you like to meet your Chorus team?" sorusu

**Kontrol Listesi:**
- [ ] Y/N prompt görünür
- [ ] `y` → Agent tanıtımları gösterilir
- [ ] `n` → Direkt Implementation Mode'a geçer
- [ ] Agent persona'ları tanıtılır (varsa)

---

## Planning Mode Testleri (Level 3)

**Kaynak Dosya:** `src/modes/PlanningMode.tsx`

### T3.1: Planning Mode Girişi

**Senaryo:** Init sonrası veya `chorus plan` ile giriş

**Kontrol Listesi:**
- [ ] Planning layout görünür (PlanningLayout component)
- [ ] Chat input aktif
- [ ] Conversation history gösteriliyor (varsa)

### T3.2: Plan Agent İle Etkileşim

**Senaryo:** Kullanıcı hedef tanımlar

```
> Basit bir REST API oluşturmak istiyorum
```

**Kontrol Listesi:**
- [ ] Plan Agent yanıt verir
- [ ] Task breakdown önerilir
- [ ] Her task atomic ve testable
- [ ] Conversation history güncellenir

### T3.3: Task Oluşturma

**Senaryo:** Agent task'lar oluşturur

**Kontrol Listesi:**
- [ ] Task'lar `.beads/issues.jsonl` dosyasına yazılır
- [ ] Task ID'leri benzersiz
- [ ] Dependency'ler belirlenir
- [ ] Status: `open` olarak başlar

---

## Implementation Mode Testleri (Level 4)

**Kaynak Dosya:** `src/modes/ImplementationMode.tsx`

### T4.1: TUI Layout

**Senaryo:** Implementation Mode açıldığında

**Kontrol Listesi:**
- [ ] Two-column layout görünür (TwoColumnLayout)
- [ ] Sol panel: TaskPanel (task listesi)
- [ ] Sağ panel: AgentGrid (agent tile'ları)
- [ ] Header bar: Mode göstergesi (SEMI-AUTO / AUTOPILOT)
- [ ] Footer bar: Kısayollar ve istatistikler

### T4.2: TaskPanel Component

**Kaynak:** `src/components/TaskPanel.tsx`

**Kontrol Listesi:**
- [ ] Header: `Tasks (N)` formatında
- [ ] Her task için satır gösterilir
- [ ] Status göstergeleri doğru:
  - `→` open (bekleyen)
  - `●` in_progress (çalışıyor)
  - `✓` closed (tamamlandı)
  - `⊗` blocked (bloklu)
- [ ] Seçili task vurgulanır (highlight)
- [ ] TaskSummaryStats görünür: "X done, Y running, Z pending"

### T4.3: AgentGrid Component

**Kaynak:** `src/components/AgentGrid.tsx`, `AgentTile.tsx`

**Kontrol Listesi:**
- [ ] Grid layout doğru (maxSlots'a göre)
- [ ] Boş slot'lar gösterilir (EmptySlot)
- [ ] Aktif agent'lar AgentTile olarak görünür
- [ ] Her tile: Header + Output + Progress
- [ ] AgentSlotsCounter: "X/Y agents" göstergesi

### T4.4: Mode Toggle

**Senaryo:** `m` tuşu ile mode değişimi

**Kontrol Listesi:**
- [ ] `m` → Mode toggle (semi-auto ↔ autopilot)
- [ ] Header güncellenir
- [ ] State persist edilir

---

## Keyboard Navigation Testleri (Level 5)

**Kaynak Dosyalar:** `src/hooks/useNavigationKeys.ts`, `src/components/HelpPanel.tsx`

### T5.1: Help Panel (?)

**Senaryo:** `?` tuşuna bas

**Kontrol Listesi:**
- [ ] HelpPanel açılır (sarı border)
- [ ] Tüm kısayollar kategorilere ayrılmış görünür
- [ ] Tekrar `?` → Panel kapanır

### T5.2: Navigation Keys (Gerçek Kısayollar)

| Kategori | Tuş | Açıklama | Test Durumu |
|----------|-----|----------|-------------|
| **NAVIGATION** | `j` / `↓` | Move down | ☐ |
| | `k` / `↑` | Move up | ☐ |
| | `Tab` | Switch panels | ☐ |
| | `1-9` | Quick select | ☐ |
| **AGENT CONTROL** | `s` | Spawn agent | ☐ |
| | `x` | Stop agent | ☐ |
| | `r` | Redirect agent | ☐ |
| | `Enter` | Assign task | ☐ |
| **MODE CONTROL** | `m` | Toggle mode | ☐ |
| | `Space` | Pause/resume | ☐ |
| | `a` | Start autopilot | ☐ |
| **TASK MANAGEMENT** | `n` | New task | ☐ |
| | `e` | Edit task | ☐ |
| | `b` | Block task | ☐ |
| | `d` | Mark done | ☐ |
| **VIEW** | `f` | Fullscreen agent | ☐ |
| | `g` | Grid settings | ☐ |
| | `l` | View logs | ☐ |
| | `L` | View learnings | ☐ |
| **RECOVERY** | `R` | Rollback menu | ☐ |
| | `c` | Create checkpoint | ☐ |
| | `u` | Undo last action | ☐ |
| **PLANNING & LEARNING** | `P` | Plan more tasks | ☐ |
| | `Shift+P` | Force plan | ☐ |
| | `Ctrl+L` | Review learnings | ☐ |
| | `Shift+L` | Force review | ☐ |
| **GENERAL** | `?` | Toggle help | ☐ |
| | `i` | Intervention menu | ☐ |
| | `q` | Quit | ☐ |
| | `M` | Merge queue view | ☐ |

### T5.3: Task Selection ve Navigation

**Senaryo:** TaskPanel'de gezinme

```
1. j tuşu → Sonraki task seçilir
2. k tuşu → Önceki task seçilir
3. 1-9 tuşları → Doğrudan task seçimi
4. Enter → Seçili task agent'a atanır
```

**Kontrol Listesi:**
- [ ] j/k wrap etmez (boundary'de durur)
- [ ] Seçim görsel olarak belirgin
- [ ] 1-9 sadece ilk 9 task için çalışır

---

## Agent Lifecycle Testleri (Level 6)

**Kaynak Dosyalar:** `src/services/AgentSpawner.ts`, `src/machines/agent.machine.ts`

### T6.1: Agent Spawn

**Senaryo:** Task seçip Enter

**Kontrol Listesi:**
- [ ] Task status: `→` → `●` (open → in_progress)
- [ ] AgentTile görünür
- [ ] Worktree oluşturulur: `.worktrees/claude-{task-id}`
- [ ] Branch oluşturulur: `agent/claude/{task-id}`
- [ ] Agent process başlar

### T6.2: Agent Machine States

**Kaynak:** `src/machines/agent.machine.ts`

```
idle → preparing → executing → (completed | blocked | failed)
                      ↓ ↑
                   iteration → checkQuality
```

**Kontrol Listesi:**
- [ ] `idle` → START → `preparing`
- [ ] `preparing` → READY → `executing`
- [ ] `executing.iteration` → quality check
- [ ] ALL_PASS → `completed`
- [ ] BLOCKED → `blocked`
- [ ] FAIL → `failed`

### T6.3: Agent Output İzleme

**Senaryo:** Agent çalışırken

**Kontrol Listesi:**
- [ ] AgentTileOutput real-time güncellenir
- [ ] Iteration sayısı görünür (AgentTileProgress)
- [ ] Duration gösterilir (DurationDisplay)

### T6.4: Signal Parsing

**Kaynak:** `src/services/SignalParser.ts`

**Beklenen Signal Formatı:** `<chorus>TYPE:payload</chorus>`

| Signal | Anlam | Test |
|--------|-------|------|
| `<chorus>COMPLETE</chorus>` | Task tamamlandı | ☐ |
| `<chorus>BLOCKED:reason</chorus>` | Agent bloklandı | ☐ |
| `<chorus>NEEDS_HELP:question</chorus>` | Yardım gerekiyor | ☐ |
| `<chorus>PROGRESS:75</chorus>` | İlerleme bildirimi | ☐ |

### T6.5: Agent Completion

**Senaryo:** Agent COMPLETE signal gönderir

**Kontrol Listesi:**
- [ ] Signal algılanır
- [ ] Task status: `●` → `✓` (in_progress → closed)
- [ ] Semi-auto: Agent durur
- [ ] Autopilot: Sonraki task'a geçer
- [ ] Merge queue'ya eklenir

---

## Intervention System Testleri (Level 7)

**Kaynak Dosya:** `src/components/InterventionPanel.tsx`

### T7.1: Intervention Panel Açma

**Senaryo:** `i` tuşuna bas

**Kontrol Listesi:**
- [ ] InterventionPanel açılır (sarı border)
- [ ] "INTERVENTION" başlığı görünür
- [ ] Active Agents listesi görünür
- [ ] Actions menüsü görünür

### T7.2: Intervention Actions

| Aksiyon | Tuş | Test |
|---------|-----|------|
| Pause/Resume | `p` | ☐ |
| Stop agent | `x` → agent # | ☐ |
| Redirect agent | `r` → agent # → task # | ☐ |
| Block task | `b` → agent # | ☐ |
| Edit task | `e` → task # | ☐ |
| Focus agent | `1-9` | ☐ |
| Close panel | `ESC` | ☐ |

### T7.3: Pause/Resume

**Senaryo:** Intervention panel'de `p`

**Kontrol Listesi:**
- [ ] Pause: "(PAUSED)" göstergesi görünür
- [ ] Pause: Yeni agent spawn edilemez
- [ ] Resume: Normal işleyiş devam eder

### T7.4: Stop Agent

**Senaryo:** `x` → agent numarası

**Kontrol Listesi:**
- [ ] Agent process sonlandırılır
- [ ] Task status güncellenir
- [ ] Panel "main" moduna döner

### T7.5: Redirect Agent

**Senaryo:** `r` → agent → task

**Kontrol Listesi:**
- [ ] Agent seçimi istenir
- [ ] Sonra task seçimi istenir
- [ ] Agent mevcut işi bırakır
- [ ] Yeni task'a yönlendirilir

---

## Learning System Testleri (Level 8)

**Kaynak Dosyalar:** `src/services/LearningStore.ts`, `src/components/LearningsPanel.tsx`

### T8.1: Learning Capture

**Senaryo:** Agent bir şey öğrenir

**Kontrol Listesi:**
- [ ] Learning pattern algılanır (LearningExtractor)
- [ ] `.chorus/LEARNINGS.jsonl`'e yazılır
- [ ] SHA-256 hash ile duplicate kontrolü
- [ ] Kategori atanır (LearningCategorizer)

### T8.2: View Learnings (L)

**Senaryo:** `L` (Shift+L) tuşuna bas

**Kontrol Listesi:**
- [ ] LearningsPanel açılır
- [ ] Tüm learnings listelenir
- [ ] Her learning: kategori + içerik
- [ ] Scroll edilebilir

### T8.3: Learning Review (Ctrl+L)

**Senaryo:** `Ctrl+L` tuşuna bas

**Kontrol Listesi:**
- [ ] LearningReviewDialog açılır
- [ ] Her learning onaylanabilir/reddedilebilir
- [ ] Onaylanan kalıcı olur
- [ ] Reddedilenler silinir

### T8.4: Learning Injection

**Senaryo:** Yeni agent başlatılır

**Kontrol Listesi:**
- [ ] Relevant learnings prompt'a eklenir
- [ ] Label-based filtering çalışır
- [ ] Context window limiti aşılmaz

---

## Merge & Worktree Testleri (Level 9)

**Kaynak Dosyalar:** `src/services/WorktreeService.ts`, `src/services/MergeService.ts`

### T9.1: Worktree Oluşturma

**Senaryo:** Agent spawn edildiğinde

```bash
# Doğrulama
ls .worktrees/
git worktree list
git branch -a | grep agent/
```

**Kontrol Listesi:**
- [ ] `.worktrees/{agent}-{task-id}` dizini oluşturulur
- [ ] Git worktree listesinde görünür
- [ ] Branch `agent/{agent}/{task-id}` oluşturulur

### T9.2: Worktree İzolasyonu

**Senaryo:** İki agent paralel çalışır

**Kontrol Listesi:**
- [ ] Her agent kendi worktree'sinde
- [ ] Dosya değişiklikleri birbirini etkilemez
- [ ] Ana branch (main/master) temiz kalır

### T9.3: Merge Queue (M)

**Senaryo:** `M` tuşu ile merge queue görüntüleme

**Kontrol Listesi:**
- [ ] MergeQueuePanel açılır
- [ ] Queue'daki branch'ler listelenir
- [ ] FIFO sırası korunur
- [ ] Her item için status görünür

### T9.4: Merge Conflict Handling

**Senaryo:** İki agent aynı dosyayı değiştirir

**Kontrol Listesi:**
- [ ] ConflictClassifier conflict seviyesini belirler
- [ ] Simple: AutoResolver ile çözülür
- [ ] Complex: HumanEscalation tetiklenir
- [ ] Kullanıcı bilgilendirilir

---

## Recovery & Checkpoint Testleri (Level 10)

**Kaynak Dosyalar:** `src/services/Checkpointer.ts`, `src/services/CrashRecovery.ts`

### T10.1: Create Checkpoint (c)

**Senaryo:** `c` tuşuna bas

**Kontrol Listesi:**
- [ ] Checkpoint oluşturulur
- [ ] Git tag atılır (checkpoint format)
- [ ] State snapshot alınır
- [ ] Onay mesajı görünür

### T10.2: Rollback Menu (R)

**Senaryo:** `R` tuşuna bas

**Kontrol Listesi:**
- [ ] Rollback menu açılır
- [ ] Checkpoint listesi görünür
- [ ] Seçilen checkpoint'e rollback yapılabilir

### T10.3: Undo (u)

**Senaryo:** `u` tuşuna bas

**Kontrol Listesi:**
- [ ] Son aksiyonu geri alır
- [ ] Undo geçmişi tutulur
- [ ] UI güncellenir

### T10.4: Crash Recovery

**Senaryo:** TUI'yı kill -9 ile öldür, tekrar başlat

```bash
# Terminal 1
npx chorus

# Terminal 2
pkill -9 -f "chorus"

# Terminal 1
npx chorus
```

**Kontrol Listesi:**
- [ ] State restore edilir (`.chorus/state.xstate.json`)
- [ ] Agent durumları korunur
- [ ] Task statüsleri doğru
- [ ] Event sourcing fallback çalışır (snapshot bozuksa)

### T10.5: Session Recovery

**Senaryo:** SessionRecovery service

**Kontrol Listesi:**
- [ ] Önceki session'dan kurtarma yapılır
- [ ] Active agent'lar tekrar başlatılır
- [ ] Worktree'ler korunur

---

## Sprint & Review Testleri (Level 11)

**Kaynak Dosyalar:** `src/machines/sprintRegion.ts`, `src/machines/reviewRegion.ts`

### T11.1: Sprint Planning Panel

**Kaynak:** `src/components/SprintPlanningPanel.tsx`

**Kontrol Listesi:**
- [ ] Sprint bilgileri görünür
- [ ] Task count
- [ ] Progress bar (SprintProgressBar)
- [ ] Stats (SprintStatsStorage)

### T11.2: Review System

**Kaynak:** `src/components/TaskReviewPanel.tsx`, `ReviewResults.tsx`

**Kontrol Listesi:**
- [ ] Review panel görünür
- [ ] Acceptance criteria listelenir
- [ ] Test sonuçları gösterilir
- [ ] Auto-approve threshold kontrolü

### T11.3: Auto-Approve

**Senaryo:** AutoApproveEngine çalışır

**Kontrol Listesi:**
- [ ] Test geçerse otomatik approve
- [ ] Threshold altında manual review
- [ ] Review sonucu kaydedilir

---

## Stress & Edge Case Testleri (Level 12)

### T12.1: Uzun Task Title

**Senaryo:** 100+ karakter task title

**Kontrol Listesi:**
- [ ] Title truncate/wrap edilir
- [ ] Layout bozulmaz
- [ ] Crash olmaz

### T12.2: Çok Sayıda Task

**Senaryo:** 100+ task

**Kontrol Listesi:**
- [ ] TaskPanel scroll edilebilir
- [ ] Performance kabul edilebilir
- [ ] Memory usage makul

### T12.3: Çok Sayıda Learning

**Senaryo:** 1000+ learning kaydı

**Kontrol Listesi:**
- [ ] LEARNINGS.jsonl büyüse de çalışır
- [ ] SHA-256 dedup çalışır
- [ ] Injection performansı kabul edilebilir

### T12.4: Concurrent TUI Access

**Senaryo:** İki terminalde chorus aç

**Kontrol Listesi:**
- [ ] File lock mekanizması çalışır
- [ ] İkinci instance uyarı verir
- [ ] Veya read-only mode

### T12.5: Config Missing/Invalid

**Senaryo:** config.json sil veya boz

```bash
rm .chorus/config.json
# veya
echo "invalid json" > .chorus/config.json
```

**Kontrol Listesi:**
- [ ] Default config kullanılır
- [ ] Warning gösterilir
- [ ] Crash olmaz

### T12.6: Network/Disk Issues

**Senaryo:** Claude API erişilemez

**Kontrol Listesi:**
- [ ] Graceful error handling
- [ ] Retry mekanizması
- [ ] User bilgilendirilir

### T12.7: Terminal Resize

**Senaryo:** Terminal boyutu değiştirilir

**Kontrol Listesi:**
- [ ] Layout yeniden hesaplanır
- [ ] useTerminalSize hook çalışır
- [ ] UI responsive olarak güncellenir

---

## Test Senaryoları (End-to-End Flows)

### Senaryo A: Fresh Start → İlk Task

```
1. Boş git repo oluştur
2. `npx chorus` çalıştır
3. Init wizard'ı tamamla
4. Planning mode'da 1 basit task oluştur
5. Implementation mode'a geç
6. Task'ı agent'a ata (Enter)
7. Agent tamamlayana kadar bekle
8. Task status ✓ olduğunu doğrula
```

### Senaryo B: Multi-Agent Parallel

```
1. 3 task oluştur
2. Autopilot mode'a geç (a)
3. maxAgents: 2 ile başlat
4. İki agent paralel çalışır
5. İlk biten sonraki task'ı alır
6. Tümü tamamlanana kadar bekle
```

### Senaryo C: Intervention Flow

```
1. Agent çalışırken
2. i → Intervention panel aç
3. p → Pause
4. (Bekleme)
5. p → Resume
6. Agent devam eder
```

### Senaryo D: Recovery Flow

```
1. 2 agent çalışırken
2. c → Checkpoint oluştur
3. Birkaç task daha tamamla
4. R → Rollback menu
5. Checkpoint'e geri dön
6. State doğru restore edilir
```

### Senaryo E: Learning Propagation

```
1. Agent 1 bir pattern öğrensin
2. Learning kaydedilsin
3. Agent 2 başlasın
4. Agent 2'nin prompt'unda learning görünsün
5. Agent 2 aynı hatayı yapmasın
```

---

## Test Sonuç Özeti

### Kategorilere Göre

| Kategori | Toplam Test | Geçen | Kalan | Notlar |
|----------|-------------|-------|-------|--------|
| Level 1: CLI | 8 | | | |
| Level 2: Init | 5 | | | |
| Level 3: Planning | 3 | | | |
| Level 4: Implementation | 4 | | | |
| Level 5: Keyboard | 32 | | | |
| Level 6: Agent | 5 | | | |
| Level 7: Intervention | 5 | | | |
| Level 8: Learning | 4 | | | |
| Level 9: Merge | 4 | | | |
| Level 10: Recovery | 5 | | | |
| Level 11: Sprint | 3 | | | |
| Level 12: Stress | 7 | | | |
| **TOPLAM** | **85** | | | |

### Test Metadata

```
Test Tarihi:
Test Eden:
Chorus Version:
Platform: macOS / Linux / Windows
Node Version:
Claude CLI Version:
Terminal: iTerm2 / Terminal.app / Windows Terminal
```

---

## Ek: Otomatik Testlerin Manuel Doğrulaması

Otomatik testlerin kapsamadığı veya manuel doğrulama gerektiren alanlar:

### E2E Testlerle Örtüşen Manuel Testler

| E2E Test | Manuel Test | Fark |
|----------|-------------|------|
| `task-navigation.e2e.test.ts` | T5.3 Task Selection | j/k responsiveness |
| `intervention-menu-pty.e2e.test.ts` | T7.x Intervention | Full flow |
| `personas.e2e.test.ts` | T4.3 AgentGrid | Visual persona display |
| `batch-review.e2e.test.ts` | T11.2 Review System | Batch review flow |
| `single-review.e2e.test.ts` | T11.2 Review System | Single review flow |

### Sadece Manuel Test Gerektiren Alanlar

- Gerçek Claude API entegrasyonu (integration testler uzun sürer)
- Visual layout sorunları (font rendering, color contrast)
- Keyboard responsiveness (latency)
- Multi-monitor / farklı terminal emulator'lar
- Network kesintisi senaryoları
