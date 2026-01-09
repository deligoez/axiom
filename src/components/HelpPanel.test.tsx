import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import HelpPanel from './HelpPanel.js';

describe('HelpPanel', () => {
  it('renders nothing when not visible', () => {
    const { lastFrame } = render(<HelpPanel visible={false} />);
    expect(lastFrame()).toBe('');
  });

  it('renders keyboard shortcuts when visible', () => {
    const { lastFrame } = render(<HelpPanel visible={true} />);
    const output = lastFrame();

    expect(output).toContain('Keyboard Shortcuts');
    expect(output).toContain('q');
    expect(output).toContain('Quit');
    expect(output).toContain('s');
    expect(output).toContain('Spawn');
    expect(output).toContain('j');
    expect(output).toContain('k');
    expect(output).toContain('?');
  });

  it('shows close hint', () => {
    const { lastFrame } = render(<HelpPanel visible={true} />);
    expect(lastFrame()).toContain('Press ? to close');
  });
});
