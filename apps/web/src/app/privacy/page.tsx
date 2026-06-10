import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - AmboPortal",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: March 24, 2026</p>

      <div className="prose prose-gray max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-semibold mt-6 mb-2">1. Introduction</h2>
          <p>
            AmboPortal (&quot;the App&quot;) is operated by Skyler A. Stevens for use by
            high school students, school staff, administrators, and applicants. This policy
            describes how we collect, use, and protect your personal information.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-6 mb-2">2. Information We Collect</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Account information:</strong> name, email address, phone number, and profile
              photo you provide during registration or profile updates.
            </li>
            <li>
              <strong>Service data:</strong> submission records, event RSVPs, posts, comments, and
              chat messages you create within the App.
            </li>
            <li>
              <strong>Device information:</strong> device type, operating system, and push
              notification tokens when you enable notifications.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-6 mb-2">3. How We Use Your Information</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Provide and operate the AmboPortal services.</li>
            <li>Send push notifications you have opted into (messages, events, posts).</li>
            <li>Track service hours and tour credits for program administration.</li>
            <li>Communicate with you about your account and program activities.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-6 mb-2">4. Data Sharing</h2>
          <p>
            We do not sell your personal information. Your data may be shared with:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>School administration for program management purposes.</li>
            <li>
              Service providers (Supabase for database hosting, Expo for push notifications) that
              process data on our behalf under strict confidentiality agreements.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-6 mb-2">5. Data Storage &amp; Security</h2>
          <p>
            Your data is stored securely using Supabase (PostgreSQL) with row-level security
            policies. All data is transmitted over encrypted HTTPS connections. We implement
            industry-standard practices to protect your information.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-6 mb-2">6. Account Deletion</h2>
          <p>
            You may delete your account at any time from the Profile screen in the App. Deleting
            your account permanently removes your personal information, submissions, posts,
            comments, chat messages, and all associated data. This action cannot be undone.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-6 mb-2">7. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Access and update your personal information through the App.</li>
            <li>Delete your account and associated data.</li>
            <li>Opt out of push notifications through your device settings.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-6 mb-2">8. Children&apos;s Privacy</h2>
          <p>
            The App is intended for use by high school students (ages 13 and older) and school
            staff. We do not knowingly collect information from children under 13. If you are
            under 18, you should use the App only with the involvement of a parent or guardian.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-6 mb-2">9. Changes to This Policy</h2>
          <p>
            We may update this policy from time to time. We will notify users of material changes
            through the App or via email.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-6 mb-2">10. Contact Us</h2>
          <p>
            If you have questions about this privacy policy or your data, contact us at{" "}
            <a href="mailto:support@127makes.com" className="text-brand underline">
              support@127makes.com
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
