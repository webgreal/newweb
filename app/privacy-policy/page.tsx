export const metadata = { title: "Privacy Policy - Webgreal" };

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <div className="glass-card p-10">
        <p className="micro-label">Legal</p>
        <h1 className="text-3xl font-bold mt-2 mb-6">Privacy Policy</h1>
        <div className="space-y-4 text-slate-700 leading-relaxed">
          <p>
            Webgreal is a web design and digital marketing agency. This policy explains what
            information we collect and how we use it.
          </p>
          <div>
            <h2 className="font-semibold text-slate-900">What we collect</h2>
            <p>
              When you apply or sign up, we collect your name, email address, phone number and
              business information (such as your business name and domain). We collect only what
              we need to work with you.
            </p>
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">How we use it</h2>
            <p>
              We use this information only to review applications, deliver our services and
              contact you about your project or account. We do not sell your information to
              anyone, and we do not use it for unrelated purposes.
            </p>
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Retention and security</h2>
            <p>
              We keep your information only as long as needed to provide our services or as
              required by law, and we protect it with appropriate technical and organizational
              safeguards.
            </p>
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Contact</h2>
            <p>
              Questions or requests about your data? Email us at{" "}
              <a href="mailto:[YOUR EMAIL]" className="text-[#1a7bff] hover:underline">
                [YOUR EMAIL]
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
