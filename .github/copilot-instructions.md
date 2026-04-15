# Zidnee AI System Context

## System Identity

Zidnee is a CRM + Student Lifecycle + Follow-up Automation platform.

It is not a simple CRUD app.

It is a workflow-driven system centered around communication, tracking, and lifecycle transitions.

## Core Principle (Most Important)

The entire system exists to answer:

Who should be contacted right now?

Every feature must support this.

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

Definition of done for AI-generated feature work includes:
- Code updated
- Tests updated
- Relevant documentation updated

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
