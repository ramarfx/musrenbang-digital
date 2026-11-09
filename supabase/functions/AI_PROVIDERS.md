# Penyedia AI MusrenAI

MusrenAI Warga, triage admin, dan saran biaya memakai satu klien OpenAI-compatible
di `supabase/functions/_shared/ai.ts`. Klien ini memanggil
`POST {base}/chat/completions`, jadi penyedia apa pun yang mendukung Chat Completions
dapat dipakai tanpa mengubah handler.

Penyedia yang sudah punya preset:

| `AI_PROVIDER` | Base URL default                                          | Catatan                                                    |
| ------------- | --------------------------------------------------------- | ---------------------------------------------------------- |
| `gemini`      | `https://generativelanguage.googleapis.com/v1beta/openai` | Default; memakai `Authorization: Bearer`                   |
| `openrouter`  | `https://openrouter.ai/api/v1`                            | Model berawalan organisasi, mis. `google/gemini-2.5-flash` |
| `openai`      | `https://api.openai.com/v1`                               | `gpt-4.1`, `gpt-4o-mini`, dan model lain                   |
| `custom`      | wajib `AI_BASE_URL`                                       | Gateway sendiri, Ollama, LiteLLM, dsb.                     |

`custom` menerima `https://`; `http://` hanya untuk `localhost`, `127.0.0.1`, dan
`[::1]`. URL dengan username atau password ditolak.

## Variabel

Setiap nilai dibaca berurutan: override fitur, lalu global, lalu nama lama.

| Nilai    | Global                 | Per fitur                      | Lama (khusus key/model)   |
| -------- | ---------------------- | ------------------------------ | ------------------------- |
| Penyedia | `AI_PROVIDER`          | `AI_<FITUR>_PROVIDER`          | —                         |
| Base URL | `AI_BASE_URL`          | `AI_<FITUR>_BASE_URL`          | —                         |
| API key  | `AI_API_KEY`           | `AI_<FITUR>_API_KEY`           | `GEMINI_API_KEY`          |
| Model    | `AI_MODEL`             | `AI_<FITUR>_MODEL`             | `GEMINI_MODEL`            |
| Format   | `AI_STRUCTURED_OUTPUT` | `AI_<FITUR>_STRUCTURED_OUTPUT` | —                         |
| Referer  | `AI_REFERER`           | `AI_<FITUR>_REFERER`           | `MUSRENAI_ALLOWED_ORIGIN` |
| Judul    | `AI_TITLE`             | `AI_<FITUR>_TITLE`             | —                         |

`<FITUR>` adalah `CHAT`, `TRIAGE`, atau `COST_HINT`. Tanpa nama lama, konfigurasi
lama tetap berjalan: `GEMINI_API_KEY` dan `GEMINI_MODEL` otomatis memakai preset
Gemini.

`AI_STRUCTURED_OUTPUT` berisi `json_schema` (default) atau `json_object`. Gunakan
`json_object` bila model menolak skema ketat; validator server tetap menjadi lapis
kedua. `AI_REFERER` dan `AI_TITLE` hanya dikirim ke OpenRouter sebagai atribusi.

Konfigurasi dianggap tidak lengkap bila key, model, atau base URL tidak ada. Handler
gagal tertutup, bukan diam-diam memakai penyedia lain.

## Contoh

Semua fitur di Gemini (perilaku lama):

```bash
supabase secrets set \
  AI_PROVIDER=gemini \
  AI_API_KEY="$GEMINI_API_KEY" \
  AI_MODEL=gemini-2.5-flash
```

Chat dan saran biaya di Gemini, triage admin di OpenRouter:

```bash
supabase secrets set \
  AI_PROVIDER=gemini \
  AI_API_KEY="$GEMINI_API_KEY" \
  AI_MODEL=gemini-2.5-flash \
  AI_TRIAGE_PROVIDER=openrouter \
  AI_TRIAGE_API_KEY="$OPENROUTER_API_KEY" \
  AI_TRIAGE_MODEL=google/gemini-2.5-flash
```

Triage memakai model yang tidak mendukung skema ketat:

```bash
AI_TRIAGE_STRUCTURED_OUTPUT=json_object
```

Gateway sendiri:

```bash
AI_PROVIDER=custom \
AI_BASE_URL=https://ai-gateway.example/v1 \
AI_API_KEY=... \
AI_MODEL=my-model
```

Setelah mengubah secret, deploy ulang fungsi yang terdampak. Flag aktivasi tetap
terpisah: `MUSRENAI_AI_ENABLED` (nama lama `MUSRENAI_GEMINI_ENABLED`),
`MUSRENAI_ADMIN_TRIAGE_ENABLED`, dan `MUSRENAI_COST_HINT_ENABLED`.

## Batas yang tidak berubah

- Kuota percobaan provider tetap 10 per menit dan 300 per hari, dihitung per
  percobaan jaringan termasuk retry. Kuota ini tidak mengenal penyedia.
- Hanya 5xx dan kegagalan jaringan yang diulang. 429 dan 4xx tidak diulang.
- Data pribadi disamarkan oleh `_shared/pii.ts` sebelum dikirim. Jangan menambah
  data baru ke prompt tanpa memperbarui review privasi.
- Jangan mencatat key, isi usulan, atau balasan model. Log hanya tahap dan kode tetap.
- Gunakan akun free tier atau batas biaya yang disetujui. Satu key aktif per
  penyedia; rotasi hanya untuk keamanan, bukan untuk menghindari kuota.
