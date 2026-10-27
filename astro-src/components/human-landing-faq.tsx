/**
 * Below-fold FAQ for human Astro landing — aligned with crawler twin FAQs.
 * Mount INSIDE LandingShell / SteinsGate so cloaked visits never see it.
 */
const FAQS = [
  {
    q: "How do I sign in to my Peak1 Administration benefit accounts?",
    a: "Enter your User ID and password on this page, then complete any verification steps your employer requires. After approval, you continue to the WealthCare Portal to manage FSA, HSA, HRA, VEBA, commuter, and COBRA accounts in one place.",
  },
  {
    q: "What should I do if I forgot my User ID or password?",
    a: "Use the Forgot Username or Forgot Password links on the sign-in form and follow the self-service prompts. If you are still locked out, call Member Care at 866.315.1777 or email membercare@peakoneadmin.com during business hours.",
  },
  {
    q: "How do I register for online access to my Peak One benefit accounts?",
    a: "Select Register on the login screen and complete enrollment with the personal details your plan administrator has on file. Registration creates your WealthCare Portal credentials so you can view balances, submit claims, and manage your benefits debit card.",
  },
  {
    q: "Which accounts can I manage after I sign in?",
    a: "Participants typically access health savings accounts, flexible spending accounts, health reimbursement arrangements, dependent care accounts, limited-purpose FSAs, commuter benefits, and COBRA continuation coverage. Balances, claims, statements, and tax forms such as 1099-SA and 5498-SA are available from the portal dashboard.",
  },
  {
    q: "How do I submit an FSA or HSA claim or receipt?",
    a: "After authentication, open Claims or Reimbursements, upload receipt documentation or enter provider details, and track status online. Many expenses can be paid directly with the Peak One benefits debit card so reimbursement is automatic when the charge qualifies.",
  },
  {
    q: "Is my login session secure?",
    a: "Sessions use encrypted connections and may require multi-step verification before you reach account data. Sign out when you finish on a shared device, and never share your password. Peak1 Administration follows employer plan privacy rules described in the published privacy policy.",
  },
] as const

export function HumanLandingFaq() {
  return (
    <section
      className="mt-10 max-w-xl mx-auto px-4 pb-12 text-sm text-neutral-600"
      aria-labelledby="human-landing-faq-heading"
    >
      <h2
        id="human-landing-faq-heading"
        className="text-base font-semibold text-neutral-900 mb-3"
      >
        Frequently asked questions
      </h2>
      <div className="space-y-2">
        {FAQS.map((item) => (
          <details
            key={item.q}
            className="rounded-md border border-neutral-200 bg-neutral-50/50 p-3"
          >
            <summary className="cursor-pointer font-medium text-neutral-800">
              {item.q}
            </summary>
            <p className="mt-2 text-neutral-600 leading-relaxed">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
