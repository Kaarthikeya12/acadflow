# Website Feature Specification — Academic Course Management System

## 1. Product vision

Build a polished, fully dynamic **Academic Course Management System (ACMS)** for a college or university. It should bring Admin, Faculty, and Student academic workflows into one connected platform.

The website must feel like a premium, carefully designed product—not a static college template. The visual direction follows the supplied reference: white space, strong black typography, fine dotted outlines, restrained geometric artwork, and thin yellow/orange/red accent bands. However, usability and access to academic information always come before decoration.

**Core rule:** every important number, table, status, and activity item must come from PostgreSQL. No hard-coded dashboard statistics, fake attendance, fake grades, or static assignment lists in the finished application.

## 2. Users and permissions

### Admin

Can manage the institution's academic master data and operational setup:

- Departments
- Courses
- Faculty accounts and profiles
- Student accounts and profiles
- Course offerings by semester and academic year
- Faculty assignment to offerings
- Student enrollments
- Academic reports
- Grade-change audit history

### Faculty

Can work only with course offerings assigned to them:

- View assigned offerings and class rosters
- Schedule and manage class sessions
- Record and update attendance
- Create and manage assignments
- Review student submissions
- Download submitted files
- Award and update marks
- View grading history for relevant submissions
- View attendance and performance summaries

### Student

Can access only their own academic records and active enrollments:

- View enrolled courses
- View class timetable and upcoming sessions
- View assignments and deadlines
- Upload assignment submissions
- View submission status and late status
- View attendance and attendance percentage
- View marks and published final grades
- View personal profile

Hiding a navigation link is not sufficient security. Every protected read and write must be authorized on the server.

## 3. Website structure and pages

Use the Next.js App Router. Keep a shared application shell, but render navigation and dashboard content according to the signed-in user's role.

### Public/authentication pages

#### `/login`

- Institution/product branding
- Email and password fields
- Show/hide password control
- Validation and clear authentication errors
- Loading state during sign-in
- Redirect users to the correct role dashboard
- No public registration unless explicitly required by the institution

#### `/unauthorized`

- Explain that the current account does not have permission to access the page
- Provide a link back to the correct dashboard

### Shared authenticated layout

Every authenticated page should include:

- Responsive sidebar on desktop
- Mobile navigation drawer or compact navigation
- Product logo/name
- Role-aware navigation links
- Current user name and role
- Profile/account menu
- Breadcrumbs on nested pages
- Page title and concise supporting description
- Notifications area (optional; only show real notifications)
- Sign-out action

### Admin pages

#### `/admin/dashboard`

Show a live overview using database queries:

- Total active students
- Total faculty
- Total departments
- Total courses
- Active course offerings
- Active enrollments
- Recent administrative activity
- Offerings grouped by semester
- Attendance-deficit overview, if attendance data exists
- Quick actions: add department, add course, add user, create offering

Do not display invented percentages or trends. If there is no historical data to calculate a trend, show the current count without a trend indicator.

#### `/admin/departments`

- List departments
- Search and sort
- Create department
- Edit department
- View department details and related courses/faculty/students
- Deactivate/archive a department where dependent records exist
- Prevent unsafe deletion when related records would be orphaned

#### `/admin/courses`

- List courses with course code, title, department, and credits
- Search by code/title
- Filter by department
- Create and edit courses
- View course details and associated offerings
- Validate unique course codes

#### `/admin/users`

- List faculty and students
- Search by name, email, roll number, or faculty identifier
- Filter by role, department, batch, and active status
- Create user/profile
- Edit profile
- Activate/deactivate account
- Assign department
- Reset credentials through a secure process if included
- Do not expose password hashes or sensitive authentication data

#### `/admin/offerings`

- Create a course offering from an existing course
- Select exactly one faculty member
- Set semester and academic year
- Set offering status
- View offering details
- View enrolled-student count
- Filter by course, faculty, semester, year, and status
- Prevent duplicate/conflicting offering records according to agreed business rules

#### `/admin/enrollments`

- View enrollments for an offering
- Enroll a student
- Change enrollment status
- Search by student name or roll number
- Prevent duplicate active enrollment in the same offering
- Show clear validation feedback

#### `/admin/reports`

Provide SQL-backed reports:

