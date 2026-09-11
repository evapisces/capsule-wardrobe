import { test, expect, type Page } from '@playwright/test';
import { stubApi, TRIP_ID } from './fixtures/api';

/**
 * Real horizontal-overflow guard for the mobile/tablet responsiveness work
 * (#3–#6). For every route × supported narrow viewport we lay the page out in
 * headless Chromium and assert:
 *
 *   document.documentElement.scrollWidth <= clientWidth + 1
 *
 * plus the same check with the mobile nav menu open, and with the
 * `/trips/:id` "Link capsule" bottom sheet open.
 *
 * jsdom does no layout, so `client/src/__tests__/overflow.test.tsx` can only
 * assert component style contracts — this file is what actually catches a new
 * fixed-width element, a grid track floor above 320px, or an unclamped popover.
 */

// The four widths every responsiveness issue called out: 320 / 375 / 390 phones
// and the 768 tablet breakpoint.
const MOBILE_WIDTHS = [320, 375, 390] as const;
const ALL_WIDTHS = [...MOBILE_WIDTHS, 768] as const;
const VIEWPORT_HEIGHT = 900;

const ROUTES = [
  { path: '/', label: 'closet (/)' },
  { path: '/capsules', label: 'capsules' },
  { path: '/trips', label: 'trips' },
  { path: '/insights', label: 'insights' },
] as const;

interface OverflowReport {
  scrollWidth: number;
  clientWidth: number;
  bodyScrollWidth: number;
  offenders: { tag: string; cls: string; id: string; right: number; width: number }[];
}

async function measureOverflow(page: Page): Promise<OverflowReport> {
  return page.evaluate(() => {
    const docEl = document.documentElement;
    const limit = docEl.clientWidth + 1;
    const offenders: OverflowReport['offenders'] = [];
    document.querySelectorAll<HTMLElement>('body *').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      // Ignore elements the author deliberately parked off the left edge.
      const style = window.getComputedStyle(el);
      if (style.position === 'fixed' && el.getAttribute('aria-hidden') === 'true') return;
      if (rect.right > limit) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: typeof el.className === 'string' ? el.className : '',
          id: el.id || '',
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        });
      }
    });
    return {
      scrollWidth: docEl.scrollWidth,
      clientWidth: docEl.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      offenders: offenders.slice(0, 8),
    };
  });
}

async function expectNoHorizontalOverflow(page: Page, context: string): Promise<void> {
  const report = await measureOverflow(page);
  expect(
    report.scrollWidth,
    `${context}: documentElement.scrollWidth ${report.scrollWidth} > clientWidth ${report.clientWidth} + 1\n` +
      `offending elements: ${JSON.stringify(report.offenders, null, 2)}`,
  ).toBeLessThanOrEqual(report.clientWidth + 1);
}

test.beforeEach(async ({ page }) => {
  await stubApi(page);
});

test.describe('no horizontal overflow at mobile / tablet widths', () => {
  for (const width of ALL_WIDTHS) {
    for (const route of ROUTES) {
      test(`${route.label} @ ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
        await page.goto(route.path);
        await expect(page.locator('nav')).toBeVisible();
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expectNoHorizontalOverflow(page, `${route.label} @ ${width}px`);
      });
    }
  }
});

test.describe('no horizontal overflow with the mobile nav menu open', () => {
  for (const width of MOBILE_WIDTHS) {
    for (const route of ROUTES) {
      test(`${route.label} @ ${width}px, menu open`, async ({ page }) => {
        await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
        await page.goto(route.path);
        await page.getByRole('button', { name: 'Menu' }).click();
        await expect(page.locator('#mobile-nav-list')).toBeVisible();
        await expectNoHorizontalOverflow(page, `${route.label} @ ${width}px, menu open`);
      });
    }
  }
});

test.describe('no horizontal overflow with the /trips/:id capsule-link sheet open', () => {
  for (const width of ALL_WIDTHS) {
    test(`trip detail @ ${width}px, link-capsule sheet open`, async ({ page }) => {
      await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
      await page.goto(`/trips/${TRIP_ID}`);
      await page.getByRole('button', { name: 'Link capsule' }).click();
      const sheet = page.getByRole('dialog', { name: 'Link a Capsule' });
      await expect(sheet).toBeVisible();
      // Sheet has real content so its width is actually exercised.
      await expect(sheet.getByRole('button', { name: /Capsule/ }).first()).toBeVisible();
      await expectNoHorizontalOverflow(page, `trip detail @ ${width}px, sheet open`);
    });
  }
});
