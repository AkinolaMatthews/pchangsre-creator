# Technical Assessment

## Challenge

It is a simple roguelike game built with **Phaser.js and Node.js**. It is a Crypto Play-to-Earn game.

Your first task is to get the game running successfully, fix any issues you find, and then **play the game yourself** to understand how the gameplay works.

### How to Run the Game

#### Requirements

- Node.js v20 or higher
- npm v10 or higher
- Git

#### 1. Clone the repository

```bash
git clone https://github.com/davideliasdev11/TechnicalAssessment.git
cd TechnicalAssessment
```

#### 2. Install dependencies

```bash
npm install
```

This installs the root, server, and client dependencies.

#### 3. Start the game server

Open a terminal and run:

```bash
npm run server
```

The multiplayer server runs on port **9208**.

#### 4. Start the client

Open another terminal and run:

```bash
npm run client
```

The client runs on port **3000**.

#### 5. Open the game

Open:

```text
http://localhost:3000
```



If you have problems running the project, you should investigate and fix them yourself. For example, the current README mentions possible `nodemon`, port, Canvas, and Node.js version issues.

---

# Backend Developer

After getting the game running and understanding the gameplay, design a **good backend architecture** for this game.

Create a technical document explaining:

- Database architecture and DB layer.
- Multiplayer real-time communication between the game client and server.
- How you would scale the backend when there are many players.
- How you would handle game rooms and multiplayer sessions.
- How you would use caching.
- How you would make the system reliable and scalable.

You can choose any technology, programming language, database, framework, or library that you think is appropriate.

### Microservices

If possible, also provide a **microservice architecture** for the game.

Think about how the system could handle very large gameplay traffic and many concurrent players.

You may include technologies such as:

- Docker
- Kubernetes
- Redis or another cache
- Message queues
- Load balancing

You don't have to use these exact technologies. Choose what you think is appropriate and explain your decisions.

---

# Blockchain Engineer

Design the **smart-contract architecture** for this game.

You can choose **any blockchain network or ecosystem you want**. For example, you can use an **EVM-compatible network (Ethereum, Polygon, Arbitrum, Base, etc.)**, **Solana**, or another blockchain you think is appropriate.

**The choice of blockchain does not matter.** We are more interested in your architecture, technical decisions, and understanding of how blockchain should be integrated into the game.

Consider how the following could be represented on the blockchain:

- Game characters
- Items
- Weapons
- Points/rewards
- Enemies
- Rooms
- Player progression
- Character status
- Item ownership

Characters, items, weapons, and other game assets may be represented as NFTs where appropriate.

For character/player status, consider information such as:

- Health
- Level
- Items owned
- Weapons owned
- Progression

Explain what should be stored on-chain and what should remain off-chain.

---

# Gas Fees & Game Performance

This is an important part of the challenge.

The game should feel **fast and smooth**.

For example:

> A player receives an item during gameplay.

The player should not have to wait for a blockchain transaction to finish before continuing to play.

Explain how you would handle this situation while still keeping blockchain ownership/state secure.

Think about:

- Gas optimization.
- Batch transactions.
- Off-chain processing.
- Signed messages.
- Layer 2 networks.
- Transaction queues.
- Delayed/async blockchain updates.
- Any other solution you think is appropriate.

You should explain **how you would save gas when there are a large number of transactions** and **how you would prevent blockchain transaction latency from affecting gameplay**.

The existing project already demonstrates one possible approach where the authoritative game server determines that a reward has been earned and signs a message that can later be verified by the smart contract.

You may use this approach, improve it, or propose a completely different solution.

---

# Deliverables

Please provide:

1. **A working game**
   - Fix the issues required to run the game.
   - Make sure the game can be played successfully.

2. **Backend architecture document**
   - DB layer.
   - Multiplayer networking.
   - Scalability.
   - Microservices, if applicable.
   - Docker/Kubernetes, if applicable.
   - Cache mechanism.

3. **Blockchain architecture document**
   - Smart-contract design.
   - NFT/asset ownership.
   - On-chain/off-chain architecture.
   - Gas optimization.
   - Fast gameplay / transaction strategy.

4. **Code and configuration**
   - Any code you implement.
   - Smart contracts if you implement them.
   - Docker/Kubernetes configuration if applicable.

---

# Submission

Once you have completed the challenge:

1. Push your work to **your own Git repository**.
2. Make sure the repository contains your code and technical documents.

---

## Important

**Do not use AI to understand the gameplay. You must play the game yourself.**

We want to see that you actually ran the project, played the game, and understood how it works before designing your architecture.

We may evaluate the submission based on whether your technical decisions demonstrate a real understanding of the game's gameplay and existing implementation.

Good luck!