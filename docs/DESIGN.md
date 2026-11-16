# Product and Interface Design — Academic Course Management System

## 1. Design direction

The interface takes visual inspiration from the supplied reference image: a premium editorial layout, generous white space, black typography, fine dotted borders, restrained orange/red/yellow accent bands, and clean geometric illustrations.

This is a **design direction**, not a pixel-for-pixel copy. The reference is a marketing-style page; ACMS is an operational application. Preserve its visual language while making the product easy to use for daily academic work.

### Design principles

1. **Editorial, not cluttered:** strong headings, clear sections, and generous spacing.
2. **Data-first:** real records, tables, filters, and meaningful status indicators take priority over decorative graphics.
3. **Consistent across roles:** shared components and visual language, with role-specific navigation and actions.
4. **Responsive:** desktop dashboards should be efficient; mobile screens should remain usable for students checking schedules or submitting work.
5. **Accessible:** readable contrast, visible focus states, keyboard support, and status text that does not rely on color alone.

## 2. Visual system

### Color palette

| Token | Suggested value | Usage |
|---|---|---|
| `--ink` | `#111111` | Main text, headings, primary buttons |
| `--paper` | `#FFFFFF` | Main page background |
| `--surface` | `#FAFAF8` | Cards and secondary panels |
| `--muted` | `#6B6B6B` | Supporting text |
| `--line` | `#D8D8D3` | Borders and dividers |
| `--accent-yellow` | `#FFC928` | Highlight band and emphasis |
| `--accent-orange` | `#FF7A1A` | Primary accent |
| `--accent-red` | `#E83B2E` | Strong accent and selected visual details |
| `--success` | `#247A4B` | Present, submitted, completed |
| `--warning` | `#A65B00` | Due soon, late, attention required |
| `--danger` | `#B42318` | Absent, rejected, validation errors |
| `--info` | `#2457A6` | Informational status |

Use the yellow-orange-red sequence as a thin recurring visual motif (for example, a footer strip or section divider), not as a large background behind important data. Keep most screens white.

### Typography

- Headings: a clean geometric sans-serif such as **Space Grotesk**.
- Body and UI: **Inter** or the system sans-serif stack.
- Use a clear scale: page title, section title, card title, body, metadata.
- Avoid all-caps for long labels. Use compact uppercase eyebrow labels sparingly.

### Shape and surface

- Cards: white background, thin neutral border, modest radius (8–12px).
- Feature panels: dotted or dashed outline inspired by the reference.
- Buttons: black primary button with white text; outlined secondary button.
- Tables: minimal horizontal separators, clear row hover, compact but comfortable spacing.
- Icons: simple line icons; pair icons with text for important actions.

## 3. Global application shell

### Desktop

- Left sidebar: product mark, role-aware navigation, current semester/context, user profile.
- Main content: page title and description, primary action, filters, then data content.
- Top utility row: breadcrumbs, notifications (optional), and account menu.
- A slim accent stripe may appear at the bottom of the sidebar or page footer.

### Mobile

- Replace the persistent sidebar with a compact top bar and accessible navigation drawer.
- Keep primary actions reachable.
- Convert wide tables into stacked cards or horizontally scrollable data tables with clear labels.
- File upload and attendance controls must be touch-friendly.

## 4. Role-based navigation

| Admin | Faculty | Student |
|---|---|---|
| Overview | Overview | My Dashboard |
| Departments | My Offerings | My Courses |
| Courses | Sessions | Class Schedule |
| Faculty & Students | Attendance | Assignments |
| Course Offerings | Assignments | Attendance |
| Enrollments | Submissions | Grades |
| Reports | Gradebook | Profile |
| Audit Log | Profile | |

Navigation items must be hidden when irrelevant, but hiding a link is not authorization. Server-side permission checks remain mandatory.

## 5. Key screens

### 5.1 Login

- Minimal centered panel on a white background.
- Product name and short description.
- Email and password fields.
- Clear validation and error messages.
- No public self-registration unless the institution explicitly enables it; accounts are assumed to be institution-provided.

### 5.2 Admin dashboard

**Purpose:** give administrators a quick operational overview.

- Greeting and current academic term.
- KPI cards populated from SQL: total students, faculty, active offerings, and active enrollments.
- Recent course-offering activity.
- Quick actions: add course, create offering, add user, enroll students.
- Reports: attendance-deficit summary and grade publication status where available.

Do not hard-code KPI values. Empty databases should show zero states and useful next actions.

### 5.3 Department and course management

- Searchable, sortable tables.
- Create/edit forms in a drawer or dedicated page.
- Department and course relationships visible in the table.
- Confirm destructive actions and block deletion when dependent records make it unsafe.
- Show validation messages returned by the server.

