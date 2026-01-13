# Chorus Manuel QA Test Planı

**Tarih:** 2026-01-14 (Güncellenmiş)
**Durum:** AKTIF
**Son Test:** 2026-01-14

---

## Test Durumu Özeti

| Kategori | Durum | Notlar |
|----------|-------|--------|
| CLI | ✅ ÇALIŞIYOR | --version, --help, flags |
| Init Mode | ✅ ÇALIŞIYOR | ConfigWizard keyboard fixed (ch-utha closed) |
| Implementation Mode UI | ✅ ÇALIŞIYOR | Layout, panels, indicators |
| Task Panel | ✅ ÇALIŞIYOR | Status, priority, stats |
| Agent Grid | ✅ ÇALIŞIYOR | Empty slots, layout |
| Navigation (j/k) | ✅ ÇALIŞIYOR | |
| Help Panel (?) | ✅ ÇALIŞIYOR | |
| Intervention (i) | ✅ ÇALIŞIYOR | |
| Quit (q) | ✅ ÇALIŞIYOR | |
| Number Keys (1-9) | ❌ YOK | Implement edilmemiş (ch-g4yd) |
| Task Management | ❌ YOK | n/e/b/d keys yok |
| Agent Control | ❌ YOK | s/x/r/Enter keys yok |

---

## ADIM 0: CLI Temel Testleri ✅

**Setup:** Build yapılmış olmalı (`npm run build`)

```bash
node dist/index.js --version   # veya: npx tsx src/index.tsx --version
```

| # | Komut | Beklenen | Durum |
|---|-------|----------|-------|
| 0.1 | `chorus --version` | `0.1.0` | ✅ |
| 0.2 | `chorus -v` | `0.1.0` | ✅ |
| 0.3 | `chorus --help` | USAGE, OPTIONS, EXAMPLES | ✅ |
| 0.4 | `chorus -h` | Aynı help | ✅ |
| 0.5 | `chorus --bilinmeyen` | Help gösterir | ✅ |
| 0.6 | `chorus garip-komut` | Help gösterir | ✅ |
| 0.7 | `chorus` (no TTY) | Error mesajı + exit 1 | ✅ |

**Sonuç:** 7/7 PASSED

---

## ADIM 1: Init Mode ✅

**Durum:** ConfigWizard keyboard navigation fixed (ch-utha CLOSED)

### Tüm Testler

| # | Test | Durum |
|---|------|-------|
| 1.1 | Init mode tetiklenir (.chorus yok) | ✅ |
| 1.2 | Prerequisite check görünür | ✅ |
| 1.3 | Git tespit edilir | ✅ |
| 1.4 | Node version check | ✅ |
| 1.5 | Claude CLI check | ✅ |
| 1.6 | Step 2 - Project Detection | ✅ |
| 1.7 | Enter ile wizard ilerler (Step 2→3→4) | ✅ |
| 1.8 | Wizard tamamlanır (onComplete) | ✅ |

**E2E Tests:** `src/e2e/init-mode.e2e.test.ts` (5 tests)

**Sonuç:** 8/8 PASSED

---

## ADIM 2: Implementation Mode UI ✅

### Setup (Init Bypass)

```bash
mkdir -p /tmp/qa-test && cd /tmp/qa-test
git init && git commit --allow-empty -m "init"
mkdir -p .chorus

# Tasks
cat > .chorus/tasks.jsonl << 'EOF'
{"id":"ch-qa1","title":"Open Task","status":"todo","priority":1}
{"id":"ch-qa2","title":"Running Task","status":"doing","priority":1}
{"id":"ch-qa3","title":"Done Task","status":"done","priority":2}
{"id":"ch-qa4","title":"Blocked Task","status":"stuck","priority":1,"dependencies":["ch-qa1"]}
{"id":"ch-qa5","title":"Review Task","status":"review","priority":1}
EOF

# State
cat > .chorus/planning-state.json << 'EOF'
{
  "status": "implementation",
  "chosenMode": "semi-auto",
  "planSummary": {"userGoal": "QA Test", "estimatedTasks": 5},
  "tasks": [],
  "reviewIterations": []
}
EOF

chorus  # veya: node dist/index.js
```

### UI Element Testleri

| # | Test | Kontrol | Durum |
|---|------|---------|-------|
| 2.1 | CHORUS branding | Header'da görünür | ✅ |
| 2.2 | Mode indicator | "semi-auto ●" | ✅ |
| 2.3 | Agent count | "0/4" formatı | ✅ |
| 2.4 | Help hint | "? for help" | ✅ |
| 2.5 | Task Panel | Sol kolonda | ✅ |
| 2.6 | Agent Grid | Sağ kolonda | ✅ |
| 2.7 | Task count | "Tasks (5)" | ✅ |
| 2.8 | Empty slots | "[empty slot]" x 4 | ✅ |
| 2.9 | Footer bar | Task stats görünür | ✅ |

