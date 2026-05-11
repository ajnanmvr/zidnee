# Zidnee AI System Context

## System Identity

Zidnee is a CRM + Student Lifecycle + Follow-up Automation platform.

It is not a simple CRUD app.

It is a workflow-driven system centered around communication, tracking, and lifecycle transitions.

## Core Principle (Most Important)

The entire system exists to answer:

Who should be contacted right now?

Every feature must support this.

## Master Plan (Authoritative Reference)

This section is the current blueprint and should be treated as the primary execution reference for new module design.
If any older section in this file conflicts with the items below, prefer this section.

### System Purpose

Zidnee is a CRM + Student Lifecycle + Operations Management system.

It manages:
- Lead to conversion
- Optional demo
- Student onboarding
- Counsellor operations
- Follow-ups (core engine)
- Group and individual learning tracking
- Payment tracking

### Complete Flow

Lead Created
-> Assigned to Sales
-> Follow-up Loop
-> (Optional Demo)
-> Sales Decision
-> Send Form Link
-> Student Submits Form
-> Student Created (ZID Generated)
-> Counsellor Assigned
-> Counsellor Follow-up Loop
-> Inactive/Leave Handling
-> Batch Progress Tracking
-> Completion / Dropout

### Core Concepts

- Lead = potential student
- Student = converted lead
- Enrollment = what they joined
- ZID = student identity
- FollowUp = system engine
- Batch = group learning
- Counsellor = lifecycle owner

### Roles

- Admin
- Sales
- Demo Team
- Counsellor
- Mentor

### Target Data Model Set

1. User
- name
- email
- password
- role

2. Lead
- name
- phone
- level
- status
- assignedTo
- demoRequired
- formSent
- formCompleted
- lastContactedAt
- nextFollowUpAt
- customNextFollowUpAt

3. DemoSession (optional)
- leadId
- mentorId
- status
- attemptNumber

4. Student
- zid
- name
- phone
- age
- level
- isActive
- inactiveFrom
- inactiveUntil
- counsellorId
- batchId
- status (ACTIVE | COMPLETED | DROPPED)

5. Enrollment
- studentId
- courseId
- batchId
- mentorId

6. Course
- name
- prefix (ZID, ZIG)

7. Batch
- name
- type (GROUP | INDIVIDUAL)
- level
- checkpoints
- mentorId

8. FollowUp
- entityId
- type (SALES | COUNSELLOR)
- lastContactedAt
- nextFollowUpAt
- customNextFollowUpAt

9. Ticket
- studentId
- createdBy
- issue
- status

10. Payment
- studentId
- enrollmentId
- amount
- date
- method

### ZID Rules

- Format: [PREFIX][NUMBER]
- Example: ZID11, ZIG11
- Sequence per prefix
- Starts from 11
- Never changes

### Follow-up Engine Rules

Fields:
- lastContactedAt
- nextFollowUpAt
- customNextFollowUpAt

Date logic:
- If customNextFollowUpAt exists, use it.
- Otherwise use auto schedule.

Auto schedule:
- 1 to 3: +1 day
- 4 to 6: +2 days
- 7 to 10: +7 days
- above 10: +30 days

Visibility:
- nextFollowUpAt <= now
- OR customNextFollowUpAt <= now

### Form System

- Route: /form/:leadId
- Flow: sales sends link -> student fills -> student created -> ZID generated -> counsellor assigned

### Inactive / Leave

- Student fields: isActive, inactiveFrom, inactiveUntil
- Hidden when inactive
- Reappears when inactiveUntil <= now

### Group vs Individual

- Group progress tracked at Batch level
- Individual progress can be tracked per student (simple)
- Rule: Progress = Batch, Follow-up = Student

### Demo System

- lead.demoRequired controls demo path
- true -> demo flow
- false -> direct form flow

### Payment Tracking

- Keep simple: record payments only
- No complex billing engine
- Track: totalPaid, pending, history

### Dashboard Logic

Sales dashboard:
- assignedTo = sales
- and follow-up due now

Counsellor dashboard:
- assignedTo = counsellor
- and (follow-up due or inactiveUntil <= now)

### Development Order (Strict)

Phase 1:
- Auth
- Lead
- Follow-up engine

Phase 2:
- Form system
- Student + ZID

Phase 3:
- Counsellor system

Phase 4:
- Batch + group logic

Phase 5:
- Tickets + payments

### Guardrails

- No over-modeling
- No separate reminder system
- No complex scheduling engine
- Keep logic follow-up driven
- Build feature by feature

## Core Lifecycle

Lead
-> Follow-up (Sales)
-> (Optional Demo)
-> Form Submission
-> Student Created (ZID assigned)
-> Counsellor Ownership
-> Follow-up (Counsellor)
-> Batch Progress
-> Completed / Dropped

## Core Engines

### 1. Follow-up Engine (Critical)

Controls:
- Sales follow-ups
- Counsellor follow-ups
- Automation logic

Driven only by:
- nextFollowUpAt
- customNextFollowUpAt

Rules:
- No cron jobs
- No background schedulers
- Query-based visibility only

### 2. Note System (Mandatory)

Every interaction must create a Note.

