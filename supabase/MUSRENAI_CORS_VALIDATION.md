# MusrenAI local gateway CORS investigation

This report covers an isolated local Supabase stack only. It does not establish
how a hosted Supabase gateway behaves. Production was not contacted or changed.

## Setup and attribution

The Supabase CLI local Kong configuration attaches its CORS plugin to the
`/functions/v1/` route. Through Kong, OPTIONS for both an allowed and a
disallowed origin returned 200 with `Access-Control-Allow-Origin: *`. Direct
requests to the Edge Runtime bypassing Kong produced the handler's own response:
the allowed origin received 204 and its explicit allow-origin header, while a
disallowed origin received 403 without an allow-origin header. This comparison
attributes the observed local wildcard to Kong, not the application handler.

Supabase's [CORS documentation](https://supabase.com/docs/guides/functions/cors)
shows wildcard CORS in an example; this does not prove hosted gateway settings
or that a wildcard is appropriate for sensitive endpoints.

## Real browser and HTTP observations

Chrome used an isolated synthetic Auth user and an actual local Auth JWT. The
allowed page ran at `http://localhost:5173`; the disallowed page ran at
`http://127.0.0.1:5174`. The endpoint was the local gateway. JWT verification
remained enabled.

| Origin     | JWT     | Browser-readable result       |
| ---------- | ------- | ----------------------------- |
| Allowed    | Valid   | 200, synthetic answer         |
| Allowed    | Invalid | 401, invalid JWT              |
| Allowed    | Absent  | 401, authentication required  |
| Disallowed | Valid   | 403, ORIGIN_DENIED, no answer |
| Disallowed | Invalid | 401, invalid JWT              |
| Disallowed | Absent  | 403, ORIGIN_DENIED, no answer |

HTTP POST without an Origin returned 200 for the valid local JWT and 401 for
invalid or missing credentials. Lack of Origin is therefore not an access
control boundary for non-browser clients. The successful request exercised the
local draft-request refusal path before provider invocation; it did not call
Gemini. The only provider key in the fixture was an intentionally invalid
synthetic value.

The browser could read the denial body from the disallowed origin because of
the wildcard. No sensitive response was observed from that origin in these
tests. This is not proof that all routes or future handler changes are safe:
server-side origin and JWT checks remain necessary, and a wildcard must not be
relied on to restrict browser access.

## Activation gate

Repeat the OPTIONS and POST matrix with real browser origins and synthetic
identities on a separately authorized staging project before activation. Inspect
hosted gateway behavior and response headers, validate expired JWTs and error
paths there, and verify no sensitive response is readable by disallowed origins.
Do not infer staging or production behavior from the local Kong configuration.
No Gemini request with real citizen data is authorized by this report.
