import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import TaskModal from '../components/TaskModal';
import { formatDistanceToNow, isPast, isToday, parseISO } from 'date-fns';

const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };
const PRIORITY_COLORS = { low: 'var(--text-2)', medium: 'var(--blue)', high: 'var(--orange)', urgent: 'var(--red)' };

export default function TaskDetail() {
  const { projectId, taskId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [members, setMembers] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [memberRole, setMemberRole] = useState('member');
  const commentsEndRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get(`/projects/${projectId}/tasks`),
      api.get(`/projects/${projectId}/tasks/${taskId}/comments`),
      api.get(`/projects/${projectId}`),
    ]).then(([tasksRes, commentsRes, projectRes]) => {
      const found = tasksRes.data.tasks.find(t => t.id === taskId);
      if (!found) { navigate(`/projects/${projectId}`); return; }
      setTask(found);
      setComments(commentsRes.data.comments);
      setMembers(projectRes.data.members);
      const me = projectRes.data.members.find(m => m.id === user.id);
      setMemberRole(me?.role || 'member');
    }).finally(() => setLoading(false));
  }, [taskId]);

  const handleStatusChange = async (status) => {
    try {
      const { data } = await api.put(`/projects/${projectId}/tasks/${taskId}`, { status });
      setTask(data.task);
      toast.success('Status updated');
    } catch { toast.error('Failed'); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/projects/${projectId}/tasks/${taskId}`);
      toast.success('Task deleted');
      navigate(`/projects/${projectId}`);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/projects/${projectId}/tasks/${taskId}/comments`, { content: comment });
      setComments(c => [...c, data.comment]);
      setComment('');
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch { toast.error('Failed to post comment'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="loading-full"><div className="spinner" /> Loading task…</div>;
  if (!task) return null;

  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date)) && task.status !== 'done';
  const canEdit = memberRole === 'admin' || task.creator_id === user.id || task.assignee_id === user.id;

  return (
    <div>
      <div className="detail-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/projects/${projectId}`)}>← Back</button>
          <span className={`badge status-${task.status}`}>{STATUS_LABELS[task.status]}</span>
          <span className={`badge priority-${task.priority}`}>{task.priority}</span>
          {isOverdue && <span className="badge priority-urgent">Overdue</span>}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {canEdit && <button className="btn btn-ghost btn-sm" onClick={() => setShowEdit(true)}>Edit</button>}
          {(memberRole === 'admin' || task.creator_id === user.id) && (
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
          )}
        </div>
      </div>

      <div className="page" style={{ paddingTop: 28 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
          {/* Main */}
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, marginBottom: 12, lineHeight: 1.3 }}>{task.title}</h1>

            {task.description ? (
              <div style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: 24, fontSize: 14, lineHeight: 1.7, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                {task.description}
              </div>
            ) : (
              <div style={{ color: 'var(--text-3)', fontSize: 14, marginBottom: 24, fontStyle: 'italic' }}>No description provided.</div>
            )}

            {/* Status quick-change */}
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Change Status</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                {['todo', 'in_progress', 'review', 'done'].map(s => (
                  <button key={s}
                    className={`btn btn-sm ${task.status === s ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => handleStatusChange(s)}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* Comments */}
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
                Comments ({comments.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                {comments.length === 0 && (
                  <div style={{ color: 'var(--text-3)', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>No comments yet. Be the first!</div>
                )}
                {comments.map(c => (
                  <div key={c.id} className="comment">
                    <img src={c.avatar} alt={c.name} className="avatar" />
                    <div className="comment-body">
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 4 }}>
                        <span className="comment-author">{c.name}</span>
                        {c.user_id === user.id && <span style={{ fontSize: 11, background: 'var(--accent-glow)', color: 'var(--accent)', padding: '1px 6px', borderRadius: 8 }}>You</span>}
                        <span className="comment-time">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                      </div>
                      <div className="comment-text">{c.content}</div>
                    </div>
                  </div>
                ))}
                <div ref={commentsEndRef} />
              </div>

              <form onSubmit={handleComment} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <img src={user.avatar} alt={user.name} className="avatar" style={{ marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Write a comment…"
                    rows={2}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleComment(e); }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Ctrl+Enter to submit</span>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || !comment.trim()}>
                      {submitting ? 'Posting…' : 'Comment'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Assignee', content: task.assignee_name ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img src={task.assignee_avatar} className="avatar" />
                  <span style={{ fontSize: 14 }}>{task.assignee_name}</span>
                </div>
              ) : <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Unassigned</span> },
              { label: 'Created by', content: <span style={{ fontSize: 14 }}>{task.creator_name}</span> },
              { label: 'Priority', content: <span style={{ color: PRIORITY_COLORS[task.priority], fontWeight: 600, fontSize: 14, textTransform: 'capitalize' }}>{task.priority}</span> },
              { label: 'Due Date', content: task.due_date ? (
                <span style={{ fontSize: 14, color: isOverdue ? 'var(--red)' : 'var(--text)' }}>
                  {isOverdue ? '⚠ ' : ''}{task.due_date}
                </span>
              ) : <span style={{ fontSize: 13, color: 'var(--text-3)' }}>No due date</span> },
              { label: 'Created', content: <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}</span> },
              { label: 'Last updated', content: <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}</span> },
            ].map(row => (
              <div key={row.label} className="card" style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', marginBottom: 8 }}>{row.label}</div>
                {row.content}
              </div>
            ))}
          </div>
        </div>
      </div>

      {showEdit && (
        <TaskModal
          projectId={projectId}
          members={members}
          task={task}
          onClose={() => setShowEdit(false)}
          onSave={updated => setTask(updated)}
        />
      )}
    </div>
  );
}
