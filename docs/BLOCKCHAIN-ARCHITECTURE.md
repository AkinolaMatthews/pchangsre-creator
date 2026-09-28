# Blockchain architecture

## Existing implementation and limits

`ClaimVerifier` verifies an EIP-712 server signature bound to chain ID, verifier contract, manager, recipient and deadline. Approved `ClaimManagerERC721` contracts mint at most once per recipient. That is a one-time achievement NFT, not a general repeatable coin economy. Authentication alone never proves reward eligibility; the simulation must observe collection.

The demo does not require a wallet or a chain and does not mint tokens. Optional wallet mode uses local chain 31337 and the supplied contract addresses. Reward signing is disabled unless `REWARD_SIGNER_KEY` is explicitly configured; deployment must register the matching public signer. The server now uses a five-minute expiry rather than an unlimited deadline. There is no automatic contract deployment or real-money transaction.

The original Solidity setup uses missing Git submodules and a Hardhat source directory that does not exist. Existing contracts remain reference code; contract execution is not part of the verified local gameplay path. Before enabling rewards, pin compatible Solmate, OpenZeppelin 4.x and forge-std revisions, run the Foundry suite, deploy to a local chain, and verify signatures end-to-end. Do not infer deployed bytecode from the example address constants.

## Proposed asset model

Use an EVM rollup with low transaction costs and measured confirmation/finality behavior. Choose the specific chain after operational evaluation; do not encode a claimed fee or finality guarantee into game rules.

- ERC-721: unique, tradable characters or unique weapons when actual ownership is useful.
- ERC-1155: stackable items, weapon types and season badges, enabling batch minting.
- Points, health, experience, cooldowns, enemy AI, positions, room state and combat: off-chain authoritative state. These change too frequently for synchronous transactions.
- Character progression: off-chain by default; optionally publish periodic commitments or achievement proofs. Avoid asserting that a commitment makes dishonest server events trustworthy.
- Enemies and rooms: do not tokenize transient entities. Only persist an on-chain asset when players need durable transferable ownership.

Ownership on-chain controls transfers; indexed state is a cache. Lock/escrow an asset during a competitive run, or bind a loadout to a finalized ownership snapshot with clear rules about transfers. Never rely on a stale cache to authorize simultaneous use by both sender and receiver.

## Reward lifecycle without gameplay stalls

1. Simulation detects an eligible event and emits a stable run/reward identifier.
2. A database transaction records inventory, reward entitlement and an outbox event with a uniqueness constraint.
3. The client immediately sees an earned or pending reward and keeps playing.
4. A dedicated signer validates the committed entitlement and signs a typed claim containing reward ID, recipient, asset ID, amount, nonce, season, deadline, chain ID and verifying contract.
5. The player claims later or an authorized relayer batches claims. A transaction queue manages gas, nonce allocation, replacement and bounded retries.
6. An indexer moves status from submitted to included to finalized. Reorgs revert unfinalized projections. Display precise states, not “owned on-chain” before finality.

On-chain replay protection must consume a reward ID/nonce before minting. The current per-recipient `hasClaimed` restriction only suits one-time badges. General rewards need per-entitlement uniqueness, not signature bytes as replay keys. Restrict issuance to approved asset contracts, validate receiver and domain, enforce deadline, reject invalid signatures, and use reviewed ECDSA recovery. Keep signing keys out of game workers in production; use a signing service/HSM with quotas and audit logs. Admin authority should be a multisig with signer revocation and emergency pause.

## Gas and batching

Aggregate stackable rewards and use batch mint/claim entrypoints. For large distributions, publish a Merkle root per epoch and let players submit proofs with a claimed-index bitmap. Bind leaf format to recipient, amount, asset, epoch and chain/domain. Root publication introduces a trust and availability dependency: preserve manifests and define correction/revocation rules before publishing.

Defer claims until a player wants withdrawal or trade. Avoid a transaction per movement, hit or pickup. Sponsored transactions can hide the gas payment interaction but do not eliminate gas costs; apply sponsorship budgets and abuse controls. Benchmark calldata size, batch size, proof verification and L2 data costs with realistic workloads.

## Verification before a public release

Test valid claim, wrong receiver, wrong manager, untrusted/revoked signer, wrong chain/domain, expired packet, replay after transfer, duplicate rewards, paused mint, outbox redelivery, relayer replacement and reorg recovery. The metadata fix converts token IDs to decimal strings rather than appending binary integers. Solidity test deadlines now use `type(uint256).max` instead of bitwise XOR; fuzz keys must be below the secp256k1 order. These source corrections still require contract compilation and execution with pinned dependencies.