### Status Indicator Testleri

| Status | Gösterge | tasks.jsonl field | Durum |
|--------|----------|-------------------|-------|
| todo | → | `"status":"todo"` | ✅ |
| doing | ● | `"status":"doing"` | ✅ |
| done | ✓ | `"status":"done"` | ✅ |
| stuck | ⊗ | `"status":"stuck"` | ✅ |
| review | ⏳ | `"status":"review"` | ✅ |

### Priority Display Testleri

| Priority | Görünüm | Durum |
|----------|---------|-------|
| 0 | P0 | ✅ |
| 1 | P1 | ✅ |
| 2 | P2 | ✅ |
| 3 | P3 | ✅ |

### Task Statistics

| # | Test | Durum |
|---|------|-------|
| 2.10 | "X done" count | ✅ |
| 2.11 | "Y running" count | ✅ |
| 2.12 | "Z pending" count | ✅ |
| 2.13 | "W blocked" count | ✅ |
| 2.14 | Dependency count "(N)" | ✅ |

**Sonuç:** ~20 test PASSED

---

## ADIM 3: Keyboard Navigation

### Çalışan Tuşlar ✅

| Tuş | Fonksiyon | Test | Durum |
|-----|-----------|------|-------|
| `j` | Aşağı hareket | Task seçimi değişir | ✅ |
| `k` | Yukarı hareket | Task seçimi değişir | ✅ |
| `?` | Help panel aç | KEYBOARD SHORTCUTS görünür | ✅ |
| `ESC` | Help/panel kapat | Normal view'a döner | ✅ |
| `i` | Intervention panel | Menü açılır | ✅ |
| `q` | Çıkış | Running agent yoksa direkt çıkar | ✅ |
| `m` | Mode toggle | semi-auto ↔ autopilot | ✅ |
| `p` | Planning mode | Planning view'a geçer | ✅ |

### Implement Edilmemiş Tuşlar ❌

| Tuş | Fonksiyon | Bug/Task |
|-----|-----------|----------|
| `1-9` | Quick task select | ch-g4yd |
| `Tab` | Panel switch | Yok |
| `n` | New task | Yok |
| `e` | Edit task | Yok |
| `b` | Block task | Yok |
| `d` | Mark done | Yok |
| `s` | Spawn agent | Yok |
| `x` | Stop agent | Yok |
| `r` | Redirect agent | Yok |
| `Enter` | Assign task | Yok |
| `Space` | Pause/resume | Yok |
| `a` | Start autopilot | Yok |
| `f` | Fullscreen agent | Yok |
| `g` | Grid settings | Yok |
| `l` | View logs | Yok |
| `L` | View learnings | Yok |
| `R` | Rollback menu | Yok |
| `c` | Create checkpoint | Yok |
| `u` | Undo | Yok |
| `P` | Plan more tasks | Yok |
| `Ctrl+L` | Review learnings | Yok |
| `M` | Merge queue view | Yok |

---

## ADIM 4: Agent Grid ✅

### Grid Layout Testleri

| Terminal Width | Columns | Durum |
|---------------|---------|-------|
| < 120 | 1 | ✅ |
| 120-179 | 2 | ✅ |
| >= 180 | 3 | ✅ |

### Grid Element Testleri

| # | Test | Durum |
|---|------|-------|
| 4.1 | Empty slot gösterimi | ✅ |
| 4.2 | Slot count (0/4) | ✅ |
| 4.3 | Multi-column layout | ✅ |
| 4.4 | Narrow terminal handling | ✅ |

**Sonuç:** 12/12 PASSED

---

## ADIM 5: Edge Cases ✅

| # | Senaryo | Durum |
|---|---------|-------|
| 5.1 | .chorus/ yok → Init mode | ✅ |
| 5.2 | Invalid tasks.jsonl → Error + exit | ✅ |
| 5.3 | Empty tasks.jsonl → Tasks (0) | ✅ |
| 5.4 | 50 task → Handles | ✅ |
| 5.5 | Narrow terminal (60 cols) | ✅ |
| 5.6 | Short terminal (15 rows) | ✅ |
| 5.7 | Missing planning-state.json → Planning mode | ✅ |

**Sonuç:** 7/7 PASSED

---

## BUG LİSTESİ

