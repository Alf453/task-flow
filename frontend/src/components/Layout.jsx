import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const Icon = ({ name }) => {
  const icons = {
    dashboard: '⬡', projects: '◈', logout: '↪', plus: '+', tasks: '✦',
    team: '◉', settings: '◎', chevron: '›',
  };
  return <span style={{ fontSize: 16, lineHeight: 1 }}>{icons[name] || '•'}</span>;
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    api.get('/projects').then(r => setProjects(r.data.projects.slice(0, 6)));
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="nav-logo">
          Task<span>Flow</span>
        </div>

        <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Icon name="dashboard" /> Dashboard
        </NavLink>
        <NavLink to="/projects" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Icon name="projects" /> Projects
        </NavLink>

        {projects.length > 0 && (
          <>
            <div className="nav-section">Recent Projects</div>
            {projects.map(p => (
              <NavLink
                key={p.id}
                to={`/projects/${p.id}`}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                style={{ fontSize: 13 }}
              >
                <span className="nav-project-dot" style={{ background: p.color }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
              </NavLink>
            ))}
          </>
        )}

        <div style={{ flex: 1 }} />

        <div style={{ borderTop: '1.5px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', marginBottom: 4 }}>
            <img src={user?.avatar} alt={user?.name} className="avatar avatar-sm" />
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
            </div>
          </div>
          <button className="nav-item" onClick={handleLogout} style={{ width: '100%', cursor: 'pointer', color: 'var(--red)' }}>
            <Icon name="logout" /> Sign Out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
