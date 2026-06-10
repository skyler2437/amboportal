import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - Ambassador Portal",
};

export default function TermsOfServicePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: March 24, 2026</p>

      <div className="prose prose-gray max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-semibold mt-6 mb-2">1. Acceptance of Terms</h2>
          <p>
            By accessing or using AmboPortal (&quot;the App&quot;), you agree to be bound by
            these Terms of Service. If you do not agree, you may not use the App.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-6 mb-2">2. Eligibility</h2>
          <p>
            The App is intended for use by high school students, school staff, administrators,
            and applicants. You must have a valid account created or approved by an administrator
            to access the App.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-6 mb-2">3. Account Responsibilities</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
            <li>You agree to provide accurate and current information in your profile.</li>
            <li>You must notify an administrator immediately if you suspect unauthorized access to your account.</li>
            <li>You may not share your account with others or create multiple accounts.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-6 mb-2">4. Acceptable Use</h2>
          <p>When using the App, you agree to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Accurately report service hours and tour credits.</li>
            <li>Communicate respectfully in posts, comments, and chat messages.</li>
            <li>Not upload harmful, offensive, or inappropriate content.</li>
            <li>Not attempt to access data or features beyond your authorized role.</li>
            <li>Not use the App for any unlawful purpose.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-6 mb-2">5. Content You Create</h2>
          <p>
            You retain ownership of content you submit (posts, comments, messages). By submitting
            content, you grant Skyler A. Stevens a non-exclusive, royalty-free license to
            use, display, and store that content for the purposes of operating the App.
          </p>
          <p>
            Administrators may review, edit, or remove content that violates these terms or school
            policies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-6 mb-2">6. Third-Party Services</h2>
          <p>
            The App integrates with third-party services including Google Calendar for event
            syncing. Your use of these integrations is subject to the respective third-party terms
            of service. Connecting a Google account is optional and can be disconnected at any time.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-6 mb-2">7. Push Notifications</h2>
          <p>
            The App may send push notifications for new messages, events, posts, and administrative
            updates. You can manage notification preferences in your profile settings or disable
            them through your device settings.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-6 mb-2">8. Termination</h2>
          <p>
            You may delete your account at any time from the Profile screen. Administrators reserve
            the right to suspend or terminate accounts that violate these terms. Upon termination,
            your data will be permanently deleted in accordance with our{" "}
            <a href="/privacy" className="text-brand underline">
              Privacy Policy
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-6 mb-2">9. Disclaimer of Warranties</h2>
          <p>
            The App is provided &quot;as is&quot; without warranties of any kind, express or
            implied. We do not guarantee that the App will be available at all times or free from
            errors.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-6 mb-2">10. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, Skyler A. Stevens shall not be liable
            for any indirect, incidental, or consequential damages arising from your use of the App.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-6 mb-2">11. Changes to These Terms</h2>
          <p>
            We may update these terms from time to time. Continued use of the App after changes are
            posted constitutes acceptance of the revised terms. We will notify users of material
            changes through the App.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-6 mb-2">12. Contact Us</h2>
          <p>
            If you have questions about these terms, contact us at{" "}
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
