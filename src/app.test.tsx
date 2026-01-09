import { describe, it, expect } from 'vitest';
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
});
