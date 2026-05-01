import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { formatDistanceToNow, isPast, isToday, parseISO } from 'date-fns';

function DueLabel({ date }) {
  if (!date) return null;
  const d = parseISO(date);
  if (isPast(d) && !isToday(d)) return <span className="badge priority-urgent" style={{ fontSize: 11 }}>Overdue</span>;
  if (isToday(d)) return <span className="badge priority-high" style={{ fontSize: 11 }}>Due Today</span>;
  return <span className="text-xs text-muted">{formatDistanceToNow(d, { addSuffix: true })}</span>;
}

const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };
const STATUS_COLORS = { todo: 'var(--text-2)', in_progress: 'var(--blue)', review: 'var(--yellow)', done: 'var(--green)' };

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-full"><div className="spinner" /> Loading dashboard…</div>;

  const { stats, myTasks, overdueTasks, statusBreakdown, recentActivity } = data;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user.name.split(' ')[0]} 👋</h1>
        <p>Here's what's happening across your projects today.</p>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        {[
          { label: 'Projects', value: stats.total_projects || 0, icon: '◈', color: 'var(--accent)' },
          { label: 'My Tasks', value: stats.my_tasks || 0, icon: '✦', color: 'var(--blue)' },
          { label: 'Completed', value: stats.completed_tasks || 0, icon: '✓', color: 'var(--green)' },
          { label: 'Overdue', value: stats.overdue_count || 0, icon: '⚠', color: 'var(--red)' },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-icon">{s.icon}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom: 28 }}>
        {/* My Tasks */}
        <div className="card">
          <div className="flex-between" style={{ marginBottom: 16 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>My Tasks</h2>
            <span className="badge status-todo">{myTasks.length}</span>
          </div>
          {myTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-2)' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
              <div style={{ fontSize: 14 }}>All caught up!</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {myTasks.map(t => (
                <div
                  key={t.id}
                  onClick={() => navigate(`/projects/${t.project_id}/tasks/${t.id}`)}
                  style={{ padding: '12px 14px', background: 'var(--bg-3)', borderRadius: 10, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8, transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-4)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-3)'}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{t.title}</span>
                    <span className={`badge status-${t.status}`} style={{ fontSize: 11, flexShrink: 0 }}>{STATUS_LABELS[t.status]}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.project_color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{t.project_name}</span>
                    <div style={{ flex: 1 }} />
                    <DueLabel date={t.due_date} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Status breakdown */}
          <div className="card">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Task Status</h2>
            {statusBreakdown.length === 0 ? (
              <div style={{ color: 'var(--text-2)', fontSize: 14, textAlign: 'center', padding: '16px 0' }}>No tasks yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['todo', 'in_progress', 'review', 'done'].map(s => {
                  const item = statusBreakdown.find(x => x.status === s);
                  const count = item?.count || 0;
                  const total = statusBreakdown.reduce((a, x) => a + x.count, 0);
                  const pct = total ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={s}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                        <span style={{ color: STATUS_COLORS[s], fontWeight: 500 }}>{STATUS_LABELS[s]}</span>
                        <span style={{ color: 'var(--text-2)' }}>{count} ({pct}%)</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--bg-4)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: STATUS_COLORS[s], borderRadius: 3, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Overdue */}
          {overdueTasks.length > 0 && (
            <div className="card" style={{ borderColor: 'rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.05)' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--red)', marginBottom: 14 }}>
                ⚠ Overdue ({overdueTasks.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {overdueTasks.slice(0, 4).map(t => (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/projects/${t.project_id}/tasks/${t.id}`)}
                    style={{ fontSize: 13, padding: '8px 12px', background: 'var(--bg-3)', borderRadius: 8, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 8 }}
                  >
                    <span style={{ fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                    <span style={{ color: 'var(--red)', flexShrink: 0 }}>{t.due_date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Recent Activity</h2>
        {recentActivity.length === 0 ? (
          <div style={{ color: 'var(--text-2)', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>No recent activity</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map(t => (
                  <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${t.project_id}/tasks/${t.id}`)}>
                    <td style={{ fontWeight: 500 }}>{t.title}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.project_color }} />
                        {t.project_name}
                      </div>
                    </td>
                    <td><span className={`badge status-${t.status}`}>{STATUS_LABELS[t.status]}</span></td>
                    <td style={{ color: 'var(--text-2)', fontSize: 13 }}>{formatDistanceToNow(new Date(t.updated_at), { addSuffix: true })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
