import { useInput } from 'ink';

interface UseKeyboardOptions {
  onQuit: () => void;
  onSpawn?: () => void;
  onNavigate?: (direction: 'next' | 'prev') => void;
}

export function useKeyboard({ onQuit, onSpawn, onNavigate }: UseKeyboardOptions): void {
  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) {
      onQuit();
    }
    if (input === 's') {
      onSpawn?.();
    }
    if (input === 'j') {
      onNavigate?.('next');
    }
    if (input === 'k') {
      onNavigate?.('prev');
    }
  });
}
