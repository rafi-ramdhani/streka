import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { core } from '../core';
import { Trends } from './Trends';

beforeEach(() => {
  core.useLogs.setState({ entries: [] });
});
afterEach(cleanup);

describe('Trends (honest, empty account)', () => {
  it('drops the steps stat and its seed', () => {
    render(<Trends />);
    expect(screen.queryByText('best step day')).toBeNull();
    expect(screen.queryByText('8,246')).toBeNull();
  });

  it('shows an honest empty weight, not a fake 72.4', () => {
    render(<Trends />);
    expect(screen.queryByText('72.4')).toBeNull();
    expect(screen.queryByText('—')).toBeNull(); // no em dash
  });
});
