import { expect, test, type Page } from '@playwright/test';

const memoryVerses = [
  {
    id: 'memory-1',
    ref: '요한복음 5:6',
    text: '예수께서 그 누운 것을 보시고 병이 얼마큼 되었느냐 물으시니',
    createdAt: '2026-08-14T09:00:00.000Z',
    updatedAt: '2026-08-14T09:00:00.000Z',
    box: 1,
    level: 2,
    nextReviewAt: '2020-01-01T09:00:00.000Z',
    reviewCount: 2,
    successCount: 2,
    failCount: 0,
    streak: 3,
    successInCurrentLevel: 1,
    source: 'manual',
  },
  {
    id: 'memory-2',
    ref: '시편 23:1',
    text: '여호와는 나의 목자시니 내게 부족함이 없으리로다',
    createdAt: '2026-08-13T09:00:00.000Z',
    updatedAt: '2026-08-13T09:00:00.000Z',
    box: 4,
    level: 4,
    nextReviewAt: '2099-08-14T09:00:00.000Z',
    reviewCount: 8,
    successCount: 7,
    failCount: 1,
    streak: 7,
    successInCurrentLevel: 2,
    source: 'manual',
  },
];

async function openMemorizationHome(page: Page) {
  await page.addInitScript((verses) => {
    localStorage.clear();
    localStorage.setItem('sion_memory_verses', JSON.stringify(verses));
    localStorage.setItem('gb_theme', 'a-soft');
  }, memoryVerses);
  await page.goto('/');
  await page.getByRole('button', { name: '암송 탭' }).click();
  await expect(page.getByText('오늘의 말씀을')).toBeVisible();
}

test.describe('암송 홈 업그레이드 UI', () => {
  test('5단계 학습 진행도와 현재 단계를 보여준다', async ({ page }) => {
    await openMemorizationHome(page);

    const progress = page.getByRole('region', { name: '암송 학습 단계' });
    await expect(progress).toBeVisible();
    await expect(progress.getByRole('heading', { name: '부분 빈칸' })).toBeVisible();
    await expect(progress.getByText('2 / 5 단계')).toBeVisible();
    await expect(progress.getByText('집중 읽기')).toBeVisible();
    await expect(progress.getByText('마음에 새기기')).toBeVisible();
  });

  test('오늘의 보상과 성장 정원을 실제 데이터로 렌더링한다', async ({ page }) => {
    await openMemorizationHome(page);

    await expect(page.getByRole('region', { name: '오늘의 보상' })).toContainText('복습 완료 9회');
    await expect(page.getByRole('region', { name: '오늘의 보상' })).toContainText('+10');

    const garden = page.getByRole('region', { name: '성장 정원' });
    await expect(garden).toBeVisible();
    await expect(garden).toContainText('은혜 성장 정원');
    await expect(garden).toContainText('50% 성장');
    await expect(garden.getByAltText('성장한 말씀 꽃')).toHaveCount(1);
    await expect(garden.getByAltText('자라는 말씀 새싹')).toHaveCount(3);
  });

  test('오늘 복습 버튼이 실제 연습 화면으로 진입한다', async ({ page }) => {
    await openMemorizationHome(page);

    await page.getByRole('button', { name: '오늘 말씀 복습하기' }).click();
    await expect(page.getByText('2단계 · 부분 빈칸')).toBeVisible();
    await expect(page.getByText('요한복음 5:6')).toBeVisible();
  });
});
