# TicketHub: Event Ticketing System Design

## 1. Requirements

TicketHub is an online ticketing platform that allows users to browse events, select seats, reserve tickets, and pay securely.

### Functional requirements
- Users can register, log in, and view events.
- Users can view available seats and ticket prices.
- Users can temporarily hold seats while completing checkout.
- Users can place orders and make payments.
- Users can view their order and ticket status.
- The system releases expired unpaid seat holds automatically.

### Non-functional requirements
- **Scalability:** Support 2 million registered users.
- **Performance:** Handle 50,000 daily visitors browsing approximately 10 pages each.
- **Availability:** Remain responsive during major ticket sales.
- **Consistency:** Never sell the same seat to two customers.
- **Security:** Protect personal information and payment transactions.
- **Reliability:** Recover safely from failed requests and payment interruptions.

### Traffic estimates

Normal browsing generates approximately:

50,000 visitors × 10 page views = 500,000 page views per day.

Average page-view request rate:

500,000 ÷ 86,400 ≈ 5.8 requests per second.

For a major sale, 200,000 buyers may compete for 20,000 tickets within 10 minutes. If all buyers submit one purchase-related request, the average is approximately 333 requests per second, with potentially much higher short-lived peaks. If each buyer makes three requests during checkout, the average rises to approximately 1,000 requests per second.

The system must therefore support sudden traffic spikes through caching, queues, rate limiting, and scalable application servers.

## 2. API Design

The API uses REST principles and JSON responses over HTTPS.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/events` | List available events |
| GET | `/api/events/:eventId/seats` | Retrieve seat availability |
| POST | `/api/holds` | Temporarily reserve selected seats |
| POST | `/api/orders` | Create an order from a valid hold |
| POST | `/api/orders/:orderId/payments` | Initiate payment |
| GET | `/api/orders/:orderId` | Retrieve order status |
| DELETE | `/api/holds/:holdId` | Release an active hold |

### Example: Create a seat hold

Request:

```json
{
  "eventId": 101,
  "seatIds": [201, 202]
}
```

The server validates the requested seats and attempts to reserve them within a database transaction. If any seat is unavailable, the transaction fails without creating a partial reservation.

A successful response includes the hold ID, expiration time, and held seats. An unavailable seat returns HTTP 409 Conflict.

Checkout requests use idempotency keys so retrying the same request does not create duplicate orders or charges.

## 3. Database Design

A relational database such as PostgreSQL is appropriate because seat inventory and orders require strong transactional consistency.

### Users table

- `user_id` — primary key
- `full_name` — customer's name
- `email` — unique email address
- `password_hash` — securely hashed password
- `created_at` — account creation timestamp

### Events table

- `event_id` — primary key
- `event_name` — event title
- `venue` — event location
- `event_date` — scheduled date and time
- `status` — event publication or sales status

### Seats table

- `seat_id` — primary key
- `event_id` — foreign key referencing Events
- `seat_number` — seat identifier
- `price` — ticket price
- `status` — AVAILABLE, HELD, or SOLD
- `hold_id` — nullable reference to the active hold
- `hold_expires_at` — nullable expiration timestamp

A unique constraint on `(event_id, seat_number)` prevents duplicate seat definitions for the same event.

### Holds table

- `hold_id` — primary key
- `user_id` — foreign key referencing Users
- `event_id` — foreign key referencing Events
- `status` — ACTIVE, EXPIRED, RELEASED, or CONVERTED
- `expires_at` — hold expiration timestamp
- `created_at` — hold creation timestamp

### Orders table

- `order_id` — primary key
- `user_id` — foreign key referencing Users
- `hold_id` — reference to the hold
- `idempotency_key` — unique key for safe request retries
- `total_amount` — order total
- `status` — PENDING, PAID, FAILED, or CANCELLED
- `created_at` — order creation timestamp

### Order items table

- `order_item_id` — primary key
- `order_id` — foreign key referencing Orders
- `seat_id` — foreign key referencing Seats
- `ticket_price` — price captured at purchase

Each seat can appear in at most one confirmed order item. Enforce this using a database uniqueness constraint on `seat_id` for confirmed ticket allocations, or a dedicated ticket inventory table with an equivalent unique constraint.

### Payments table

- `payment_id` — primary key
- `order_id` — foreign key referencing Orders
- `provider_reference` — unique payment provider reference
- `amount` — amount charged
- `status` — PENDING, SUCCESS, or FAILED
- `created_at` — payment creation timestamp

Store payment references and statuses, not raw card details.

## 4. Preventing Double-Booking

The most critical requirement is ensuring that two buyers cannot purchase the same seat.

### Transaction and row-locking strategy

1. Begin a database transaction.
2. Lock the requested seat rows using `SELECT ... FOR UPDATE`, in a consistent seat-ID order to reduce deadlocks.
3. Check that every requested seat belongs to the correct event and is available, or has a valid expired hold that can be reclaimed.
4. Update all requested seats to HELD and assign the new hold ID and expiration timestamp.
5. Create the hold record and commit the transaction.
6. If any seat is unavailable, roll back the entire transaction.

Example SQL:

```sql
BEGIN;

