# MusrenAI Admin: auto-flagging backend, local work in progress

Migration 11 (MusrenAI Warga) is in the repository; production installation has not been verified by this change. Migration 12 is local only and has not been deployed. This work never changes moderation decisions.

The worker module uses a queue interface, with no network provider or executable production adapter. A trusted database adapter, gateway shared quota enforcement, scheduler and independent concurrency tests are required before integration or deployment. Do not connect this prototype to Gemini or real residents. The existing citizen limiter counts citizen requests, not all provider attempts, and must not be treated as a shared provider budget.

The RPC `get_proposal_ai_review(p_proposal_id)` requires an authenticated admin. Its `not_analyzed`, `pending`, `processing`, `completed`, `failed`, and `stale` states are distinct; flags and reasons are advisory. An enqueue exception does not block a proposal, but a trusted periodic reconciler is needed to find missed jobs. Review and job records cascade on proposal deletion.

## Future summary design, not implemented

The default admin filter is `Menunggu`, with `Disetujui` and `Semua` also available. Statistics come from SQL. Narratives must cite source proposals and distinguish a complete dataset from a sample.
