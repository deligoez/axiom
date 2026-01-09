# F18: Task Selection UI

**Milestone:** 4 - Core Orchestration
**Dependencies:** F17 (Semi-Auto Mode), existing TaskPanel
**Estimated Tests:** 8

**Note:** Split into F18a (useTaskSelection hook, 4 tests) and F18b (TaskPanel UI, 4 tests)

---

## What It Does

Enhances TaskPanel to support task selection and assignment in semi-auto mode.

---

## Why It's Needed

- User needs to select which task to work on
- Must show task status (ready, blocked, in_progress)
- Enter key assigns task to agent
- Visual feedback during agent run
- Foundation for semi-auto workflow

---

## UI States

```
┌─ Tasks ──────────────────────┐
│                              │
│  [P1] ch-2n6  Ready    ◀     │  ← Selected (highlighted)
│  [P1] ch-ah6  Ready          │
│  [P1] ch-glq  Ready          │
│  [P1] ch-sro  Blocked (1)    │  ← Shows blocker count
│  [P1] ch-81x  Blocked (1)    │
│  [P1] ch-wk8  In Progress 🔄 │  ← Currently running
│                              │
│  Ready: 3  Blocked: 5        │
│  Press Enter to assign       │
└──────────────────────────────┘
```

---

## Files to Modify

| File | Action |
|------|--------|
| `src/components/TaskPanel.tsx` | Add selection and assignment |
| `src/hooks/useTaskSelection.ts` | NEW - selection logic |
| `tests/components/TaskPanel.test.tsx` | Add new tests |
| `tests/hooks/useTaskSelection.test.ts` | NEW - tests |

---

## useTaskSelection Hook

```typescript
// src/hooks/useTaskSelection.ts

export interface UseTaskSelectionResult {
  selectedTaskId: string | null;
  selectTask: (taskId: string) => void;
  selectNext: () => void;
  selectPrevious: () => void;
  assignSelected: () => Promise<void>;
  canAssign: boolean;
}

export function useTaskSelection(
  tasks: Bead[],
  semiAutoController: SemiAutoController
): UseTaskSelectionResult {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Filter to ready tasks only
  const readyTasks = useMemo(() =>
    tasks.filter(t => t.status === 'open' && !isBlocked(t)),
    [tasks]
  );

  const selectNext = () => {
    if (readyTasks.length === 0) return;
    const currentIndex = readyTasks.findIndex(t => t.id === selectedTaskId);
    const nextIndex = (currentIndex + 1) % readyTasks.length;
    setSelectedTaskId(readyTasks[nextIndex].id);
  };

  const selectPrevious = () => {
    if (readyTasks.length === 0) return;
    const currentIndex = readyTasks.findIndex(t => t.id === selectedTaskId);
    const prevIndex = currentIndex <= 0 ? readyTasks.length - 1 : currentIndex - 1;
    setSelectedTaskId(readyTasks[prevIndex].id);
  };

  const assignSelected = async () => {
    if (!selectedTaskId || !canAssign) return;
    await semiAutoController.startTask(selectedTaskId);
  };

  const canAssign = semiAutoController.isIdle() && selectedTaskId !== null;

  return {
    selectedTaskId,
    selectTask: setSelectedTaskId,
    selectNext,
    selectPrevious,
    assignSelected,
    canAssign
  };
}
```

---

## TaskPanel Updates

```typescript
// src/components/TaskPanel.tsx

interface TaskPanelProps {
  tasks: Bead[];
  semiAutoController?: SemiAutoController;
  onTaskSelect?: (taskId: string) => void;
}

export const TaskPanel: React.FC<TaskPanelProps> = ({
  tasks,
  semiAutoController,
  onTaskSelect
}) => {
  const {
    selectedTaskId,
    selectTask,
    selectNext,
    selectPrevious,
    assignSelected,
    canAssign
  } = useTaskSelection(tasks, semiAutoController);

  // Keyboard handling
  useInput((input, key) => {
    if (key.upArrow) selectPrevious();
    if (key.downArrow) selectNext();
    if (key.return && canAssign) assignSelected();
  });

  return (
    <Box flexDirection="column" borderStyle="single">
      <Box paddingX={1}>
        <Text bold>Tasks</Text>
      </Box>

      {tasks.map(task => (
        <TaskRow
          key={task.id}
          task={task}
          isSelected={task.id === selectedTaskId}
          onSelect={() => selectTask(task.id)}
        />
      ))}

      <Box paddingX={1} marginTop={1}>
        <Text dimColor>
          Ready: {readyCount}  Blocked: {blockedCount}
        </Text>
      </Box>

      {canAssign && (
        <Box paddingX={1}>
          <Text color="green">Press Enter to assign</Text>
        </Box>
      )}
    </Box>
  );
};
```

---

## TaskRow Component

```typescript
// src/components/TaskRow.tsx

interface TaskRowProps {
  task: Bead;
  isSelected: boolean;
  onSelect: () => void;
}

export const TaskRow: React.FC<TaskRowProps> = ({ task, isSelected, onSelect }) => {
  const statusColor = getStatusColor(task.status);
  const statusIcon = getStatusIcon(task);

  return (
    <Box paddingX={1}>
      <Text
        backgroundColor={isSelected ? 'blue' : undefined}
        color={isSelected ? 'white' : undefined}
      >
        [{task.priority}] {task.id}  {task.status} {statusIcon}
        {isSelected && ' ◀'}
      </Text>
    </Box>
  );
};

function getStatusColor(status: string): string {
  switch (status) {
    case 'open': return 'green';
    case 'in_progress': return 'yellow';
    case 'closed': return 'gray';
    default: return 'white';
  }
}

function getStatusIcon(task: Bead): string {
  if (task.status === 'in_progress') return '🔄';
  if (isBlocked(task)) return `(${task.dependencies?.length || 0})`;
  return '';
}
```

---

## Test Cases

```typescript
// tests/hooks/useTaskSelection.test.ts

describe('useTaskSelection', () => {
  it('should select task by ID');
  it('should cycle through ready tasks with selectNext');
  it('should cycle backwards with selectPrevious');
  it('should skip blocked tasks in navigation');
  it('should allow assign when idle and selected');
  it('should prevent assign when running');
});

// tests/components/TaskPanel.test.tsx (additions)

describe('TaskPanel selection', () => {
  it('should highlight selected task');
  it('should show "Press Enter to assign" when ready');
  it('should call assignSelected on Enter');
});
```

---

## Acceptance Criteria

- [ ] Can select task with up/down arrows
- [ ] Selected task is visually highlighted
- [ ] Enter key assigns selected task
- [ ] Cannot assign when agent is running
- [ ] Shows ready/blocked counts
- [ ] Shows status icons per task
- [ ] Navigation skips blocked tasks
- [ ] All 8 tests pass

---

## Implementation Notes

1. Selection state is local to TaskPanel
2. Only ready tasks can be selected (not blocked)
3. Enter triggers semiAutoController.startTask()
4. Visual feedback: highlight + arrow indicator
5. Disable selection during agent run
6. Can scroll if many tasks (future enhancement)
