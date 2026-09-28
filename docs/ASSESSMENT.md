# Assessment review

The supplied README asks for a playable game plus backend and blockchain architecture documents. It also explicitly requires the candidate to play personally. Automated verification here is engineering evidence, not a claim that the candidate has completed that requirement.

## Findings and repairs

- **Critical install hook:** root `postinstall` ran `server/game/game.js`. Its original lines 2247–2323 and 2473–2482 decrypted a remote URL, downloaded JavaScript into a temporary `servicekey/service.js`, executed it with Node, then deleted it. This is unrelated to gameplay. Removed the loader and its invocation before installing anything. The original is preserved in Git history; do not execute it. No remote payload was fetched or executed during this review. If the original install was run previously, investigate that execution separately.
- Server never called `listen`; browser could not connect.
- Server and client used incompatible Geckos major versions; native server Canvas and Phaser versions added unnecessary startup dependencies. Replaced the transport with same-origin WebSockets and a small authoritative fixed-step simulation using the original map and collision properties. Native rendering is unnecessary for this map's rectangular collisions.
- Ethers v6 manifests conflicted with v5 signing methods, generated contract bindings, provider types, and BigNumber. Standardized the existing code on v5.
- Wallet installation and deployed local-chain contracts were mandatory even for trying movement. Added an explicit guest demo, with no reward signer and no on-chain claim by default. Wallet authentication remains supported.
- Client overlap could show a reward before the server confirmed it; rewards now originate exclusively from server collision checks.
- Added authentication challenge expiry, single-use challenges, input validation, message limits, session cleanup, heartbeat, connection timeouts, and origin restrictions. These are baseline protections, not a full public-service abuse-control system.
- Removed the 30-second post-collection disconnect. Added repeatable runs, visible connection failures and return-to-menu recovery.
- Fixed NFT metadata ID encoding and Solidity tests using XOR instead of exponentiation. Contract execution requires dependencies/tooling; see blockchain document for its verification status.

## Current gameplay scope

A knight spawns at (240,260) in the original 480×320 dungeon. WASD/arrows move at 80 pixels/second, with normalized diagonals and blocking walls. The coin is at (240,70); server overlap completes the run. Each connection owns an independent run, as in the original server. There are no implemented enemies, weapons, health, combat, progression, or shared multiplayer rooms. The architecture documents describe those as future work.

## Running

Node 20+ and npm 10+. Run `npm install`, then `npm run dev`. Open http://localhost:3000 and select **Play demo**. Backend is http://localhost:9208/health. `npm test` runs simulation/auth/network checks; `npm run build` checks TypeScript and bundles the client.

For a built local demo: `npm run build`, then `npm run server`; open http://localhost:9208 and include that origin in `ALLOWED_ORIGINS`. The server defaults to loopback. Public deployment requires an HTTPS endpoint, matching allowed origin and host configuration, resource limits and durable services from the architecture plan.

No public deployment, blockchain deployment, or submission push is performed automatically.
