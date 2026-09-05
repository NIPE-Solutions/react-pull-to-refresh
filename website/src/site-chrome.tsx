export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="brand" href="/" aria-label="React Pull to Refresh home">
        <span className="brand-mark" aria-hidden="true">
          ↓
        </span>
        <span className="brand-label">React Pull to Refresh</span>
      </a>
      <div className="header-family" aria-label="NIPE Open Source family">
        <strong>Primitives</strong>
        <a href="https://opensource.nipesolutions.com">NIPE Open Source</a>
      </div>
      <nav aria-label="Primary navigation">
        <a href="/#quick-start">Quick start</a>
        <a href="/#gesture-lab">Gesture Lab</a>
        <a href="/#browser-behavior">Browsers</a>
        <a href="https://github.com/NIPE-Solutions/react-pull-to-refresh">
          GitHub
        </a>
      </nav>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer>
      <p>
        <a href="https://opensource.nipesolutions.com">
          Part of NIPE Open Source
        </a>
      </p>
      <nav aria-label="Legal">
        <a href="https://github.com/NIPE-Solutions/react-pull-to-refresh/blob/main/CHANGELOG.md">
          Changelog
        </a>
        <a href="https://github.com/NIPE-Solutions/react-pull-to-refresh/security/policy">
          Security
        </a>
        <a href="/imprint/">Imprint</a>
        <a href="/privacy/">Privacy</a>
        <a href="https://github.com/NIPE-Solutions/react-pull-to-refresh/blob/main/LICENSE">
          MIT License
        </a>
      </nav>
    </footer>
  )
}
