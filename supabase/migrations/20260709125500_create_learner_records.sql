create table "public"."learner_records" (
    "id" uuid not null default gen_random_uuid(),
    "school_year_id" uuid not null references public.school_years(id) on delete cascade,
    "grade_level" text,
    "student_name" text,
    "birthdate" text,
    "age" integer,
    "gender" text,
    "mother_contact" text,
    "mother_name" text,
    "father_contact" text,
    "father_name" text,
    "philippine_address" text,
    "uae_address" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);

alter table "public"."learner_records" enable row level security;

CREATE UNIQUE INDEX learner_records_pkey ON public.learner_records USING btree (id);
alter table "public"."learner_records" add constraint "learner_records_pkey" PRIMARY KEY using index "learner_records_pkey";

create policy "Enable read access for all authenticated users"
on "public"."learner_records"
as permissive
for select
to authenticated
using (true);

create policy "Enable full access for admins"
on "public"."learner_records"
as permissive
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create policy "Enable full access for directors"
on "public"."learner_records"
as permissive
for all
to authenticated
using (public.has_role(auth.uid(), 'academic_director'))
with check (public.has_role(auth.uid(), 'academic_director'));
