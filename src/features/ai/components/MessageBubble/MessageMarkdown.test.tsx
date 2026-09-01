import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MessageMarkdown from './MessageMarkdown';

describe('AI message rendering', () => {
  it('renders money and a table as readable Markdown, not raw asterisks', () => {
    const { container } = render(<MessageMarkdown text={'**500 000 so‘m**\n\n| Turi | Summa |\n|---|---|\n| Daromad | 500000 |'} />);
    expect(container.querySelector('strong')).toHaveTextContent('500 000 so‘m');
    expect(screen.getByRole('table')).toHaveTextContent('Daromad');
    expect(container.textContent).not.toContain('**');
  });
  it('does not execute model-supplied HTML or unsafe links', () => {
    const { container } = render(<MessageMarkdown text={'<script>alert(1)</script>\n\n[link](javascript:alert(1))'} />);
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('a')?.getAttribute('href')).not.toContain('javascript:');
  });
});