- Attendance-deficit report
- Course enrollment report
- Course/semester offering report
- Final-grade report
- Submission and evaluation status report

Filters should include semester, academic year, department, course, offering, and threshold where relevant.

#### `/admin/audit-log`

- Read-only grade modification history
- Show student, course, assignment, old marks, new marks, actor, and timestamp
- Filter by date, course, offering, student, and faculty
- Never provide an edit/delete action for audit entries

### Faculty pages

#### `/faculty/dashboard`

Show only the signed-in faculty member's assigned work:

- Assigned course offerings
- Student count per offering
- Upcoming class sessions
- Assignments approaching their deadlines
- Submissions waiting for evaluation
- Recent grading activity
- Quick actions: take attendance, create assignment, review submissions

#### `/faculty/offerings`

- List assigned offerings
- Search/filter by semester and year
- Open offering details
- Show course information, enrolled students, and offering status

#### `/faculty/offerings/[offeringId]`

Offering workspace with tabs or clear navigation for:

- Overview
- Students
- Sessions
- Attendance
- Assignments
- Submissions
- Gradebook

The server must verify that the faculty member is assigned to the requested offering.

#### `/faculty/sessions`

- Create class session
- Set date, start time, and topic
- View sessions by offering and date
- Edit/cancel a session according to policy
- Prevent invalid or duplicate sessions where the institution requires it

#### `/faculty/attendance`

- Choose an assigned offering and class session
- Load the enrolled-student roster from PostgreSQL
- Mark each student Present, Absent, or Excused
- Save attendance in one transaction
- Show saved/unsaved state
- Allow correction only to authorized faculty/admin users
- Display attendance history and percentage

#### `/faculty/assignments`

- Create assignment for an assigned offering
- Set title and instructions
- Set due date/time
- Set maximum marks
- Set late-penalty percentage
- Edit or close assignment according to policy
- View submission count and evaluation progress
- Validate due date and marks configuration

#### `/faculty/submissions`

- View submissions grouped by assignment
- Filter by pending, evaluated, late, or missing
- See student, roll number, submitted time, and late status
- Open/download submission through a permission-checked file endpoint
- Avoid exposing internal filesystem paths

#### `/faculty/gradebook`

- View students and their assessment results for an assigned offering
- Enter marks within the allowed range
- Save grades
- Update previously awarded marks with an audit record
- Display grading status and publication status
- Show grade-change history where authorized

### Student pages

#### `/student/dashboard`

Show information for the signed-in student only:

- Current enrolled courses
- Next class sessions
- Upcoming assignment deadlines
- Recent submission statuses
- Attendance summary
- Published grades
- Helpful empty states for students with no active enrollments

#### `/student/courses`

- List active and past course enrollments
- Show course code/title, faculty, semester, and status
- Open course details
- View sessions, assignments, and attendance for that course

#### `/student/schedule`

- List upcoming class sessions
- Show date, time, course, faculty, and topic
- Provide a calendar-style view only if it can be backed by real session data
- Clearly handle weeks with no scheduled sessions

#### `/student/assignments`

- List assignments from active enrollments
- Filter by upcoming, submitted, evaluated, and overdue
- Show due date/time, maximum marks, and submission status
- Open assignment instructions
- Submit or replace a file only if resubmission policy permits

#### `/student/assignments/[assignmentId]`

- Assignment title and instructions
- Course and faculty details
- Due date/time and maximum marks
- Upload area with allowed file types and size guidance
- Upload progress and validation errors
- Submission timestamp after success
- Late status derived from deadline and submission time
- Show marks/feedback only when released by faculty

#### `/student/attendance`

- Attendance percentage by course
- Session-wise attendance history
- Present, Absent, and Excused status labels
- Explain how the percentage is calculated
- Do not expose another student's attendance

#### `/student/grades`

- Course-wise published final grades
- Assessment marks when faculty has released them
- Attendance percentage
- Final grade status (pending/published)
- Do not reveal unpublished marks

#### `/student/profile`

- View permitted profile details
- Edit only fields the institution allows students to change
- Display account and department details safely

## 4. Core feature catalogue

### A. Authentication and account security

- Secure login and logout
- Password hashing
- Server-managed sessions
- Role-based authorization
- Protected routes and server mutations
- Session expiry and sign-out handling
- Secure error messages that do not reveal whether an account exists unnecessarily

