import { useInput } from 'ink';

interface UseKeyboardOptions {
  onQuit: () => void;
  onSpawn?: () => void;
}

export function useKeyboard({ onQuit, onSpawn }: UseKeyboardOptions): void {
  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) {
      onQuit();
    }
    if (input === 's') {
      onSpawn?.();
    }
  });
}