| ID | Severity | Açıklama | Durum |
|----|----------|----------|-------|
| ch-utha | P0 | ConfigWizard keyboard input yok | ✅ CLOSED |
| ch-g4yd | P2 | Number keys (1-9) implement edilmemiş | OPEN |
| ch-6dg1 | P2 | HelpPanel unimplemented features gösteriyor | OPEN |

---

## İMPLEMENT EDİLECEK FEATURE'LAR

### Yüksek Öncelik (Core Functionality)

| Feature | Tuş | Açıklama | Task |
|---------|-----|----------|------|
| Quick Select | 1-9 | Task'ı numarayla seç | ch-g4yd |
| Panel Switch | Tab | Task ↔ Agent focus | Gerekli |
| Assign Task | Enter | Seçili task'a agent başlat | Gerekli |
| Spawn Agent | s | Yeni agent spawn et | Gerekli |
| Stop Agent | x | Agent'ı durdur | Gerekli |

### Orta Öncelik (Task Management)

| Feature | Tuş | Açıklama | Task |
|---------|-----|----------|------|
| New Task | n | Yeni task oluştur | Gerekli |
| Edit Task | e | Task düzenle | Gerekli |
| Block Task | b | Task'ı bloke et | Gerekli |
| Mark Done | d | Task'ı tamamla | Gerekli |

### Düşük Öncelik (Advanced)

| Feature | Tuş | Açıklama | Task |
|---------|-----|----------|------|
| Redirect Agent | r | Agent'ı başka task'a yönlendir | Gerekli |
| Pause/Resume | Space | Agent'ları duraklat | Gerekli |
| View Logs | l | Agent loglarını gör | Gerekli |
| View Learnings | L | Learnings listesi | Gerekli |
| Fullscreen | f | Agent fullscreen | Gerekli |
| Grid Settings | g | Grid ayarları | Gerekli |
| Merge Queue | M | Merge kuyruğu | Gerekli |
| Rollback | R | Rollback menüsü | Gerekli |
| Checkpoint | c | Checkpoint oluştur | Gerekli |
| Undo | u | Son işlemi geri al | Gerekli |
| Plan More | P | Yeni task planla | Gerekli |
| Review Learnings | Ctrl+L | Learning review | Gerekli |

---

## HIZLI TEST KOMUTLARI

### CLI Only (1 dakika)
```bash
node dist/index.js --version
node dist/index.js --help
node dist/index.js --unknown
```

### Full UI Test (5 dakika)
```bash
# Setup
mkdir -p /tmp/qa-full && cd /tmp/qa-full
git init && git commit --allow-empty -m "init"
mkdir -p .chorus

cat > .chorus/tasks.jsonl << 'EOF'
{"id":"ch-t1","title":"Todo Task","status":"todo","priority":1}
{"id":"ch-t2","title":"Doing Task","status":"doing","priority":1}
{"id":"ch-t3","title":"Done Task","status":"done","priority":2}
{"id":"ch-t4","title":"Stuck Task","status":"stuck","priority":1}
{"id":"ch-t5","title":"Review Task","status":"review","priority":1}
EOF

cat > .chorus/planning-state.json << 'EOF'
{"status":"implementation","chosenMode":"semi-auto","planSummary":{"userGoal":"Test","estimatedTasks":5},"tasks":[],"reviewIterations":[]}
EOF

# Test
node /path/to/chorus/dist/index.js
# j/k, ?, i, ESC, q test et
```

### Automated E2E (10 dakika)
```bash
npm run test:e2e
```

### Automated Integration (5 dakika, Claude API gerekli)
```bash
npm run test:integration
```

---

## QA TEST TASK'LARI

### Mevcut QA Test Task'ları

| Task ID | Açıklama | Durum |
|---------|----------|-------|
| ch-rv9i | AgentGrid component tests | OPEN |
| ch-ktll | PlanningMode E2E tests | OPEN |
| ch-dcmq | ReviewLoop E2E tests | OPEN |
| ch-1ucd | FooterBar tests | OPEN |
| ch-6cgm | HeaderBar tests | OPEN |
| ch-y3bn | InterventionPanel tests | OPEN |

---

## TEST SONUÇ ÖZETİ

| ADIM | Toplam | Geçen | Durum |
|------|--------|-------|-------|
| 0: CLI | 7 | 7 | ✅ |
| 1: Init Mode | 8 | 8 | ✅ |
| 2: Implementation UI | ~20 | ~20 | ✅ |
| 3: Keyboard | 8 | 8 | ✅ (çalışanlar) |
| 4: Agent Grid | 12 | 12 | ✅ |
| 5: Edge Cases | 7 | 7 | ✅ |
| **TOPLAM** | ~62 | ~62 | |

**Genel Durum:** Core UI çalışıyor. Keyboard shortcuts (task management, agent control) implement edilmeli.
