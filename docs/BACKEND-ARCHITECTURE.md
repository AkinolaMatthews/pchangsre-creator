# Backend architecture

## Starting point

The runnable implementation is a single Node process with independent player runs, a 60 Hz server simulation, 30 Hz snapshots and a Phaser renderer. Inputs are directional booleans, never client coordinates or reward claims. The client smooths authoritative snapshots. WebSocket ordering is a reasonable baseline for this small map; [ws documentation](https://github.com/websockets/ws/blob/master/doc/ws.md) describes upgrade handling and payload limits. Map collisions use the original Tiled collision properties; see [Phaser tilemap documentation](https://docs.phaser.io/api-documentation/function/tilemaps).

The current demo is deliberately ephemeral: restarts lose sessions, no database is connected, and isolated runs do not display other players. Shared rooms below are a proposed evolution, not shipped functionality.

## Persistence and DB layer

Use PostgreSQL as the authority for durable player state. Suggested tables: players(id, wallet_address unique, created_at); characters(id, player_id, level, xp, revision); runs(id, player_id, room_id, map_version, status, started_at, finished_at); inventory(id, player_id, asset_type, quantity, revision); rewards(id, run_id, player_id, asset_type, amount, status, claim_nonce, chain_id, transaction_hash); outbox(id, event_type, aggregate_id, payload, published_at); chain_events(chain_id, tx_hash, log_index, block_number, block_hash, finalized).

Unique (run_id, player_id, asset_type) prevents duplicate rewards; unique (chain_id, tx_hash, log_index) deduplicates chain events. Store chain quantities as integer/decimal types, never floating point. Use migrations, parameterized queries and repository methods with explicit transaction contexts. Atomically write the completed run, inventory grant, reward and outbox entry. Optimistic revision checks handle inventory races. Back up the database and test restore procedures.

Do not write coordinates each tick. Keep room simulation in memory and checkpoint durable run events. Decide explicitly whether a crashed unfinished run restarts (acceptable initial policy) or resumes from a versioned snapshot plus input/event log.

## Rooms and real-time networking

A session service issues short-lived, audience-bound join tokens after wallet or account authentication. A matchmaker selects a region and room based on latency, capacity and game version. A directory maps room IDs to worker leases; clients connect through a gateway to the owning worker. One worker owns each room, preventing split-brain simulation. Include a fencing epoch in persistence writes and reject stale leases.

For shared rooms, add player IDs, sequenced inputs, tick IDs, acknowledged input sequences and a server-controlled entity list. Run simulation at 60 Hz, send 15–30 Hz delta snapshots, interpolate remote actors, and reconcile local prediction against acknowledged input. Bound input queues and time deltas, validate actions, and drop slow consumers. Reconnect with a signed session token and a fresh full snapshot; do not replay stale movement. Disconnect timeout stops movement immediately and releases room slots.

## Services and scaling

Begin with one deployable application and separated modules. Split only when traffic/ownership warrants it:

1. API/auth service: accounts, challenge issuance, short-lived sessions.
2. Matchmaker/session directory: capacity and room placement.
3. Game workers: tick loop and authoritative rules, no transaction waiting.
4. Progression/reward service: durable grants and outbox publishing.
5. Chain worker/indexer: submit/retry claims and reconcile finality.

Use Redis for session TTLs, rate limits, room directory leases and short-lived profile caches. PostgreSQL remains authoritative for inventory and rewards. Cache keys carry character revisions or are invalidated by committed outbox events. Cache loss must not create or duplicate rewards. Avoid using Redis pub/sub as a durable reward queue; use a durable broker/stream with acknowledgements and idempotent consumers. Assume at-least-once delivery.

A load balancer handles HTTPS and WebSocket upgrade. Connections stay on their chosen room worker. Kubernetes can run stateless APIs behind Services, room workers on a separately scaled pool, and queue consumers as deployments. Drain workers before updates: refuse new rooms, let existing runs finish, then exit. Autoscale using active room capacity and tick-loop lag, not CPU alone. Pin container/runtime versions, run as a non-root user, expose readiness separately from liveness, and keep credentials in a secret manager. No Kubernetes stack is required for the local assessment demo.

## Reliability and capacity

Track active sockets, room counts, tick p95/p99 duration, event-loop lag, bytes per second, reconnect failures, DB latency, outbox backlog and claim age. Set SLOs only after load measurement; a reasonable initial target is p99 simulation work below the 16.7 ms tick budget. Load-test realistic room sizes and movement patterns, then determine rooms per worker. Route players to nearby regions; never stretch one latency-sensitive simulation across regions.

Use bounded retries with jitter, queue dead-letter handling, DB connection pools, admission control, per-account/IP limits, challenge expiry and key rotation. Database outage should stop durable reward issuance or visibly mark it pending, never mint from uncommitted client state. Reward service and blockchain outages must not halt the simulation. End-to-end tests should include disconnect/rejoin, duplicate input, duplicate reward delivery, worker restart, queue redelivery, and chain reorganization.
