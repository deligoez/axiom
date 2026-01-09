import { useInput } from 'ink';

interface UseKeyboardOptions {
  onQuit: () => void;
}

export function useKeyboard({ onQuit }: UseKeyboardOptions): void {
  useInput((input, key) => {
    if (input === 'q' || key.ctrl && input === 'c') {
      onQuit();
    }
  });
}