SELECT seat_id, status, hold_expires_at
FROM seats
WHERE event_id = 101
  AND seat_id IN (201, 202)
ORDER BY seat_id
FOR UPDATE;

-- Application verifies that every requested seat
-- is available or has an expired hold.

UPDATE seats
SET status = 'HELD',
    hold_id = :hold_id,
    hold_expires_at = CURRENT_TIMESTAMP + INTERVAL '10 minutes'
WHERE event_id = 101
  AND seat_id IN (201, 202)
  AND status = 'AVAILABLE';

-- Application verifies that all requested seats
-- were successfully claimed before committing.

COMMIT;
```

In production, the application must also handle expired holds safely, verify the affected-row count, and roll back if any seat cannot be claimed. The simplified update above only claims currently available seats.

### Checkout and payment safety

- Confirm that the hold belongs to the requesting user and has not expired.
- Convert a valid hold into an order inside a transaction.
- Recheck seat ownership and status before marking tickets as sold.
- Use idempotency keys to prevent duplicate orders.
- Use a unique provider payment reference to prevent duplicate payment records.
- Process payment callbacks idempotently and verify them with the payment provider.
- Do not mark tickets as sold solely because a browser reports successful payment.
- Release expired unpaid holds through a scheduled worker or background queue.
- If payment succeeds after a hold expires, reconcile the payment and either complete a valid purchase safely or initiate a refund.

A database transaction and row-level locks protect concurrent seat allocation. Unique constraints provide an additional layer of protection against application errors.

## 5. System Architecture

### Main components

**1. Client application:** A responsive web interface for browsing events, selecting seats, and completing checkout.

**2. CDN and caching:** Serve static assets and cache public event information. Do not use stale cached seat availability as the final authority for purchases.

**3. Load balancer:** Distribute incoming requests across multiple application servers.

**4. Application servers:** Validate requests, authenticate users, enforce business rules, and coordinate reservations and orders.

**5. Relational database:** Store users, events, seats, holds, orders, and payments. Use transactions, indexes, and row-level locking to protect inventory consistency.

**6. Message queue and background workers:** Process payment notifications, expire holds, send ticket confirmations, and retry temporary failures.

**7. Payment gateway:** Process payments through a secure external payment provider.

**8. Monitoring and logging:** Track response times, errors, database contention, queue depth, failed payments, and successful ticket sales.

### Request flow

1. A customer browses events using the client application.
2. The CDN or cache serves public event details.
3. The customer requests a seat hold.
4. The application server validates the request and uses a database transaction to lock and claim the seats.
5. The customer completes checkout and the system creates an order.
6. The payment provider processes the payment.
7. A verified payment notification updates the order and confirms the tickets.
8. Background workers send confirmations and release expired unpaid holds.

### Handling the major sale

- Scale application servers horizontally.
- Use rate limiting and a virtual waiting room to control bursts of incoming traffic.
- Cache event details while reading authoritative seat status from the database during reservation.
- Place non-critical tasks such as email delivery on a queue.
- Use database connection pooling, appropriate indexes, and monitoring.
- Test the expected peak load before major events.
- Keep seat inventory updates transactional even when requests are queued or distributed across multiple servers.

## 6. Trade-offs and Design Decisions

### Relational database versus NoSQL

A relational database provides transactions, row-level locking, foreign keys, and uniqueness constraints. These features make it suitable for ticket inventory and order consistency. The trade-off is that heavy concurrent writes may create contention, requiring indexing, careful transaction design, and database scaling.

### Strong consistency versus eventual consistency

Strong consistency is required when allocating seats and confirming purchases because selling the same seat twice is unacceptable. Event listings and analytics can use cached or eventually consistent data to improve performance. This balances reliable purchasing with fast browsing.

### Temporary holds versus immediate purchase

Temporary holds give customers time to complete checkout and reduce simultaneous competition for the same seats. However, holds can temporarily block inventory when users abandon checkout. Short expiration periods, automated cleanup, and fair waiting-room controls help reduce this problem.

### Queues versus synchronous processing

Queues improve resilience and prevent non-critical tasks from slowing checkout. However, queued work can be delayed or retried, so payment events and ticket issuance must be idempotent and monitored.

## Conclusion

TicketHub should use horizontally scalable application servers, cached public event information, a relational database with transactional seat allocation, temporary holds, idempotent order and payment processing, and background workers.

The highest priority is inventory correctness. Even during a surge of 200,000 buyers competing for 20,000 tickets, every confirmed seat allocation must be protected by database transactions and integrity constraints. Load testing, monitoring, and safe recovery procedures will help the platform remain reliable under peak demand.