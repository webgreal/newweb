export const metadata = { title: "Free Website Giveaway Terms - Webgreal" };

const sections: { title: string; body: string[] }[] = [
  {
    title: "1. Organizer",
    body: [
      "This giveaway is organized by Webgreal. It is not sponsored, endorsed or administered by, or associated with, Meta, Facebook or Instagram.",
    ],
  },
  {
    title: "2. Who can apply",
    body: [
      "Applicants must be owners or authorized representatives of small businesses in the Chicago, Illinois area and at least 18 years old. One application per business.",
    ],
  },
  {
    title: "3. What is offered",
    body: [
      "10 selected businesses each receive one custom-designed website built by Webgreal at no design or development charge.",
    ],
  },
  {
    title: "4. What the winner pays",
    body: [
      "The website itself is free. The recurring cost is hosting and the domain, starting at $24 per month or $200 per year. You can cancel at any time from your account. Extra services, such as ongoing maintenance, are optional, quoted separately and provided only with your written agreement.",
    ],
  },
  {
    title: "5. How winners are selected",
    body: [
      "Applying does not guarantee selection. Businesses are chosen by Webgreal based on the completeness of the application, fit and capacity. The selection is not random.",
    ],
  },
  {
    title: "6. Dates",
    body: [
      "Applications close on November 27, 2026. Selected businesses will be contacted by phone or email. If we do not receive a response within 7 days, another applicant may be selected.",
    ],
  },
  {
    title: "7. Winner responsibilities",
    body: [
      "Selected businesses agree to provide their business details and content and to join a short Zoom call during the project.",
    ],
  },
  {
    title: "8. Domain",
    body: [
      "You may use an existing domain or request a new one, subject to availability and confirmation before registration.",
    ],
  },
  {
    title: "9. Data use",
    body: [
      "Information you provide is used as described in our Privacy Policy (see /privacy-policy).",
    ],
  },
  {
    title: "10. Changes and cancellation",
    body: [
      "Webgreal may update these terms or cancel the giveaway if circumstances require; any changes will be published on this page.",
    ],
  },
  {
    title: "11. Contact",
    body: [
      "Questions about these terms? Email us at [YOUR EMAIL].",
    ],
  },
];

export default function GiveawayTermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <div className="glass-card p-10">
        <p className="micro-label">Legal</p>
        <h1 className="text-3xl font-bold mt-2">Free Website Giveaway Terms</h1>
        <p className="text-sm text-slate-500 mt-2 mb-6">Last updated: November 12, 2026</p>
        <div className="space-y-5 text-slate-700 leading-relaxed">
          {sections.map((s) => (
            <div key={s.title}>
              <h2 className="font-semibold text-slate-900">{s.title}</h2>
              {s.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
