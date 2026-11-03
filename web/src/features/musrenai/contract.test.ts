import { describe, expect, test } from 'bun:test';
import { parseChatResponse } from './contract';

const valid = {
  answer: 'Contoh jawaban',
  links: [{ label: 'Usulan', path: '/usulan', requires_auth: false }],
  disclaimer: null,
  request_id: 'id',
};
describe('kontrak respons MusrenAI', () => {
  test('menerima jawaban dan rute internal yang dikenal', () => {
    expect(parseChatResponse(valid)).toEqual(valid);
  });
  test('menolak navigasi ke situs luar atau rute tidak dikenal', () => {
    for (const path of [
      'https://evil.example',
      '//evil.example',
      '/admin',
      '/usulan?next=https://evil.example',
    ]) {
      expect(() => parseChatResponse({ ...valid, links: [{ ...valid.links[0], path }] })).toThrow();
    }
  });
  test('menolak respons kosong atau rusak', () => {
    expect(() => parseChatResponse({ ...valid, answer: '' })).toThrow();
    expect(() => parseChatResponse({ error: 'unavailable' })).toThrow();
  });
});
