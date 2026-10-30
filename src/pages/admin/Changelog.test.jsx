import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import Changelog from './Changelog';
import { APP_VERSION } from '../../lib/version';
import { CHANGELOG } from '../../lib/changelog';

afterEach(cleanup);

describe('admin changelog', () => {
  it('shows every release, newest first, with the current one marked', () => {
    render(<Changelog />);

    expect(screen.getByRole('heading', { name: 'سجل التغييرات' })).toBeTruthy();
    expect(screen.getByText('الإصدار الحالي')).toBeTruthy();

    const releases = screen.getAllByTestId('release');
    expect(releases).toHaveLength(CHANGELOG.length);
    expect(within(releases[0]).getByText(`v${CHANGELOG[0].version}`)).toBeTruthy();
    expect(within(releases[0]).getByText(`v${APP_VERSION}`)).toBeTruthy();
    expect(
      within(releases[releases.length - 1]).getByText(`v${CHANGELOG[CHANGELOG.length - 1].version}`)
    ).toBeTruthy();
  });

  it('renders the latest release notes', () => {
    render(<Changelog />);

    expect(screen.getByText(CHANGELOG[0].title)).toBeTruthy();
    expect(screen.getByText(CHANGELOG[0].changes[0])).toBeTruthy();
  });
});
