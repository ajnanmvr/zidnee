# ZIDNEE SYSTEM - MASTER PLAN (REFERENCE DOCUMENT)

## 1. System Purpose

Zidnee is a:
CRM + Student Lifecycle + Operations Management System

It manages:
- Lead to Conversion
- Demo (optional)
- Student onboarding
- Counsellor operations
- Follow-ups (core engine)
- Group and individual learning tracking
- Payment tracking

## 2. Complete System Flow (Final)

Lead Created
-> Assigned to Sales
-> Follow-up Loop

-> (Optional Demo)
-> Sales decides

-> Send Form Link
-> Student fills form

-> Student Created (ZID generated)
-> Counsellor Assigned

-> Counsellor Follow-up Loop
-> (Inactive / Leave handling)

-> Batch Progress Tracking
-> Completion / Dropout

## 3. Core Concepts (Never Forget)

| Concept | Meaning |
| --- | --- |
| Lead | Potential student |
| Student | Converted lead |
| Enrollment | What they joined |
| ZID | Student identity |
| FollowUp | System engine |
| Batch | Group learning |
| Counsellor | Lifecycle owner |

## 4. Roles

- Admin
- Sales
- Demo Team
- Counsellor
- Mentor

## 5. Database Models (Final)

### 1) User
- name
- email
- password
- role

### 2) Lead
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

### 3) DemoSession (optional usage)
- leadId
- mentorId
- status
- attemptNumber

### 4) Student
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

### 5) Enrollment
- studentId
- batchId
- mentorId

### 6) Batch
- name
- type (GROUP | INDIVIDUAL)
- level
- checkpoints (for example [true, false, false])
- mentorId

### 7) FollowUp
- entityId (leadId or studentId)
- type (SALES | COUNSELLOR)
- lastContactedAt
- nextFollowUpAt
- customNextFollowUpAt

### 8) Ticket
- studentId
- createdBy
- issue
- status

### 9) Payment
- studentId
- enrollmentId
- amount
- date
- method

## 6. ZID System

Format:
[PREFIX][NUMBER]

Examples:
- ZID11
- ZIG11

Rules:
- Sequence per prefix
- Starts from 11
- Never changes

## 7. Follow-up Engine (Core System)

Fields:
- lastContactedAt
- nextFollowUpAt
- customNextFollowUpAt

Logic:

```ts
if (customNextFollowUpAt) {
  // use custom date
} else {
  // use auto schedule
}
```

Auto schedule:
- 1 to 3: +1 day
- 4 to 6: +2 days
- 7 to 10: +7 days
- Above 10: +30 days

Visibility rule:
- nextFollowUpAt <= now
- OR customNextFollowUpAt <= now

## 8. Form System

URL:
/form/:leadId

Flow:
Sales sends link
-> Student fills form
-> Student created
-> ZID generated
-> Counsellor assigned

## 9. Inactive / Leave System

Student fields:
- isActive
- inactiveFrom
- inactiveUntil

Logic:
- Hidden when inactive
- Reappears when inactiveUntil <= now

## 10. Group vs Individual System

Group:
- Progress tracked at Batch level
- batch.level
- batch.checkpoints

Individual:
- Progress tracked per student (optional simple)

Rule:
- Progress = Batch
- Follow-up = Student

## 11. Demo System

Optional:
- lead.demoRequired

Flow:
- If true -> Demo
- If false -> Direct form

## 12. Payment Tracking

Simple system:
- Record payments
- No billing logic

Track:
- totalPaid
- pending
- history

## 13. Dashboard Logic

Sales dashboard:
- assignedTo = sales
- and (nextFollowUpAt <= now or customNextFollowUpAt <= now)

Counsellor dashboard:
- assignedTo = counsellor
- and (follow-up due or inactiveUntil <= now)

## 14. System Engine (Most Important)

Everything runs on:
Who should I contact now?

## 15. Development Order (Strict)

Phase 1 (Core):
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

## 16. Rules (Do Not Break)

- No multiple IDs
- No separate reminder system
- No over-modeling
- No complex scheduling engine
- Everything driven by follow-up
- Keep logic simple
- Build feature by feature

## 17. Final Mental Model

Lead = potential
Student = converted
ZID = identity
Batch = learning
FollowUp = engine
Counsellor = owner