### B. Academic master data

- Department management
- Course catalogue
- Faculty profiles
- Student profiles
- Account activation/deactivation
- Referential integrity between departments, courses, faculty, and students

### C. Course offerings and enrollment

- Semester and academic-year setup
- Course offering creation
- Faculty assignment
- Student enrollment
- Enrollment status management
- Duplicate enrollment prevention
- Offering roster and enrollment counts

### D. Class scheduling and attendance

- Class-session scheduling
- Session topic and date/time
- Roster generated from active enrollments
- Present/Absent/Excused attendance
- Attendance correction with authorization
- Attendance percentage
- Attendance-deficit report
- Session-wise attendance history

### E. Assignment lifecycle

- Assignment creation and editing
- Due date/time
- Maximum marks
- Late penalty configuration
- Assignment visibility to enrolled students
- Assignment status (upcoming/open/closed)
- Submission tracking

### F. File submissions

- Student file upload
- File type and size validation
- Safe generated storage names
- File metadata saved in PostgreSQL
- Submission timestamp
- Permission-checked download
- Late status derived from timestamps
- Optional resubmission/version history if approved by the project team

Store files in server-side file storage or object storage; store metadata and storage keys in PostgreSQL. Do not trust a path sent by the browser.

### G. Grading and audit

- Faculty evaluation
- Marks validation against maximum marks
- Initial grade entry
- Grade update workflow
- Grade-change reason (optional project policy)
- Automatic audit record for changes to previously awarded marks
- Old marks, new marks, changed by, changed at
- Read-only audit history
- Grade publication controls

The grade update and its audit record must be atomic. Prefer a PostgreSQL trigger/function or a carefully designed transaction so a successful mark change cannot occur without its audit entry.

### H. Reports and analytics

- Attendance percentage by student/course
- Attendance-deficit report
- Enrollment counts by course/semester
- Assignment submission completion
- Pending evaluation count
- Final-grade report
- Grade-change audit report

Charts are optional enhancements. They must visualize actual query results and should not replace useful tables or detailed records.

### I. Search, filtering, and usability

- Search by student name, roll number, course code, or title where relevant
- Filters for semester, academic year, course, offering, and status
- Sorting on useful table columns
- Pagination for large datasets
- Clear filter/reset controls
- URL query parameters for shareable/reloadable table state where practical

### J. Notifications (optional enhancement)

Only add notifications after the main workflows work.

Potential real notifications:

- New assignment for an enrolled course
- Assignment deadline approaching
- Submission successfully received
- Submission evaluated
- Grade published
- Course session scheduled or changed

Notifications should be generated from real events and stored in the database if persistent history is required. Do not create fake notification cards.

## 5. Dynamic behavior requirements

The finished website must meet all of these conditions:

1. A record created by an Admin appears in the relevant lists without editing source code.
2. Editing a course or profile updates the database and is reflected on refresh.
3. An offering's roster is generated from its enrollment records.
4. Attendance forms load the correct enrolled students from SQL.
5. Attendance percentages are calculated from stored attendance rows according to the documented policy.
6. Students see only assignments for their active enrollments.
7. Submission timestamps are generated by the server/database, not trusted from the browser.
8. Late status is calculated from the stored deadline and submission timestamp.
9. Faculty see submissions only for offerings they are authorized to teach.
10. Grade updates persist and create audit history.
11. Students see only their own released/published grades.
12. Dashboard cards and reports reflect the database's current state.
13. Empty databases show useful empty states instead of fabricated examples.
14. Refreshing, signing out, and signing back in does not erase saved data.

## 6. Database and DBMS demonstration features

The project should visibly demonstrate database concepts through implementation and the final presentation:

- Relational schema with primary and foreign keys
- Appropriate normalization
- Unique, check, and not-null constraints
- One-to-many and many-to-many relationships through junction tables
- SQL joins across academic entities
- Aggregate queries (`COUNT`, `AVG`, `SUM`, as applicable)
- Grouping and filtering
- Subqueries where useful
- Views for attendance and reporting
- Trigger/function for grade-change audit
- Transactions for multi-step operations
- Indexes for frequently queried columns
- Parameterized SQL queries
- Migration and seed scripts

Do not add database features merely as decoration. Each should solve a real integrity, performance, or reporting requirement.

