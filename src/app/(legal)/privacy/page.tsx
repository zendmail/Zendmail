import type { Metadata } from "next";
import { LegalDoc } from "@/components/legal/legal-doc";
import { legal } from "@/lib/legal";

export const metadata: Metadata = { title: "Privacy Policy — Zendmail" };

export default function PrivacyPage() {
  return (
    <LegalDoc
      title="Privacy Policy"
      intro={`This policy explains how ${legal.company} ("we", "us") collects and uses personal data when you use Zendmail, our email marketing platform.`}
    >
      <h2>1. Who is responsible for your data</h2>
      <p>
        For account and billing data of Zendmail users, {legal.company} is the controller. For the contacts, customers and store data that
        you upload or connect to your workspace, <strong>you are the controller and we act as your processor</strong>, handling it only to
        provide the service on your instructions.
      </p>
      <p>Contact: {legal.privacyEmail}. Address: {legal.address}.</p>

      <h2>2. Data we collect</h2>
      <ul>
        <li><strong>Account data:</strong> name, email address, hashed password, workspace and team details.</li>
        <li><strong>Workspace data you provide:</strong> contacts and their attributes, segments, campaigns, templates, forms and uploaded images.</li>
        <li><strong>Store data you connect:</strong> from Shopify or WooCommerce — products (including images), orders, and buyer name/email attached to orders. Store credentials are encrypted before storage. Buyer details are kept on order records and are not added as marketing contacts or granted email consent automatically.</li>
        <li><strong>Email engagement data:</strong> delivery, open, click, bounce, complaint and unsubscribe events for emails sent through Zendmail.</li>
        <li><strong>Billing data:</strong> handled by our payment processor; we do not store full card numbers.</li>
        <li><strong>Technical data:</strong> a session cookie to keep you signed in, IP address and logs for security, rate limiting and abuse prevention.</li>
      </ul>

      <h2>3. How we use data</h2>
      <ul>
        <li>To provide, secure and support the service, including syncing your store and sending your campaigns.</li>
        <li>To process payments and prevent fraud and abuse.</li>
        <li>To generate AI suggestions you request (content you submit for that feature is sent to our AI provider).</li>
        <li>To comply with legal obligations.</li>
      </ul>
      <p>We do not sell personal data.</p>

      <h2>4. Service providers (sub-processors)</h2>
      <p>We use trusted providers to run Zendmail. They process data only to deliver their service to us:</p>
      <ul>
        <li>Vercel — application hosting</li>
        <li>Neon — database hosting</li>
        <li>Upstash — rate limiting</li>
        <li>Resend — email delivery</li>
        <li>Stripe — payments</li>
        <li>Amazon Web Services (S3) — campaign image storage</li>
        <li>Anthropic — AI features</li>
        <li>Shopify and WooCommerce — the stores you choose to connect</li>
      </ul>

      <h2>5. Shopify and store data</h2>
      <p>
        When you connect a Shopify store you authorise Zendmail to read the products, orders and customers scopes shown at connection. We use
        this data only to show it in your workspace and to power the features you use. Disconnecting a store removes its stored credentials,
        and uninstalling Zendmail in Shopify revokes access. You can ask us to delete the synced data for a store.
      </p>

      <h2>6. Retention</h2>
      <p>
        We keep data while your account is active and for a limited period afterwards for backups, security and legal reasons. You can ask
        us to delete your account and workspace data at any time.
      </p>

      <h2>7. Your rights</h2>
      <p>
        Depending on where you live you may have the right to access, correct, delete or export your personal data, to object to or restrict
        processing, and to withdraw consent. If your contact lists include people in your own audience, direct their requests to you; we
        will help you respond. To exercise a right regarding your account data, email {legal.privacyEmail}.
      </p>

      <h2>8. Security</h2>
      <p>
        We use encryption in transit, encryption of store credentials at rest, access controls and rate limiting. No system is perfectly
        secure; please protect your password and report suspected issues to {legal.supportEmail}.
      </p>

      <h2>9. International transfers</h2>
      <p>Our providers may process data in countries other than yours. Where required we rely on appropriate safeguards.</p>

      <h2>10. Children</h2>
      <p>Zendmail is not intended for anyone under 18 and we do not knowingly collect their data.</p>

      <h2>11. Changes</h2>
      <p>We will update this policy as the service changes and revise the date above. Material changes will be notified in the product or by email.</p>

      <h2>12. Contact</h2>
      <p>{legal.privacyEmail} · {legal.address}</p>
    </LegalDoc>
  );
}
