create table "public"."school_years" (
    "id" uuid not null default gen_random_uuid(),
    "year" text not null,
    "is_active" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);

alter table "public"."school_years" enable row level security;

CREATE UNIQUE INDEX school_years_pkey ON public.school_years USING btree (id);
CREATE UNIQUE INDEX school_years_year_key ON public.school_years USING btree (year);

alter table "public"."school_years" add constraint "school_years_pkey" PRIMARY KEY using index "school_years_pkey";
alter table "public"."school_years" add constraint "school_years_year_key" UNIQUE using index "school_years_year_key";

create policy "Enable read access for all users"
on "public"."school_years"
as permissive
for select
to authenticated
using (true);

create policy "Enable insert for admins only"
on "public"."school_years"
as permissive
for insert
to authenticated
with check (has_role('admin'::app_role, auth.uid()));

create policy "Enable update for admins only"
on "public"."school_years"
as permissive
for update
to authenticated
using (has_role('admin'::app_role, auth.uid()))
with check (has_role('admin'::app_role, auth.uid()));

create policy "Enable delete for admins only"
on "public"."school_years"
as permissive
for delete
to authenticated
using (has_role('admin'::app_role, auth.uid()));
