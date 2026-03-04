## Implementation Steps

1. first ran pnpm init to initialize the project for microservices
2. created apps/folders and libs/folders
3. started working on order-service

- first pnpm init then rewrote the package.json then pnpm i
- created tsconfig.json and rewrote it to make it suitable for the project
- then ran npx prisma init
- changed DATABASE_URL in .env
- modified prisma/schema.prisma because An order belongs to a customer, references a product, has a quantity, and has a status that changes as it moves through the flow. This is the single source of truth for the order lifecycle — no other service owns this data.
- ran npx prisma migrate dev --name init
- then starded actual coding for handling http standard methods for order-service
- We build from the bottom (database layer) up to the top (controller). This is how you should always think — data first, then logic, then interface.
- made prisma.service.ts for connecting to database
- made order/dto/create-order.dto.ts for validating incoming requests
- made order.service.ts for handling business logic
- made order.controller.tsorder.controller.ts for handling http requests
- made order.module.ts for organizing the code
- made app.module.ts for importing order.module.ts
- made main.ts for running the app

What Inventory Service needs to do

Own a list of products and their stock levels
Expose a POST /inventory/reserve endpoint
Check if enough stock exists
Deduct it atomically (no overselling)
Return success or failure to Order Service

## Kafka Implementation Steps

1. created events.ts and topics.ts in libs/contracts which will act as contract between transaction
2. created processedEvent table on order, inventory, payment db to keep track of processed events
3. ran npx prisma migrate dev --name add_processed_events on all services
4. Rewrite Order Service to send events to kafka instead of calling inventory and payment service directly
5.

Choreography = everyone improvises and hopes it works out (Phase 1)
Orchestration = one conductor coordinates everyone (Phase 2)

for pid in $(netstat -ano | grep -E ":3001|:3002|:3003|:3004" | grep LISTENING | awk '{print $5}' | sort -u); do taskkill //F //PID $pid; done

Production-Level Understanding
State Management: LLMs are stateless. To have a "conversation," you must store the message history in Firestore and send the relevant history back with every new request.

Cost & Latency: High-end models (GPT-4o, Claude 3.5 Sonnet) are slow and pricey. For simple tasks (summarizing a short note), use a smaller/faster model (Gemini Flash, GPT-4o-mini).

Secret Management: Never put your API keys in the React code. They must stay in Firebase Functions environment variables.

The real answer is: Kafka already solves this for you.
When Payment Service goes down, Kafka doesn't throw the message away. It holds it. When Payment Service comes back up and reconnects to its consumer group, Kafka replays every unprocessed message automatically.
This is called consumer offset management. Kafka tracks the last message each consumer group successfully processed. If a service dies mid-processing, Kafka replays from that offset when it reconnects.
So in a properly configured system:
Saga emits PROCESS_PAYMENT → Kafka holds it
Payment Service goes down
Payment Service comes back up → reconnects to consumer group
Kafka replays PROCESS_PAYMENT → Payment processes it
Done — no recovery job needed

So why did your test fail earlier?
Because your Payment Service had never connected before. Kafka had no offset recorded for payment-service-consumer group. With fromBeginning: false (the default), Kafka only delivers messages that arrive after the consumer connects — so the message was never replayed.
The fix for local testing is fromBeginning: true in your payment service consumer. In production this is handled by Kafka's offset retention policy and consumer group configuration.

What production systems actually use for genuine recovery:
For transient failures (service temporarily down) — Kafka consumer offset replay handles it automatically. No code needed.
For poison pill messages (message that always causes a crash) — Dead Letter Queue. After N failed attempts, move the message to a separate topic for manual inspection.
For long-running stuck sagas (business logic failures) — A scheduled job, but not setInterval. Real systems use a proper job scheduler like Bull, BullMQ, or a cron job that runs in a separate worker process. The difference is reliability — setInterval dies when the process dies, a proper queue persists across restarts.
For cross-service timeouts — Saga sets a timeout when it emits a command. If no response arrives within that window, it treats it as a failure and compensates. This is called a saga timeout.

What this means for your project:
For learning purposes your setInterval is fine and demonstrates the concept correctly. But if someone asks you in an interview how production systems handle this, the answer is:
Kafka consumer groups handle transient downtime automatically through offset replay. Long-running stuck transactions are handled by timeout-based compensation — the saga sets a deadline when it emits each command, and if no response arrives by that deadline, it compensates rather than waiting indefinitely. Genuinely failed messages that can't be processed go to a Dead Letter Queue for human review.
