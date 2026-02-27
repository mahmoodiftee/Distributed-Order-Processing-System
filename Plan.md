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

for pid in $(netstat -ano | grep -E ":3001|:3002|:3003" | grep LISTENING | awk '{print $5}' | sort -u); do taskkill //F //PID $pid; done
