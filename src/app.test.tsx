import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import App from './app.js';

describe('App', () => {
  it('renders welcome message', () => {
    const { lastFrame } = render(<App />);

    expect(lastFrame()).toContain('Chorus');
  });

  it('displays version when showVersion is true', () => {
    const { lastFrame } = render(<App showVersion />);

    expect(lastFrame()).toContain('0.1.0');
  });

  it('displays help when showHelp is true', () => {
    const { lastFrame } = render(<App showHelp />);

    expect(lastFrame()).toContain('Usage');
  });

  it('shows empty state in TUI mode', () => {
    const { lastFrame } = render(<App />);

    expect(lastFrame()).toContain('No agents running');
  });

  it('shows quit hint in TUI mode', () => {
    const { lastFrame } = render(<App />);

    expect(lastFrame()).toContain('q');
  });

  it('calls onExit when q is pressed', () => {
    const onExit = vi.fn();
    const { stdin } = render(<App onExit={onExit} />);

    stdin.write('q');

    expect(onExit).toHaveBeenCalled();
  });
});
