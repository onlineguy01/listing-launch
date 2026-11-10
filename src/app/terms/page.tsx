import { GUARANTEE_DAYS } from "@/lib/pricing/packages";
import { SITE_NAME } from "@/lib/config/brand";

export default function TermsPage() {
  return (
    <article className="prose prose-sm max-w-2xl grid gap-4">
      <h1 className="text-3xl font-bold">Terms of service</h1>
      <p className="text-muted">Plain English, because that is how we want you to understand what you are buying.</p>

      <h2 className="text-lg font-semibold mt-4">What you are buying</h2>
      <p>A one-time package of business listing work. For each directory in your package we either create a new listing, correct an existing one, or submit your business and then verify the result. The exact directories are listed before you pay.</p>

      <h2 className="text-lg font-semibold mt-4">The {GUARANTEE_DAYS}-day guarantee</h2>
      <p>Each listing in your package carries a share of the package price. A listing counts as delivered when it is confirmed live: by our automated check of the directory page, by our team, or by you confirming it on your order page. Any listing not confirmed live within {GUARANTEE_DAYS} days of payment is refunded automatically to your original payment method. You will see every refund itemized on your order page and in your completion report.</p>

      <h2 className="text-lg font-semibold mt-4">What we do not sell</h2>
      <ul className="list-disc pl-5 grid gap-1">
        <li>Profiles that only the owner can create or claim, such as Google Business Profile, Apple Business Connect, Bing Places, Yelp, Facebook, Nextdoor and LinkedIn. We check them and tell you what to do, free of charge.</li>
        <li>Search rankings, traffic, or a guaranteed number of links. Directory listings are real citations and most include a link to your website, but we make no promises about rankings.</li>
        <li>Anything we would have to invent. Every fact on your listings comes from you or from your existing public listings.</li>
      </ul>

      <h2 className="text-lg font-semibold mt-4">Directory fees</h2>
      <p>A few directories charge their own fee. Where that applies, it is shown as a separate line at checkout and passed through at cost.</p>

      <h2 className="text-lg font-semibold mt-4">Your listings are yours</h2>
      <p>Listings are created under your business name and, wherever a directory allows it, your email address. Any login we create for you is handed over in your completion report.</p>

      <h2 className="text-lg font-semibold mt-4">Your part</h2>
      <p>Some directories send a confirmation email or text to the business. We tell you when to expect it and what to click. A listing that stays unconfirmed because that step was not completed is still covered by the guarantee.</p>

      <p className="text-xs text-muted mt-6">{SITE_NAME}. Questions: reply to any email we send you.</p>
    </article>
  );
}
