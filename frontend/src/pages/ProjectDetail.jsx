import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import TaskModal from '../components/TaskModal';
import { formatDistanceToNow, isPast, isToday, parseISO } from 'date-fns';

const STATUS_COLS = [
  { id: 'todo', label: 'To Do', color: 'var(--text-2)' },
  { id: 'in_progress', label: 'In Progress', color: 'var(--blue)' },
  { id: 'review', label: 'Review', color: 'var(--yellow)' },
  { id: 'done', label: 'Done', color: 'var(--green)' },
];
const PRIORITY_ICONS = { low: '↓', medium: '→', high: '↑', urgent: '‼' };
const PRIORITY_COLORS = { low: 'var(--text-3)', medium: 'var(--blue)', high: 'var(--orange)', urgent: 'var(--red)' };

function AddMemberModal({ projectId, onClose, onAdd }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post(`/projects/${projectId}/members`, { email, role });
      onAdd(data.member);
      toast.success('Member added!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add member');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Add Member</h2>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="teammate@company.com" autoFocus />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select value={role} onChange={e => setRole(e.target.value)}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Adding…' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TaskCard({ task, onClick }) {
  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date)) && task.status !== 'done';
  return (
    <div className="task-card" onClick={onClick}>
      <div className="task-title">{task.title}</div>
      <div className="task-meta">
        <span title={`Priority: ${task.priority}`} style={{ color: PRIORITY_COLORS[task.priority], fontSize: 14, fontWeight: 700 }}>
          {PRIORITY_ICONS[task.priority]}
        </span>
        <span className={`badge priority-${task.priority}`} style={{ fontSize: 11 }}>{task.priority}</span>
        {task.comment_count > 0 && <span style={{ fontSize: 12, color: 'var(--text-2)' }}>💬 {task.comment_count}</span>}
      </div>
      <div className="task-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {task.assignee_avatar && <img src={task.assignee_avatar} alt={task.assignee_name} className="avatar avatar-sm" title={task.assignee_name} />}
          {!task.assignee_name && <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Unassigned</span>}
        </div>
        {task.due_date && (
          <span style={{ fontSize: 11, color: isOverdue ? 'var(--red)' : 'var(--text-3)' }}>
            {isOverdue ? '⚠ ' : ''}{task.due_date}
          </span>
        )}
      </div>
    </div>
  );
}

