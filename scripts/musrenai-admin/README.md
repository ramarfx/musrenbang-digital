# MusrenAI Admin: auto-flagging backend, local work in progress

Migration 11 (MusrenAI Warga) is in the repository; production installation has not been verified by this change. Migrations 12 and 13 are local only and have not been deployed. This work never changes moderation decisions.

The worker module has a PostgreSQL adapter restricted to a named local test database and has no network provider or executable production adapter. Migration 13 reserves a shared provider attempt before each citizen provider call or local admin mock call. The existing citizen message limiter remains separate; a retry must reserve another provider attempt. The default shared limit is configurable and starts at 300 per WIB day. This is an application guard, not a guarantee of the provider quota or billing. A production worker identity, scheduler, privacy review and end-to-end tests are required before deployment. Do not connect this prototype to Gemini or real residents.

The RPC `get_proposal_ai_review(p_proposal_id)` requires an authenticated admin. Its `not_analyzed`, `pending`, `processing`, `completed`, `failed`, and `stale` states are distinct; flags and reasons are advisory. An enqueue exception does not block a proposal, but a trusted periodic reconciler is needed to find missed jobs. Review and job records cascade on proposal deletion.

## Future summary design, not implemented

The default admin filter is `Menunggu`, with `Disetujui` and `Semua` also available. Statistics come from SQL. Narratives must cite source proposals and distinguish a complete dataset from a sample.
