export default function Home() {
  return (
    <main className="page-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Pick-a-Date home">
          Pick-a-Date
        </a>
        <span className="status-pill">Fresh start</span>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Plan something worth looking forward to</p>
          <h1>An easier way to ask someone out.</h1>
          <p className="hero-summary">
            Share an invitation, choose a time and activity together, discover
            a place, and keep both people in the loop.
          </p>
          <a className="primary-link" href="#product-flow">
            Preview the product flow
          </a>
        </div>

        <aside className="foundation-card" aria-labelledby="foundation-title">
          <p className="card-kicker">Project foundation</p>
          <h2 id="foundation-title">Ready for the first product slice</h2>
          <p>
            This is a clean Next.js baseline. Invitation forms, recommendations,
            and email delivery are intentionally not connected yet.
          </p>
        </aside>
      </section>

      <section className="flow-section" id="product-flow" aria-labelledby="flow-title">
        <div className="section-heading">
          <p className="eyebrow">Initial direction</p>
          <h2 id="flow-title">One shared path from invitation to confirmation</h2>
        </div>

        <ol className="flow-grid">
          <li>
            <span>01</span>
            <h3>Pick a time</h3>
            <p>The invitee can respond with a date and time that works.</p>
          </li>
          <li>
            <span>02</span>
            <h3>Choose activities</h3>
            <p>Both people can express what they would enjoy doing.</p>
          </li>
          <li>
            <span>03</span>
            <h3>Find a place</h3>
            <p>Suggestions can account for the activity and location context.</p>
          </li>
          <li>
            <span>04</span>
            <h3>Confirm together</h3>
            <p>Both people receive the same final plan by email.</p>
          </li>
        </ol>
      </section>
    </main>
  );
}