export default function ProjectDetail() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('board');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/projects/${projectId}`),
      api.get(`/projects/${projectId}/tasks`),
    ]).then(([p, t]) => {
      setProject(p.data.project);
      setMembers(p.data.members);
      setTasks(t.data.tasks);
    }).catch(() => navigate('/projects')).finally(() => setLoading(false));
  }, [projectId]);

  const isAdmin = project?.role === 'admin';

  const refreshTasks = async () => {
    const { data } = await api.get(`/projects/${projectId}/tasks`);
    setTasks(data.tasks);
  };

  const handleDeleteProject = async () => {
    if (!confirm('Delete this project and all its tasks? This cannot be undone.')) return;
    try {
      await api.delete(`/projects/${projectId}`);
      toast.success('Project deleted');
      navigate('/projects');
    } catch { toast.error('Failed to delete'); }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm('Remove this member?')) return;
    try {
      await api.delete(`/projects/${projectId}/members/${memberId}`);
      setMembers(m => m.filter(x => x.id !== memberId));
      toast.success('Member removed');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const { data } = await api.put(`/projects/${projectId}/tasks/${taskId}`, { status: newStatus });
      setTasks(t => t.map(x => x.id === taskId ? data.task : x));
    } catch { toast.error('Failed to update status'); }
  };

  const filtered = tasks.filter(t => {
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterAssignee && t.assignee_id !== filterAssignee) return false;
    return true;
  });

  if (loading) return <div className="loading-full"><div className="spinner" /> Loading project…</div>;
  if (!project) return null;

  return (
    <div>
      {/* Header */}
      <div className="detail-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')}>← Back</button>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: project.color }} />
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>{project.name}</h1>
            {project.description && <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>{project.description}</p>}
          </div>
          <span className={`badge ${isAdmin ? 'status-in_progress' : 'status-todo'}`}>{project.role}</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreateTask(true)}>+ Task</button>
          {isAdmin && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddMember(true)}>+ Member</button>
              <button className="btn btn-danger btn-sm" onClick={handleDeleteProject}>Delete</button>
            </>
          )}
        </div>
      </div>

      <div className="page" style={{ paddingTop: 24 }}>
        {/* Tabs */}
        <div className="tabs">
          {['board', 'list', 'members'].map(t => (
            <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)} {t !== 'members' && `(${tasks.length})`}
              {t === 'members' && `(${members.length})`}
            </button>
          ))}
        </div>

        {/* Filters */}
        {tab !== 'members' && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 'auto', minWidth: 130 }}>
              <option value="">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
            </select>
            <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} style={{ width: 'auto', minWidth: 150 }}>
              <option value="">All Assignees</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            {(filterStatus || filterAssignee) && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setFilterStatus(''); setFilterAssignee(''); }}>Clear</button>
            )}
          </div>
        )}

        {/* Board */}
        {tab === 'board' && (
          <div className="kanban">
            {STATUS_COLS.map(col => {
              const colTasks = filtered.filter(t => t.status === col.id);
              return (
                <div key={col.id} className="kanban-col">
                  <div className="kanban-col-header">
                    <span className="kanban-col-title" style={{ color: col.color }}>{col.label}</span>
                    <span className="kanban-col-count">{colTasks.length}</span>
                  </div>
                  <div className="kanban-cards">
                    {colTasks.map(task => (
                      <TaskCard key={task.id} task={task} onClick={() => navigate(`/projects/${projectId}/tasks/${task.id}`)} />
                    ))}
                    {colTasks.length === 0 && (
                      <div style={{ color: 'var(--text-3)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Empty</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* List */}
        {tab === 'list' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {filtered.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">✦</div><h3>No tasks found</h3></div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Task</th><th>Status</th><th>Priority</th><th>Assignee</th><th>Due Date</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(task => {
                      const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';
                      return (
                        <tr key={task.id} style={{ cursor: 'pointer' }}>
                          <td onClick={() => navigate(`/projects/${projectId}/tasks/${task.id}`)}>
                            <div style={{ fontWeight: 500 }}>{task.title}</div>
                            {task.description && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{task.description.slice(0, 60)}{task.description.length > 60 ? '…' : ''}</div>}
                          </td>
                          <td>
                            <select
                              value={task.status}
                              onChange={e => handleStatusChange(task.id, e.target.value)}
                              onClick={e => e.stopPropagation()}
                              style={{ width: 'auto', padding: '4px 8px', fontSize: 12 }}
                            >
                              <option value="todo">To Do</option>
                              <option value="in_progress">In Progress</option>
                              <option value="review">Review</option>
                              <option value="done">Done</option>
                            </select>
                          </td>
                          <td><span className={`badge priority-${task.priority}`}>{task.priority}</span></td>
                          <td>
                            {task.assignee_name ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <img src={task.assignee_avatar} className="avatar avatar-sm" />
                                <span style={{ fontSize: 13 }}>{task.assignee_name}</span>
                              </div>
                            ) : <span style={{ color: 'var(--text-3)', fontSize: 13 }}>—</span>}
                          </td>
                          <td style={{ color: isOverdue ? 'var(--red)' : 'var(--text-2)', fontSize: 13 }}>
                            {task.due_date || '—'}{isOverdue ? ' ⚠' : ''}
                          </td>
                          <td onClick={e => e.stopPropagation()}>
                            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/projects/${projectId}/tasks/${task.id}`)}>View</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Members */}
        {tab === 'members' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Member</th><th>Email</th><th>Role</th><th>Joined</th>{isAdmin && <th>Actions</th>}</tr></thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <img src={m.avatar} className="avatar" alt={m.name} />
                          <span style={{ fontWeight: 500 }}>{m.name}</span>
                          {m.id === user.id && <span className="badge status-done" style={{ fontSize: 11 }}>You</span>}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-2)', fontSize: 13 }}>{m.email}</td>
                      <td>
                        {isAdmin && m.id !== user.id ? (
                          <select
                            value={m.role}
                            onChange={async e => {
                              try {
                                await api.put(`/projects/${projectId}/members/${m.id}`, { role: e.target.value });
                                setMembers(ms => ms.map(x => x.id === m.id ? { ...x, role: e.target.value } : x));
                                toast.success('Role updated');
                              } catch { toast.error('Failed to update role'); }
                            }}
                            style={{ width: 'auto', padding: '4px 8px', fontSize: 12 }}
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span className={`badge ${m.role === 'admin' ? 'status-in_progress' : 'status-todo'}`}>{m.role}</span>
                        )}
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--text-2)' }}>{formatDistanceToNow(new Date(m.joined_at), { addSuffix: true })}</td>
                      {isAdmin && (
                        <td>
                          {m.id !== user.id && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleRemoveMember(m.id)}>Remove</button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showCreateTask && (
        <TaskModal projectId={projectId} members={members} onClose={() => setShowCreateTask(false)}
          onSave={task => { setTasks(t => [task, ...t]); }} />
      )}
      {showAddMember && (
        <AddMemberModal projectId={projectId} onClose={() => setShowAddMember(false)}
          onAdd={m => setMembers(ms => [...ms, m])} />
      )}
    </div>
  );
}
