import type { Metadata } from "next";
import { LegalDoc } from "@/components/legal/legal-doc";
import { legal } from "@/lib/legal";

export const metadata: Metadata = { title: "Acceptable Use & Anti-Spam Policy — Zendmail" };

export default function AcceptableUsePage() {
  return (
    <LegalDoc
      title="Acceptable Use & Anti-Spam Policy"
      intro="Zendmail is for permission-based email. This policy protects recipients and keeps email delivery reliable for every customer."
    >
      <h2>1. Permission is required</h2>
      <ul>
        <li>Only email people who have given you permission to receive that kind of email, or where the law otherwise allows it.</li>
        <li>Keep a record of how and when each contact consented.</li>
        <li>Do not buy, rent, scrape or harvest email addresses. Do not email lists you did not collect yourself.</li>
        <li>Buyer details on synced store orders are not marketing consent by themselves. Only email buyers where you have a lawful basis.</li>
      </ul>

      <h2>2. Required content in every marketing email</h2>
      <ul>
        <li>A working unsubscribe link, honoured promptly (and no later than the legal deadline).</li>
        <li>Your accurate sender name and reply address, and a truthful subject line.</li>
        <li>Your valid physical postal address where the law requires it.</li>
      </ul>

      <h2>3. Unsubscribes and suppression</h2>
      <p>
        Zendmail suppresses people who unsubscribe, bounce permanently or complain. You must not re-add or re-email suppressed contacts or
        try to bypass suppression.
      </p>

      <h2>4. Sender quality thresholds</h2>
      <p>
        To protect deliverability we monitor bounce, complaint and unsubscribe rates. Sending may be paused, limited or reviewed if rates
        are unusually high, for example repeated hard bounces or spam complaints. You may be asked to clean your list or show proof of consent.
      </p>

      <h2>5. Prohibited content and conduct</h2>
      <ul>
        <li>Spam, phishing, deceptive or misleading content, impersonation or malware.</li>
        <li>Illegal goods or services, or content that infringes others&apos; rights.</li>
        <li>Sending from a domain you do not control, or falsifying headers.</li>
        <li>Attempts to bypass limits, probe or disrupt the service.</li>
      </ul>

      <h2>6. Enforcement</h2>
      <p>
        We may remove content, pause sending, or suspend or terminate accounts that breach this policy, with or without notice where
        needed to protect recipients or the service.
      </p>

      <h2>7. Report abuse</h2>
      <p>
        If you received an unwanted email sent through Zendmail, use the unsubscribe link in that email, or report it to {legal.supportEmail}
        with the full message headers.
      </p>
    </LegalDoc>
  );
}
