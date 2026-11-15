interface SidebarProps {
  activeItem: string
  onNavigate: (item: string) => void
  onLogout: () => void
  mobileMenuOpen: boolean
  onClose: () => void
}

const navigationItems = [
  { label: 'Dashboard', icon: '⌂' },
  { label: 'Subjects', icon: '◈' },
  { label: 'Marks', icon: '▤' },
  { label: 'Exams', icon: '◷' },
  { label: 'Assignments', icon: '✓' },
  { label: 'Study Planner', icon: '▦' },
  { label: 'Materials', icon: '□' },
  { label: 'Analytics', icon: '↗' },
  { label: 'AI Assistant', icon: '✦' },
]

function Sidebar({
  activeItem,
  onNavigate,
  onLogout,
  mobileMenuOpen,
  onClose,
}: SidebarProps) {
  return (
    <aside
      className={`sidebar ${mobileMenuOpen ? 'mobile-sidebar-open' : ''}`}
      aria-label="Main navigation"
    >
      <div className="sidebar-brand">
        <span className="brand-mark">Y</span>
        <span>YARUKI</span>

        <button
          type="button"
          className="mobile-sidebar-close"
          aria-label="Close navigation menu"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      <nav className="sidebar-nav">
        {navigationItems.map((item) => (
          <button
            key={item.label}
            type="button"
            className={`sidebar-item ${
              activeItem === item.label ? 'active' : ''
            }`}
            aria-current={activeItem === item.label ? 'page' : undefined}
            onClick={() => onNavigate(item.label)}
          >
            <span className="sidebar-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <button
          type="button"
          className={`sidebar-item ${
            activeItem === 'Settings' ? 'active' : ''
          }`}
          aria-current={activeItem === 'Settings' ? 'page' : undefined}
          onClick={() => onNavigate('Settings')}
        >
          <span className="sidebar-icon" aria-hidden="true">
            ⚙
          </span>
          <span>Settings</span>
        </button>

        <button
          type="button"
          className="sidebar-logout"
          onClick={onLogout}
        >
          Log out
        </button>
      </div>
    </aside>
  )
}

export default Sidebar