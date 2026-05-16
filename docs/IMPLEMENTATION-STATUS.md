# Zidnee Implementation Tracker

Last updated: 2026-05-16
Reference: [docs/ZIDNEE-MASTER-PLAN.md](docs/ZIDNEE-MASTER-PLAN.md)

## How To Use This File

- Work strictly in step order.
- Mark one step as In Progress at a time.
- Update both Step Status and checklist boxes as work moves.
- A step can move to Implemented only when all checklist items are complete and tests are green.

Status legend:
- Not Started
- In Progress
- Implemented
- Harden Needed

## Progress Snapshot

- Completed steps: 1 / 8
- In-progress step: Step 5 - Counsellor Operations + Inactive Handling
- Overall completion: 12.5%

## Step 1 - Foundations (Auth + RBAC + Users + Frontend Base)

Step status: Implemented

Scope:
- Auth APIs and protected sessions
- RBAC permission model and middleware enforcement
- Roles and users management APIs
- Initial dashboard UI, routing, and API integration base

Checklist:
- [x] Auth login and me endpoints
- [x] RBAC permissions and role enforcement middleware
- [x] Role CRUD baseline
- [x] User CRUD baseline with status and password operations
- [x] Role-specific mentor/counsellor creation with generated identity IDs
- [x] Shared schema package baseline for auth and RBAC payloads
- [x] Frontend login, users, roles, me pages
- [x] Frontend API integration with axios + feature services/hooks

Test coverage status:
- Backend foundational tests exist for auth/rbac/middleware
- Frontend tests still missing

## Features Added (Active Work):
 - **Public Form Timing**: Public admission form now reads admin-created time slots and removes the old freeform schedule selector
 - **Timing Visibility**: Demo scheduling and admission confirmation screens now surface submitted start time, demo availability, and preferred time slots
Notes:
- This step is functionally present and ready for domain expansion.
- User management now includes generated mentor/counsellor identity IDs and role-specific create flows.
- Public form options now include an admin-managed time slot catalog.

## Step 2 - Lead Module (Priority Domain Start)

Step status: In Progress

Scope:
- Pre-conversion lead lifecycle owned by sales
- Lead-level follow-up fields and state transitions
- Optional demo requirement flag
- Activity tracking and audit trail for all lead operations

Checklist:
- [x] Add lead schemas in packages/schema
- [x] Add lead mongoose model in apps/server
- [x] Build lead service with business rules
- [x] Build lead controller and routes
- [x] Add permission keys and middleware protection for lead routes
- [x] Add lead module unit/integration tests
- [x] Add frontend lead list/create/edit screens
- [x] Activity tracking schema and model for audit trail
- [x] Activity service and logging integration
- [x] Activity API endpoints (GET /leads/:leadId/activities)
- [x] Frontend activity feed component and queries
- [ ] Add lead list/create/update APIs to Postman docs

Features Added (Active Work):
- **Activity Logging**: Automatic logging on lead create, postpone, delete with performer info
- **Activity Tracking Fields**: type (CREATED/FOLLOW_UP_POSTPONED/DELETED etc), oldValue, newValue, performedBy, performedByName
- **Activity API**: GET /leads/:leadId/activities returns full audit trail sorted by date
- **Frontend Activity UI**: ActivityFeed component displays timeline with relative dates and change details
- **Audit Fields**: All changes tracked with who, what, when, old vs new values
- **Demo History Array**: Lead `demos[]` now stores demo lifecycle only (mentor/request/schedule/complete/note), while admission state is tracked at lead top-level.
- **Admission Snapshot**: On admission request, the system creates a student snapshot from lead data, auto-generates ZID, and stores a copied timeslot snapshot (`classesPerWeek`, `durationMinutes`) on student.
- **Student Lifecycle Statuses**: Student status now uses `ADMISSION_PROCESS | STUDENT | BREAK | DROPPED`.
- **Student Follow-up Action**: Student detail now includes a mandatory-note follow-up modal that records student history and advances the next follow-up date.
- **Student Assessments Tracking**: Student detail now shows Oral/Written/Level assessment status and supports confirmation-based done/undone toggles via `PATCH /students/:studentId/assessments`.
- **Lead Detail Redesign**: Detailed lead profile now surfaces identity, contact, form, schedule, ownership, and demo history sections in a light UI
- **Lead Response Timestamps**: Shared lead response schema now includes `createdAt` and `updatedAt` for history-aware screens

Definition of done:
- Lead CRUD and assignment works with RBAC
- Follow-up fields exist and are queryable
- Activity tracking logs all mutations with user context
- Tests pass and docs are updated

