interface HeaderProps {
  email?: string
}

function Header({ email }: HeaderProps) {
  const username = email?.split('@')[0] || 'Student'

  const displayName =
    username.charAt(0).toUpperCase() + username.slice(1)

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <p className="header-eyebrow">
          YOUR ACADEMIC SPACE
        </p>

        <h1>
          Good to see you, {displayName}.
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
          <strong>{displayName}</strong>

          <span>{email}</span>
        </div>
      </div>
    </header>
  )
}

export default Header