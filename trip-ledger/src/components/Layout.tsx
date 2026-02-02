import { Link, useLocation } from 'react-router-dom'

const nav = [
  { path: '/', label: 'Рейсы' },
  { path: '/stats', label: 'Статистика' },
  { path: '/reports', label: 'Отчёты' },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const loc = useLocation()

  return (
    <div className="layout">
      <header className="header">
        <h1 className="logo">TripLedger</h1>
        <nav className="nav nav-top">
          {nav.map(({ path, label }) => (
            <Link
              key={path}
              to={path}
              className={loc.pathname === path ? 'nav-link active' : 'nav-link'}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="main">{children}</main>
      <nav className="nav nav-bottom">
        {nav.map(({ path, label }) => (
          <Link
            key={path}
            to={path}
            className={loc.pathname === path ? 'nav-link active' : 'nav-link'}
          >
            {label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
