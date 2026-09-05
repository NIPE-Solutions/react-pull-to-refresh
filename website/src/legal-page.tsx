import { SiteFooter, SiteHeader } from './site-chrome'

interface LegalPageProps {
  kind: 'imprint' | 'privacy'
}

function Imprint() {
  return (
    <>
      <h1>Imprint</h1>
      <p className="legal-intro">
        Information pursuant to Section 5 of the Austrian E-Commerce Act and
        Section 25 of the Austrian Media Act.
      </p>

      <section>
        <h2>Service provider and media owner</h2>
        <address>
          <strong>NIPE Solutions e.U.</strong>
          <br />
          Proprietor: Nicholas Petrasek
          <br />
          Achtergasse 10
          <br />
          1230 Vienna, Austria
        </address>
        <p>
          Email:{' '}
          <a href="mailto:office@nipesolutions.com">office@nipesolutions.com</a>
          <br />
          Phone: <a href="tel:+436769654266">+43 676 9654266</a>
        </p>
      </section>

      <section>
        <h2>Company information</h2>
        <dl>
          <div>
            <dt>Company register number</dt>
            <dd>FN 585066t</dd>
          </div>
          <div>
            <dt>Register court</dt>
            <dd>Commercial Court of Vienna</dd>
          </div>
          <div>
            <dt>Registered office</dt>
            <dd>Vienna</dd>
          </div>
          <div>
            <dt>VAT identification number</dt>
            <dd>ATU78464412</dd>
          </div>
        </dl>
      </section>

      <section>
        <h2>Trade and supervisory information</h2>
        <p>
          Trade: Services in automatic data processing and information
          technology. Supervisory authority: Municipal District Office for
          Vienna’s 23rd district. Chamber membership: Vienna Chamber of
          Commerce.
        </p>
      </section>

      <section>
        <h2>Editorial direction</h2>
        <p>
          Information about open-source software and the work of NIPE Solutions.
          Responsible for editorial content: Nicholas Petrasek.
        </p>
      </section>
    </>
  )
}

function Privacy() {
  return (
    <>
      <h1>Privacy</h1>
      <p className="legal-intro">
        This notice explains which personal data may be processed when you use
        this documentation website.
      </p>

      <section>
        <h2>Controller</h2>
        <p>
          NIPE Solutions e.U., Nicholas Petrasek, Achtergasse 10, 1230 Vienna,
          Austria. Contact:{' '}
          <a href="mailto:office@nipesolutions.com">office@nipesolutions.com</a>
          .
        </p>
      </section>

      <section>
        <h2>Hosting</h2>
        <p>
          This website is hosted by Vercel Inc., 440 N Barranca Avenue #4133,
          Covina, CA 91723, USA. Vercel may process technical request data,
          including IP address, timestamp, requested resource, referrer, user
          agent, and response status, to deliver and secure the website.
        </p>
        <p>
          Processing is based on our legitimate interest in providing a secure
          and reliable website. Where data is transferred outside the EEA,
          Vercel provides appropriate safeguards under applicable data
          protection law.
        </p>
      </section>

      <section>
        <h2>No tracking</h2>
        <p>
          This website does not use analytics, advertising, session replay, or
          non-essential cookies. Its fonts are bundled with the website and
          served locally, so visiting a page does not request them from an
          external font provider.
        </p>
      </section>

      <section>
        <h2>External links and contact</h2>
        <p>
          Links to GitHub, npm, and NIPE Open Source lead to third-party
          services governed by their own privacy notices. If you contact us, we
          process the information you provide to respond and retain it only as
          long as necessary or legally required.
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>
          Subject to the GDPR, you may request access, correction, erasure,
          restriction, portability, or object to processing. You may also lodge
          a complaint with the Austrian Data Protection Authority.
        </p>
      </section>
    </>
  )
}

export function LegalPage({ kind }: LegalPageProps) {
  return (
    <>
      <SiteHeader />
      <main className="legal-page">
        <a className="legal-back" href="/">
          ← Documentation
        </a>
        {kind === 'imprint' ? <Imprint /> : <Privacy />}
      </main>
      <SiteFooter />
    </>
  )
}
