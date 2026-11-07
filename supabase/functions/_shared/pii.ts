// Pengenal data pribadi bersama untuk semua fungsi MusrenAI. Nomor boleh memakai spasi,
// titik, atau strip di antara digit, karena itulah format yang umum ditulis warga.
const EMAIL = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi;
const PHONE = /(?:\+62|\b62|\b0)[\s.-]?8(?:[\s.-]?\d){7,12}\b/g;
const NATIONAL_ID = /\b\d(?:[\s.-]?\d){15}\b/g;
const ID_LABEL = /\b(?:nik|ktp)\s*[:#-]?\s*\d+/gi;

export function redact(text: string): string {
  return text
    .replace(EMAIL, '[email disamarkan]')
    .replace(PHONE, '[telepon disamarkan]')
    .replace(NATIONAL_ID, '[nomor identitas disamarkan]')
    .replace(ID_LABEL, '[nomor identitas disamarkan]');
}

export function containsPersonalData(text: string): boolean {
  return [EMAIL, PHONE, NATIONAL_ID, ID_LABEL].some((pattern) =>
    new RegExp(pattern.source, pattern.flags.replace('g', '')).test(text),
  );
}
