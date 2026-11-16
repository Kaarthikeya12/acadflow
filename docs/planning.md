# Project Plan — Academic Course Management System

## 1. Project objective

Build a working, dynamic Academic Course Management System using **Next.js + TypeScript** and **PostgreSQL**. The system must demonstrate relational database design and SQL operations through real workflows for Admin, Faculty, and Student roles.

The project is complete when users can manage academic records, enrollments, sessions, attendance, assignments, submissions, grading, and grade-change audit history through the UI, with PostgreSQL enforcing data integrity.

## 2. Scope

### Must build

- Authentication and role-based access: Admin, Faculty, Student.
- Department, course, faculty, and student management.
- Course offerings by semester and academic year.
- Student enrollment management.
- Class-session scheduling.
- Attendance recording and attendance percentage reporting.
- Assignment creation and configuration.
- Digital submission upload and late tracking.
- Submission evaluation and marks.
- Grade-change audit log.
- Final-grade and attendance-deficit reports.

### Not in scope

As stated in the supplied specification: student fees/tuition, faculty payroll, library management, hostel/dormitory administration, and alumni relations.

### Decisions to confirm before implementation

The supplied documents do not define these values. Agree them with the project team/instructor and record the decisions before implementing:

1. Final-grade formula and assessment/attendance weights.
2. Letter-grade boundaries and pass criteria.
3. Whether excused attendance is excluded from the attendance denominator.
4. Whether students may replace a submission before the deadline.
5. Whether a late penalty is applied per hour/day or as a one-time percentage.
6. Whether marks are visible immediately or only after faculty publication.
7. Maximum upload size, permitted file types, and retention policy.
8. Whether master records are deleted, archived, or marked inactive.

Do not silently hard-code assumptions for these rules.

## 3. Recommended implementation phases

### Phase 0 — Project setup and agreement

**Tasks**
- Create the Next.js App Router project with TypeScript.
- Add Tailwind CSS and the chosen component/icon libraries.
- Set up PostgreSQL locally.
- Add environment variable handling.
- Create Git repository, `.gitignore`, and documentation folder.
- Confirm the business-rule decisions listed above.

**Deliverables**
- App starts locally.
- PostgreSQL connection succeeds.
- `architecture.md`, `DESIGN.md`, and `planning.md` are committed.
- README explains setup.

**Exit check:** a clean clone can start the app and connect to the development database using documented steps.

### Phase 1 — Database design (DBMS foundation)

**Tasks**
- Draw and review the ER diagram.
- Define tables, columns, primary keys, foreign keys, unique constraints, and check constraints.
- Define relationships and delete/update behavior.
- Create ordered SQL migration files.
- Add seed data for one department, courses, faculty, students, offerings, and enrollments.
- Add indexes for common lookups.
- Prepare SQL scripts demonstrating joins, grouping, subqueries, views, and reports.

**Deliverables**
- ER diagram.
- PostgreSQL schema/migrations.
- Seed script.
- Data dictionary.
- Initial SQL query collection.

**Exit check:** schema builds from an empty database; constraints reject invalid and duplicate relationships.

### Phase 2 — Authentication and role-based shell

**Tasks**
- Implement login and secure session handling.
- Store password hashes.
- Add server-side role guards.
- Build shared responsive application shell.
- Create role-specific navigation and dashboard placeholders.
- Add unauthorized/not-found states.

**Deliverables**
- Admin, Faculty, and Student can sign in to their respective dashboards.
- Protected routes and server mutations enforce role permissions.

**Exit check:** a user cannot access another role's protected actions by manually entering a URL or calling an endpoint.

### Phase 3 — Admin and enrollment modules

**Tasks**
- Department CRUD.
- Course CRUD.
- Faculty and student account/profile management.
- Course offering creation and faculty assignment.
- Enrollment creation and status management.
- Search, filtering, pagination, and validation.

**Deliverables**
- Admin can manage core academic data and enroll students.
- Lists and dashboard counts come from PostgreSQL.

**Exit check:** create/edit actions persist after refresh; invalid foreign keys and duplicate active enrollments are rejected.

### Phase 4 — Faculty sessions and attendance

**Tasks**
- List faculty's assigned offerings.
- Create/edit class sessions.
- Display the enrolled student roster for a session.
- Record Present/Absent/Excused attendance.
- Prevent duplicate attendance for the same enrollment/session.
- Create attendance percentage and attendance-deficit SQL views/queries.

**Deliverables**
- Faculty attendance workflow.
- Student attendance view.
- Attendance report.

**Exit check:** only the assigned faculty can update attendance for that offering; report values match direct SQL calculations.

### Phase 5 — Assignments and submissions

**Tasks**
- Faculty creates assignments with due date, maximum marks, and late penalty.
- Student sees assignments for active enrollments.
- Implement permission-checked file upload and download.
- Store file metadata and storage key in PostgreSQL.
- Record submission timestamps.
- Derive late status using the agreed time-zone/deadline rule.
- Enforce active-enrollment eligibility.

**Deliverables**
- Assignment management screen.
- Student submission screen.
- Faculty submission review queue.

**Exit check:** a student cannot submit to an offering they are not enrolled in; late status is correct at deadline boundaries.

### Phase 6 — Grading, audit, and final grades

**Tasks**
- Faculty evaluates submissions and awards marks.
- Validate marks against maximum marks.
- Implement a PostgreSQL trigger/function or equivalent transaction-safe mechanism for grade-change logging.
- Ensure audit rows capture old marks, new marks, actor, and timestamp.
- Implement the approved final-grade formula.
- Add student grade view and faculty/admin reports.

