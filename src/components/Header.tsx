interface HeaderProps {
  email?: string
  name?: string
}

function getGreeting(): string {
  const hour = new Date().getHours()

  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'

  return 'Good evening'
}

function Header({ email, name }: HeaderProps) {
  const fullName =
    name?.trim() ||
    email?.split('@')[0] ||
    'Student'

  const firstName = fullName.split(/\s+/)[0]

  const displayName =
    firstName.charAt(0).toUpperCase() + firstName.slice(1)

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <p className="header-eyebrow">
          YOUR ACADEMIC SPACE
        </p>

        <h1>
          {getGreeting()}, {displayName}.
        </h1>

        <p className="header-subtitle">
          Keep your semester organized and stay ahead.
        </p>
      </div>

      <div className="profile-chip">
        <div className="profile-avatar">
          {displayName.charAt(0).toUpperCase()}
        </div>

        <div className="profile-info">
          <strong>{fullName}</strong>

          <span>{email}</span>
        </div>
      </div>
    </header>
  )
}

export default Header
