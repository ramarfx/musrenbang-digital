import { describe, expect, test } from 'bun:test';
import { mockAdminContentProvider, prepareAdminGeminiAdapter } from './admin-provider';
const synthetic = {
  title: 'Jalan rusak',
  description: 'Fixture sintetis',
  category: 'Infrastruktur',
};
describe('admin privacy gate', () => {
  test('adapter Gemini belum dapat mengirim konten', async () => {
    await expect(
      prepareAdminGeminiAdapter()(synthetic, new AbortController().signal),
    ).rejects.toThrow('privacy approval');
  });
  test('mock diberi label dan tidak mengembalikan isi sumber', async () => {
    const result = await mockAdminContentProvider(synthetic, new AbortController().signal);
    expect(result.model).toBe('mock');
    expect(result.flags).toContain('needs_review');
    expect(JSON.stringify(result)).not.toContain('Fixture sintetis');
  });
});
