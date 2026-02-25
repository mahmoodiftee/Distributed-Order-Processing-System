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