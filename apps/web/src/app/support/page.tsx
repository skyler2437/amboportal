import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support - AmboPortal",
};

export default function SupportPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">Support</h1>
      <p className="text-sm text-gray-500 mb-8">
        We&apos;re here to help with any questions or issues.
      </p>

      <div className="prose prose-gray max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-semibold mt-6 mb-2">Contact Us</h2>
          <p>
            For questions, bug reports, or general support, reach out to us at{" "}
            <a href="mailto:support@127makes.com" className="text-brand underline">
              support@127makes.com
            </a>
            . We aim to respond within 48 hours.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-6 mb-2">Common Questions</h2>

          <h3 className="text-lg font-medium mt-4 mb-1">How do I log in?</h3>
          <p>
            Enter your email address or 10-digit phone number on the login screen. You&apos;ll
            receive a magic link via email to sign in securely.
          </p>

          <h3 className="text-lg font-medium mt-4 mb-1">How do I submit service hours?</h3>
          <p>
            Navigate to the Submissions page from your dashboard and tap &quot;New Submission.&quot;
            Fill in the service date, type, hours, and any additional details, then submit for
            admin review.
          </p>

          <h3 className="text-lg font-medium mt-4 mb-1">How do I delete my account?</h3>
          <p>
            Go to your Profile page and select &quot;Delete Account.&quot; This action is
            permanent and will remove all your data, including submissions, posts, and messages.
          </p>

          <h3 className="text-lg font-medium mt-4 mb-1">Push notifications aren&apos;t working</h3>
          <p>
            Make sure notifications are enabled in your device settings for AmboPortal. You can
            also toggle notifications from the Profile page within the app.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-6 mb-2">Report a Bug</h2>
          <p>
            If you encounter a bug, please email{" "}
            <a href="mailto:support@127makes.com" className="text-brand underline">
              support@127makes.com
            </a>{" "}
            with a description of the issue, the device you&apos;re using, and any screenshots
            if possible.
          </p>
        </section>
      </div>
    </main>
  );
}
