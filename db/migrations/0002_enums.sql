-- Enum types. Values match docs/IMPLEMENTATION_CONTRACT.md §4.2 exactly.
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'faculty', 'student');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE offering_status AS ENUM ('draft', 'active', 'closed', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE enrollment_status AS ENUM ('active', 'dropped', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE session_status AS ENUM ('scheduled', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'excused');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE assignment_status AS ENUM ('draft', 'published', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE grade_status AS ENUM ('pending', 'graded', 'released');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE final_grade_status AS ENUM ('draft', 'published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE audit_change_type AS ENUM ('initial', 'update');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Vocabulary only. The selected mode and its arithmetic are decision D5.
DO $$ BEGIN
  CREATE TYPE late_penalty_mode AS ENUM ('none', 'flat_percent', 'per_day_percent', 'per_hour_percent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