## 7. Suggested interface behavior

### Tables

Every data table should support:

- Loading skeleton or loading indicator
- Empty state with a relevant next action
- Error state with retry
- Search/filter where useful
- Clear column labels
- Row actions based on the user's permissions
- Pagination when needed

### Forms

Every form should include:

- Visible labels
- Required/optional indicators
- Client-side convenience validation
- Server-side authoritative validation
- Field-level error messages
- Disabled/loading submit state
- Success feedback
- Preservation of entered values when validation fails

### Status labels

Use both text and color. Suggested statuses:

- Enrollment: Active, Inactive, Dropped
- Attendance: Present, Absent, Excused
- Assignment: Upcoming, Open, Closed
- Submission: Not Submitted, Submitted, Late, Evaluated
- Grade: Pending, Published

Confirm exact status names and rules with the project team before schema finalization.

## 8. Visual and interaction direction

Follow the supplied reference image as a visual guide:

- White or off-white background
- Strong black headings and concise supporting text
- Thin dotted outlines around selected feature panels
- Thin horizontal yellow → orange → red accent bands
- Geometric illustrations used sparingly on landing/intro sections
- Black primary buttons and outlined secondary buttons
- Minimal shadows and restrained corner rounding
- Consistent spacing and alignment

For operational pages, use clean dashboards, tables, forms, and clear navigation. Do not put oversized decorative illustrations behind data tables or forms.

### Landing page (optional)

If a public landing page is required, keep it short and product-focused:

1. Hero: “Academic operations, connected.”
2. Short explanation of the platform
3. Three role/benefit sections: Admin, Faculty, Student
4. Feature overview: enrollment, attendance, assignments, grading, audit
5. Clear sign-in call to action

Do not spend more time on a marketing page than on the actual role-based application.

## 9. Recommended build order

Build in this order to avoid polishing screens before their data model works:

1. PostgreSQL schema, ER diagram, migrations, constraints, and seed data.
2. Next.js project setup and database connection.
3. Authentication, sessions, and role authorization.
4. Shared application shell and role dashboards.
5. Admin departments, courses, users, offerings, and enrollments.
6. Faculty sessions and attendance.
7. Assignments and secure file submissions.
8. Grading, grade-change trigger/audit, and final grades.
9. SQL-backed reports.
10. Search, filtering, pagination, accessibility, responsive polish.
11. Optional notifications, exports, and charts.

## 10. Out of scope unless separately approved

The supplied project specification excludes:

- Student fees or tuition payments
- Faculty payroll
- Library management
- Hostel/dormitory administration
- Alumni relations

Do not add these modules to the project without approval. Avoid unrelated features such as social feeds, chat, AI assistants, gamification, or public course marketplaces until all required academic workflows are complete.

## 11. Acceptance checklist

- [ ] Login routes each role to the correct dashboard.
- [ ] All role permissions are enforced on the server.
- [ ] Admin can manage departments, courses, faculty, students, offerings, and enrollments.
- [ ] Faculty can manage assigned sessions, attendance, assignments, submissions, and grades.
- [ ] Students can view their own courses, schedule, assignments, attendance, and published grades.
- [ ] File upload/download is permission-checked and validated.
- [ ] Late status is calculated from actual timestamps.
- [ ] Attendance and final grades follow documented formulas.
- [ ] Grade modifications create immutable audit records.
- [ ] Reports use PostgreSQL queries/views.
- [ ] Empty/loading/error/success states exist.
- [ ] UI follows the supplied visual direction and works on mobile.
- [ ] No finished screen depends on hard-coded mock data.
- [ ] The project can be set up and demonstrated from a clean database.

## 12. Source alignment and assumptions

This feature specification is based on the supplied Academic Course Management System project specification and requirement analysis document. Those documents establish the Admin, Faculty, and Student roles; departments, courses, offerings, enrollments, sessions, attendance, assignments, submissions, grading, grade-change logs, final grades, and reports.

The page structure, detailed UI behavior, search/filter improvements, optional notifications, and implementation ordering are product-design recommendations to make those requirements into a usable website.

The supplied documents do not define exact grade weights, grade boundaries, late-penalty timing, resubmission policy, attendance denominator rules, or file limits. Confirm these with the instructor/team before implementing them.