**Deliverables**
- Gradebook.
- Immutable grade-change audit history.
- Final-grade report.

**Exit check:** changing an existing mark creates exactly one audit row; initial grading follows the agreed initial-grade policy; final-grade output matches documented test cases.

### Phase 7 — Polish, testing, and demonstration

**Tasks**
- Responsive UI review.
- Add loading, empty, error, and success states.
- Test authorization and input validation.
- Test SQL constraints, transactions, triggers, views, and reports.
- Check file upload edge cases.
- Add sample data suitable for a live demonstration.
- Write setup instructions and a demo script.
- Prepare DBMS explanation: ER model, normalization, keys, constraints, joins, views, triggers, transactions, and indexes.

**Deliverables**
- Tested application.
- Final schema and seed data.
- README and demonstration script.
- Screenshots and project presentation material if required.

**Exit check:** the full demo can be run from a fresh setup without manually editing database rows during the presentation.

## 4. Priority order

| Priority | Feature | Why |
|---|---|---|
| P0 | PostgreSQL schema and constraints | Foundation for every module and DBMS evaluation |
| P0 | Authentication and server-side authorization | Protects student/faculty records |
| P0 | Admin core data, offerings, enrollments | Establishes valid academic relationships |
| P1 | Attendance and reports | Core academic workflow and SQL aggregation |
| P1 | Assignments and submissions | Required digital evaluation workflow |
| P1 | Grading and audit trigger | Key integrity/transparency requirement |
| P1 | Final-grade calculation | Required output; depends on agreed formula |
| P2 | Search, filters, pagination, exports | Improves usability after workflows work |
| P2 | UI animation and decorative polish | Only after functional completeness |

## 5. Suggested API/server action map

Use server actions or Route Handlers consistently. These are logical operations, not a requirement to expose every operation as a public REST endpoint.

| Area | Operations |
|---|---|
| Auth | sign in, sign out, current session |
| Departments | list, create, update, deactivate |
| Courses | list, create, update, deactivate |
| Users | list, create, update, deactivate |
| Offerings | list, create, update, assign faculty |
| Enrollments | list, enroll, update status |
| Sessions | list, create, update, cancel |
| Attendance | roster, save attendance, attendance report |
| Assignments | list, create, update, close |
| Submissions | upload, list, download, inspect |
| Grades | award marks, update marks, grade report |
| Audit | list grade changes, filter audit history |
| Final grades | calculate/recalculate, publish, view |

Every operation must authenticate the caller, authorize the role and record scope, validate input, and use parameterized SQL.

## 6. Testing plan

### Database tests

- Foreign-key violations are rejected.
- Duplicate active enrollment is rejected.
- Duplicate attendance for a session/enrollment is rejected.
- Invalid attendance status is rejected.
- Marks below zero or above maximum are rejected.
- Grade modification produces an audit entry.
- Transaction rollback leaves no partial grading update.
- Attendance and final-grade views return expected results.

### Role tests

- Admin can manage master data and offerings.
- Faculty can modify only assigned offerings.
- Student can view only their own records.
- Student cannot change marks or attendance.
- Faculty cannot view or edit unrelated offerings.

### Workflow tests

- Create offering → enroll student → schedule session → mark attendance.
- Create assignment → upload submission → calculate late status.
- Grade submission → modify grade → verify audit record.
- View attendance and final grade as the correct student.

### UI tests

- Forms validate required fields.
- Tables show loading, empty, and error states.
- Successful writes remain after refresh.
- Mobile layout supports essential student tasks.
- File upload errors are understandable.

## 7. Demonstration script

A strong DBMS demonstration should show the database doing meaningful work:

1. Sign in as Admin and create a department, course, offering, faculty assignment, and student enrollment.
2. Show the corresponding rows and foreign-key relationships in PostgreSQL.
3. Sign in as Faculty and create a class session.
4. Mark attendance and show the attendance percentage report.
5. Create an assignment and sign in as Student to upload a file.
6. Show the stored submission timestamp and derived late status.
7. Sign in as Faculty and grade the submission.
8. Change the awarded marks and show the automatically created `GRADE_CHANGE_LOG` row.
9. Sign in as Student and show their own attendance and published grade.
10. Run the attendance-deficit and final-grade SQL reports.

## 8. Definition of done

- [ ] All three roles can sign in and have correct permissions.
- [ ] Admin can manage departments, courses, users, offerings, and enrollments.
- [ ] Faculty can manage sessions, attendance, assignments, submissions, and marks.
- [ ] Students can view their courses, sessions, assignments, attendance, and grades.
- [ ] Uploads are stored safely and linked to database records.
- [ ] Late submissions are flagged using timestamps and the agreed rule.
- [ ] Grade edits are audited with old/new marks, actor, and timestamp.
- [ ] Attendance and final-grade reports are generated from SQL-backed data.
- [ ] Database constraints and transactions are tested.
- [ ] No important screen depends on hard-coded mock data.
- [ ] Setup, migrations, seed data, and demo steps are documented.

## 9. Source alignment

This plan is based on the supplied **Academic Course Management System — System Requirements & Project Specification** and **Requirement Analysis Document: DBMS Mini Project**. Those documents specify PostgreSQL, Admin/Faculty/Student roles, academic master data, offerings/enrollments, attendance, assignments, submissions, grading, grade-change auditing, and reports.

The supplied specification lists React.js and permits a Node.js/Express or Python backend. This implementation plan adapts that stack to the requested **Next.js frontend** and uses Next.js server-side functionality for the application layer. PostgreSQL remains the database engine.
