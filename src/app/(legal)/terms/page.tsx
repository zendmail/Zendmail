import type { Metadata } from "next";
import Link from "next/link";
import { LegalDoc } from "@/components/legal/legal-doc";
import { legal } from "@/lib/legal";

export const metadata: Metadata = { title: "Terms of Service — Zendmail" };

export default function TermsPage() {
  return (
    <LegalDoc
      title="Terms of Service"
      intro={`These terms govern your use of Zendmail, provided by ${legal.company}. By creating an account or using the service you agree to them.`}
    >
      <h2>1. The service</h2>
      <p>
        Zendmail lets you manage contacts, connect e-commerce stores, and design, schedule and send email campaigns and automations. We may
        change or improve features over time.
      </p>

      <h2>2. Accounts</h2>
      <p>
        You must be 18 or older and able to form a binding contract. Provide accurate information, keep your credentials secure, and
        you are responsible for activity in your workspace, including by team members you invite.
      </p>

      <h2>3. Your content and contacts</h2>
      <p>
        You own your content and data. You grant us a limited licence to host, process and transmit it only to provide the service. You are
        responsible for having the right to use and email every contact you upload or sync, including valid consent where the law requires
        it, and for the accuracy and legality of your campaigns.
      </p>

      <h2>4. Acceptable use</h2>
      <p>
        You must follow our <Link href="/acceptable-use">Acceptable Use &amp; Anti-Spam Policy</Link>. We may suspend sending or an account
        that sends spam, uses purchased or scraped lists, or generates abnormal bounce or complaint rates, to protect recipients and our
        sending reputation.
      </p>

      <h2>5. Connected services</h2>
      <p>
        When you connect Shopify, WooCommerce or other services, you authorise us to access them as described at connection. Their own
        terms apply to your use of them, and we are not responsible for their availability or changes.
      </p>

      <h2>6. Plans, billing and cancellation</h2>
      <p>
        Paid plans are billed in advance through our payment processor and renew until cancelled. Fees are non-refundable except where
        required by law. You can cancel at any time and keep access until the end of the paid period. We may change prices with reasonable
        notice before your next renewal.
      </p>

      <h2>7. AI features</h2>
      <p>
        AI-generated suggestions may be inaccurate. You are responsible for reviewing content before sending it. Content you submit to an AI
        feature is processed by our AI provider to produce the result.
      </p>

      <h2>8. Availability</h2>
      <p>We aim for reliable service but do not guarantee uninterrupted or error-free operation, or that emails will be delivered or opened.</p>

      <h2>9. Suspension and termination</h2>
      <p>
        You may stop using Zendmail at any time. We may suspend or terminate access for breach of these terms, legal requirements or risk to
        the service. On termination you may export your data for a reasonable period, after which we may delete it.
      </p>

      <h2>10. Disclaimers and liability</h2>
      <p>
        The service is provided "as is" without warranties to the fullest extent permitted by law. To the fullest extent permitted by law,
        our total liability for any claim relating to the service is limited to the fees you paid in the 12 months before the claim, and we
        are not liable for indirect or consequential losses. Nothing limits liability that cannot be limited by law.
      </p>

      <h2>11. Changes to these terms</h2>
      <p>We may update these terms; continued use after notice of a change means you accept it.</p>

      <h2>12. Governing law</h2>
      <p>These terms are governed by the laws of {legal.jurisdiction}, without regard to conflict-of-law rules.</p>

      <h2>13. Contact</h2>
      <p>{legal.supportEmail} · {legal.address}</p>
    </LegalDoc>
  );
}