## Step 3 - Follow-up Engine (Core Engine)

Step status: Not Started

Scope:
- Query-driven follow-up queues for sales and counsellors
- Auto scheduling + custom override scheduling
- Due-now visibility model

Checklist:
- [ ] Add follow-up schemas and types in packages/schema
- [ ] Add follow-up model and service logic in apps/server
- [ ] Implement schedule bands (1-3, 4-6, 7-10, >10)
- [ ] Implement due query logic using nextFollowUpAt/customNextFollowUpAt
- [ ] Add sales follow-up queue endpoint
- [ ] Add counsellor follow-up queue endpoint
- [ ] Add tests for engine scheduling and queue visibility
- [ ] Add frontend follow-up queue pages (sales and counsellor)

Definition of done:
- System can answer who should be contacted now for both queues
- All scheduling rules validated by tests

## Step 4 - Form System + Student Conversion + ZID Engine

Step status: In Progress

Scope:
- Lead form submission pipeline
- Lead to student conversion
- Atomic ZID generation by prefix

Checklist:
- [ ] Add form submission schema and endpoint (/form/:leadId)
- [x] Add student schemas and model
- [x] Add conversion service lead -> student
- [x] Implement ZID generator (prefix sequence starts at 001 and uses course-type prefixes)
- [ ] Ensure ZID is immutable and never reused
- [ ] Add conversion and ZID concurrency tests
- [ ] Add frontend public form flow

Definition of done:
- Form submit creates student and assigns valid ZID
- Concurrency-safe ZID generation proven by tests

## Step 5 - Counsellor Operations + Inactive Handling

Step status: Not Started

Scope:
- Counsellor ownership and follow-up actions
- Inactive/leave lifecycle behavior

Checklist:
- [ ] Add counsellor assignment flows
- [ ] Add inactiveFrom/inactiveUntil behavior in services
- [ ] Ensure inactive entities are hidden in queues
- [ ] Ensure reappearance when inactiveUntil <= now
- [x] Add counsellor dashboards and actions on frontend
- [ ] Add tests for inactive visibility transitions

Definition of done:
- Counsellor lifecycle ownership is fully operational
- Inactive logic is deterministic and tested

Notes:
- Client-side counsellor workspace pages now list mentors assigned to the logged-in counsellor and the students under those mentors.

## Step 6 - Batch + Group/Individual Progress

Step status: In Progress

Scope:
- Batch structure
- Group progress ownership at batch level
- Optional individual progress simplicity

Checklist:
- [x] Add batch schema/model with type and checkpoints
- [x] Add group ID generation with zg001-style codes
- [x] Add batches API routes and controller
- [x] Add frontend groups page with mentor and student membership display
- [ ] Implement batch-level progress updates
- [ ] Keep follow-up responsibilities on student entity
- [ ] Add frontend batch/enrollment pages
- [ ] Add tests for group vs individual rules

Definition of done:
- Progress and follow-up responsibilities are clearly separated

Notes:
- Current group records are backed by the batch module and now expose a human-readable `groupId` code.

## Step 7 - Tickets + Payment Tracking

Step status: Not Started

Scope:
- Student issue tracking
- Simple payment ledger (no billing engine)

Checklist:
- [ ] Add ticket schema/model/service/routes
- [ ] Add payment schema/model/service/routes
- [ ] Implement payment history/total paid/pending calculations
- [ ] Add frontend ticket and payment views
- [ ] Add tests for payment aggregation correctness

Definition of done:
- Ticket workflows and simple payment tracking are operational

## Step 8 - Hardening + Test Expansion + Release Readiness

Step status: Not Started

Scope:
- Reliability, test depth, and operational readiness

Checklist:
- [ ] Expand backend route and service tests for all modules
- [ ] Add core frontend tests (auth, leads, follow-up queues, conversion)
- [ ] Add validation and error-contract consistency checks
- [ ] Add performance checks for follow-up due queries
- [ ] Complete docs sync (status, structure, Postman)
- [ ] Final regression pass and release checklist

Definition of done:
- End-to-end core lifecycle is stable, tested, and documented

## Current Sprint Focus

Current sprint goal:
- Finish Step 2 lead lifecycle hardening and demo-history migration

Sprint checklist:
- [x] Lead schema draft in packages/schema
- [x] Lead mongoose model
- [x] Lead service scaffold
- [x] Lead controller and routes scaffold
- [x] Basic create/list tests

## Update Protocol (Every PR)

For each merged PR:
1. Update step status if milestone changed
2. Tick completed checklist items
3. Update Last updated date
4. Update docs/PROJECT-STRUCTURE.md if structure changed
5. Update Postman files if API surface changed
