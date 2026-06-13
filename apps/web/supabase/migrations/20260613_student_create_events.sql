-- Allow students (in addition to admins/superadmins) to create events from the
-- mobile app. Mobile inserts events directly with the anon key, so this RLS
-- INSERT policy is the gate. The web events API stays admin-only, so web event
-- creation is unaffected. Student events go live immediately — same as admin
-- events and as student posts; events have no approval/status concept.
--
-- UPDATE/DELETE on events stay admin-only (no student edit/delete UI exists).

DROP POLICY IF EXISTS "Admins can insert events" ON public.events;
CREATE POLICY "Members can insert events"
  ON public.events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE email = auth.jwt()->>'email'
        AND role IN ('admin', 'superadmin', 'student')
    )
  );

-- A student creating an event with custom RSVP options also inserts into
-- event_rsvp_options, so widen that policy to the same set of roles.
DROP POLICY IF EXISTS "Admins can manage rsvp options" ON public.event_rsvp_options;
CREATE POLICY "Members can manage rsvp options"
  ON public.event_rsvp_options FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE email = auth.jwt()->>'email'
        AND role IN ('admin', 'superadmin', 'student')
    )
  );
