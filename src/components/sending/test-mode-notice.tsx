/** Shown only while the platform sender is still the provider's test address (see senderInTestMode). */
export function TestModeNotice() {
  return (
    <p role="status" className="rounded-[12px] bg-warning-surface px-4 py-3 text-[13px] text-warning">
      <strong className="font-semibold">Email delivery is in test mode.</strong> Confirmation and campaign emails are only delivered to the platform owner&apos;s own address until a sending domain is verified. Real visitors will not receive them yet.
    </p>
  );
}
