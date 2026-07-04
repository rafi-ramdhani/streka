import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import Page, { metadata } from './page';

afterEach(cleanup);

describe('landing page', () => {
  it('exposes SEO metadata with no em dashes', () => {
    expect(metadata.title).toBe('Streka - One slash a day. Keep the streak.');
    expect(String(metadata.description)).toContain('fitness tracker for people building a habit');
    expect(String(metadata.title)).not.toContain('—');
    expect(String(metadata.description)).not.toContain('—');
  });

  it('renders the hero copy and contains no em dashes', () => {
    const { container } = render(<Page />);
    expect(screen.getByText(/fitness tracker for people building a habit/i)).toBeTruthy();
    expect(container.textContent).not.toContain('—');
  });

  it('web-app preview matches the real web app (no steps feature, no phone-sync claim)', () => {
    const { container } = render(<Page />);
    // The web dashboard has no steps tracker and does not sync "from iPhone";
    // the #web preview must not claim either. (The phone hero mockup is separate
    // roadmap art and legitimately still shows watch-driven steps.)
    expect(container.textContent).not.toContain('steps today');
    expect(container.textContent).not.toContain('Synced from iPhone');
  });
});