Note stores:
- contactType (CALL / CHAT / MEETING / NO_ANSWER)
- outcome (SUCCESSFUL / UNSUCCESSFUL / CALLBACK)
- content

Rules:
- Do not store interaction data inside FollowUp
- Notes are immutable history

### 3. Lifecycle Engine

Handles transitions:
- Lead -> Student
- Student -> Batch
- Active -> Completed / Dropped

## Core Data Models (Conceptual)

### Lead
- Pre-conversion entity
- Owned by Sales

### Student
- Converted lead
- Has ZID
- Owned by Counsellor

### FollowUp
- Controls scheduling
- No interaction data

### Note
- Records communication history

### Batch
- Group learning structure
- Tracks progress

### Role / User
- RBAC system

## ZID System

Format:
- PREFIX + NUMBER

Examples:
- ZID11
- ZIG11

Rules:
- Sequence per prefix
- Starts from 11
- Must be atomic
- Never reused

## Business Rules

### Batch vs Student
- Progress belongs to Batch
- Follow-up belongs to Student

### Inactive Handling
- inactiveUntil <= now means reappear in follow-up list

### Data Deletion
- Never delete records
- Use archivedAt

## Architecture (Strict)

Route -> Middleware -> Controller -> Service -> Model

### Responsibilities

#### Routes
- Define endpoints only
- Attach middleware

#### Controllers
- Handle request and response only
- Call services
- No business logic

#### Services
- Business logic lives here
- Database interaction
- Domain rules

#### Middleware
- Auth
- RBAC
- Validation (optional)

## RBAC System

Structure:
- User -> Role -> Permissions[]

Rules:
- No hardcoded roles
- Permission catalog is hardcoded and source-controlled (for example USER_CREATE, ORDER_DELETE, VIEW_REPORTS)
- Permissions enforced via middleware
- JWT should include userId, roleId, and permissions

## Validation

Always use @repo/schema (Zod).

Pattern:
- Schema -> validate() -> Service

Rules:
- No manual validation
- No duplicate types

## Error Handling

- Throw ApiError
- Use centralized errorMiddleware

Rules:
- No try/catch in controllers
- No scattered direct res.status handling for business errors

## Testing

Test:
- Services
- Middleware
- Core engines (Follow-up, ZID)

Avoid:
- Trivial tests
- UI-heavy tests for now

## Monorepo Structure

- apps/server: backend
- apps/client: frontend
- packages/schema: shared validation and types

Rules:
- Keep modules isolated
- Use shared schema where needed
- Avoid unnecessary cross-package coupling

## TypeScript Rules

- Strict typing
- No any
- Prefer unknown when needed
- Infer from Zod schemas

## Feature Implementation Flow

1. Define schema in @repo/schema (Zod).
2. Infer types from schema.
3. Build service logic.
4. Build controller.
5. Add routes.
6. Apply middleware.
7. Add tests.
8. Run lint and test.

## AI Agent Instructions

### Always Follow

- Thin controllers
- Business logic in services
- Zod validation via @repo/schema
- ApiError for errors
- asyncHandler for controllers
- No any types

### Never Do

- Put business logic in controllers
- Skip validation
- Hardcode roles
- Duplicate logic
- Add cron-based systems

### When Generating Code

Ensure:
- Proper module structure
- Clean separation of concerns
- Type safety
- RBAC compatibility
- Scalable design

## AI Prompt Template

Build [module/service/function]

Context:
- Zidnee CRM system
- Node.js + Express + TypeScript
- MongoDB + Mongoose
- Zod validation via @repo/schema
- RBAC system (User -> Role -> Permissions)
- Thin controllers, logic in services

Requirements:
- Follow Zidnee architecture strictly
- Use asyncHandler + ApiError
- No any types
- Clean, production-ready code

Output:
- Only code

## Current Development Priority

Auth -> Lead -> FollowUp -> Note -> Student -> Counsellor

## Documentation Maintenance Protocol

When implementing or refactoring features, AI must keep project documents synchronized.

Required updates after meaningful code changes:
- Update this file when architecture rules, domain rules, or implementation conventions change.
- Update module progress in docs/IMPLEMENTATION-STATUS.md when any module scope changes.
- Update docs/PROJECT-STRUCTURE.md when folders, scripts, runtime behavior, or package responsibilities change.
- Update docs/postman/Zidnee.postman_collection.json and related environment files when API routes or request shapes change.

Definition of done for AI-generated feature work includes:
- Code updated
- Tests updated
- Relevant documentation updated
- Postman collection updated if API surface changed

If a requested change conflicts with this system context, AI should follow this document and explicitly note the conflict.

## Module Tracking Rule

Module implementation status must be maintained module-by-module in docs/IMPLEMENTATION-STATUS.md using this structure:
- Scope
- Implemented
- Missing
- Test coverage status
- Next actions

Status values should be one of: Not Started, In Progress, Implemented, Harden Needed.

## Final Mental Model

Lead = potential
Student = converted
ZID = identity
FollowUp = when to act
Note = what happened
Batch = learning
Counsellor = owner

## Purpose of This Document

This file is the single source of truth for:
- AI-assisted coding
- Architecture decisions
- Feature implementation

All generated code must comply with this document.