### 5.4 Course offering and enrollment management

- Offering detail page shows course, faculty, semester, academic year, and enrollment count.
- Enrollment table supports search by student name/roll number and status filtering.
- Add/remove or deactivate enrollment according to the agreed policy.
- Prevent duplicate active enrollments and explain the reason when the database rejects an operation.

### 5.5 Faculty dashboard

- Assigned offerings shown as cards or a compact table.
- Each offering shows course code/title, semester, enrolled student count, next class, and pending submissions.
- Quick actions: take attendance, create assignment, review submissions.
- All values are queried for the signed-in faculty member.

### 5.6 Attendance

- Select offering, then class session.
- Roster lists only students enrolled in that offering.
- Attendance controls: Present, Absent, Excused.
- Provide a clear save action and confirmation.
- Show session date/topic and last-updated information.
- Attendance percentage and deficit indicators come from database queries/views.

### 5.7 Assignment management

- Form fields: title, description/instructions, due date/time, maximum marks, late penalty percentage.
- Assignment list supports status filters: upcoming, open, past due, evaluated.
- Student view displays the due date prominently and communicates submission status.
- Deadline display must use a consistent institutional time zone.

### 5.8 Submission review and grading

- Faculty sees a queue of submissions with student, submitted time, late status, and grading status.
- File preview/download is a separate, permission-checked action.
- Marks input is bounded by zero and maximum marks.
- When marks are changed after grading, show a reason field if the project chooses to require one; always preserve the old and new marks in the audit trail.
- Students see their own submission state and returned marks only when released/published.

### 5.9 Student dashboard

- Welcome panel and current semester.
- Enrolled course cards.
- Upcoming classes and assignment deadlines.
- Attendance summary and latest published grades.
- Clear calls to action: view course, submit assignment, check attendance.

### 5.10 Reports and audit log

- Attendance-deficit report with configurable threshold.
- Final-grade report with attendance percentage and aggregated scores.
- Grade modification audit table: student, course, assignment, old marks, new marks, changed by, changed at.
- Filters by semester, offering, course, faculty, and date where appropriate.
- Export can be added after core database reports work.

## 6. Reusable components

| Component | Behavior |
|---|---|
| `AppShell` | Shared responsive layout and role-aware navigation |
| `PageHeader` | Title, supporting description, breadcrumbs, primary action |
| `StatCard` | Label, database-backed value, optional trend/context |
| `DataTable` | Loading, empty, error, sort, filter, pagination states |
| `StatusBadge` | Text + color for attendance/submission/enrollment states |
| `FormField` | Label, hint, validation, accessible error text |
| `ConfirmDialog` | Confirmation for destructive or sensitive actions |
| `CourseOfferingCard` | Course and offering details with role-specific actions |
| `FileUpload` | Upload progress, accepted file guidance, success/error |
| `AttendanceRoster` | Enrollment roster and attendance controls |
| `GradeInput` | Numeric validation against maximum marks |
| `AuditTimeline` | Read-only chronological grade-change history |

## 7. Interaction and state rules

- Every form has loading, success, and error states.
- Disable duplicate submissions while a request is processing.
- Use optimistic updates only when rollback behavior is clear; otherwise refresh from the server after success.
- Tables need loading skeletons, empty states, and useful error messages.
- Filters and pagination should be reflected in URL search parameters where practical.
- Confirm before deleting or deactivating important records.
- Use toast notifications for short confirmations, not as the only place where important errors appear.
- Preserve user input when server validation fails.

## 8. Dynamic-data requirements

The following must be sourced from PostgreSQL, not constants in React components:

- Dashboard statistics and recent activity.
- Department, course, user, offering, and enrollment lists.
- Faculty offerings and student rosters.
- Class sessions and attendance records.
- Assignment definitions and submission lists.
- Late flags, marks, attendance percentages, final grades, and audit history.

Seed data is acceptable for development and demonstrations, but the same screens must work when records are created, edited, or removed through the application.

## 9. Responsive breakpoints

Use the framework's responsive utilities rather than device-specific pages.

- Small: one-column layout; sidebar becomes a drawer.
- Medium: two-column card grids where content permits.
- Large: persistent sidebar and multi-column dashboard.
- Tables should not become unreadably compressed; use horizontal scrolling or card layouts.

## 10. Definition of design completion

- Admin, faculty, and student views share a consistent design system.
- The supplied reference's restrained editorial style is recognizable without compromising usability.
- All key workflows can be completed with real database records.
- Empty, loading, validation, success, and failure states are designed.
- Keyboard focus, form labels, contrast, and responsive layouts are checked.
