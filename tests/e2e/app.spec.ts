import { expect, test } from '@playwright/test';

test('loads the workbench with editor and converter panels', async ({ page }) => {
  await page.goto('/');

  // Editor center area
  await expect(page.getByText('Semantic Blocks', { exact: true })).toBeVisible();

  // Converter right panel — source card
  await expect(page.getByLabel('小说来源文本')).toBeVisible();

  // "大纲" button is in Preferences card
  await expect(page.getByRole('button', { name: '大纲' })).toBeVisible();

  // Export bar at bottom of editor (compact, no YAML preview)
  await expect(page.getByRole('button', { name: '复制' })).toBeVisible();
  await expect(page.getByRole('button', { name: '下载' })).toBeVisible();
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
