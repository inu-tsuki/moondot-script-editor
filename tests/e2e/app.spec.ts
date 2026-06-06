import { expect, test } from '@playwright/test';

test('loads the workbench and switches output tabs', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('Source', { exact: true })).toBeVisible();
  await expect(page.getByText('Semantic Blocks', { exact: true })).toBeVisible();
  await expect(page.getByText('Output', { exact: true })).toBeVisible();

  const outputPanel = page.getByRole('main').filter({ hasText: 'Output' });

  await outputPanel.getByRole('button', { name: 'Diagnostics' }).click();
  await expect(page.getByText('提交样例满足 3+ 章节检查。')).toBeVisible();

  await outputPanel.getByRole('button', { name: 'YAML' }).click();
  await expect(page.locator('.yaml-preview')).toContainText('schemaVersion');
});

test('selected block toolbar does not drive manuscript block height', async ({ page }) => {
  await page.goto('/');

  const block = page.getByTestId('script-block-blk_001');
  await page.getByLabel('Select block blk_001').click();

  await expect(page.getByTestId('block-toolbar-blk_001')).toBeVisible();

  const blockBox = await block.boundingBox();
  expect(blockBox?.height).toBeLessThan(72);
});

test('mobile toolbar falls below content instead of squeezing the block row', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await page.getByLabel('Select block blk_001').click();

  const blockBox = await page.getByTestId('script-block-blk_001').boundingBox();
  const toolbarBox = await page.getByTestId('block-toolbar-blk_001').boundingBox();

  expect(toolbarBox?.y).toBeGreaterThan((blockBox?.y ?? 0) + 16);
  expect(toolbarBox?.x).toBeLessThan((blockBox?.x ?? 0) + 40);
});
