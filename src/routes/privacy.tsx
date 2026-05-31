import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [{ title: "Privacy Policy — NorthPaw" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link to="/" className="text-sm text-primary hover:underline">
        ← Back to NorthPaw
      </Link>
      <h1 className="mt-6 text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: June 1, 2026</p>

      <Section title="Who we are">
        NorthPaw ("we", "us", "our") is a pet community app for Calgary, Alberta, Canada, operated
        by Mukthar Mulo. You can reach us at mwiz185@gmail.com.
      </Section>

      <Section title="What information we collect">
        <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-muted-foreground">
          <li>
            <strong>Account information:</strong> Email address when you sign up.
          </li>
          <li>
            <strong>Profile information:</strong> Your display name, city, and account type.
          </li>
          <li>
            <strong>Pet information:</strong> Pet name, species, breed, age, gender, city, bio, and
            photos you upload.
          </li>
          <li>
            <strong>Usage data:</strong> Which pets you like or pass on (for matching). Private
            messages between matched users.
          </li>
        </ul>
      </Section>

      <Section title="How we use your information">
        <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-muted-foreground">
          <li>To match your pets with compatible pets from other users.</li>
          <li>To allow communication between matched users via in-app chat.</li>
          <li>
            To display your pet's profile in adoption and marketplace listings (only if you enable
            those features).
          </li>
        </ul>
      </Section>

      <Section title="Who we share your information with">
        We do not sell your data. We share data only with:
        <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-muted-foreground">
          <li>
            <strong>Supabase</strong> — our database and authentication provider (servers in
            Canada/US).
          </li>
          <li>
            <strong>Google</strong> — if you sign in with Google, Google processes your login.
          </li>
        </ul>
      </Section>

      <Section title="Your rights">
        You can delete your account and all associated data at any time by contacting us at
        mwiz185@gmail.com. We will process deletion requests within 30 days.
      </Section>

      <Section title="Data retention">
        We keep your data for as long as your account is active. Deleted accounts have their data
        removed within 30 days.
      </Section>

      <Section title="Contact us">
        Questions? Email us at{" "}
        <a href="mailto:mwiz185@gmail.com" className="text-primary underline">
          mwiz185@gmail.com
        </a>
        .
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-1 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}
