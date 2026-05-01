const router = require("express").Router({ mergeParams: true });
const { body, validationResult } = require("express-validator");
const { Project, Task } = require("../models/db");
const { authenticate, requireProjectRole } = require("../middleware/auth");

// helper: format task for API response
function formatTask(task) {
  const t = task.toObject ? task.toObject() : task;
  return {
    ...t,
    id: t._id,
    project_id: t.project,
    assignee_id: t.assignee,
    creator_id: t.creator,
    due_date: t.dueDate ? t.dueDate.toISOString().split("T")[0] : null,
    assignee_name: t.assignee?.name || null,
    assignee_avatar: t.assignee?.avatar || null,
    creator_name: t.creator?.name || null,
    comment_count: t.comments?.length || 0,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

// GET /api/projects/:projectId/tasks
router.get("/", authenticate, requireProjectRole(), async (req, res) => {
  try {
    const { status, priority, assignee } = req.query;
    const filter = { project: req.params.projectId };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignee) filter.assignee = assignee;

    const tasks = await Task.find(filter)
      .populate("assignee", "name avatar")
      .populate("creator", "name")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      tasks: tasks.map((t) => formatTask({ ...t, toObject: () => t })),
    });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/projects/:projectId/tasks
router.post(
  "/",
  authenticate,
  requireProjectRole(),
  [
    body("title").trim().notEmpty().withMessage("Title required"),
    body("description").optional().trim(),
    body("priority").optional().isIn(["low", "medium", "high", "urgent"]),
    body("assignee_id").optional().isString(),
    body("due_date").optional().isISO8601(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { projectId } = req.params;
    const {
      title,
      description,
      priority = "medium",
      assignee_id,
      due_date,
    } = req.body;

    try {
      // Validate assignee is a project member
      if (assignee_id) {
        const project = await Project.findById(projectId).lean();
        const isMember = project.members.some(
          (m) => m.user.toString() === assignee_id,
        );
        if (!isMember)
          return res
            .status(400)
            .json({ error: "Assignee is not a project member" });
      }

      const task = await Task.create({
        title,
        description: description || undefined,
        priority,
        project: projectId,
        assignee: assignee_id || null,
        creator: req.user.id,
        dueDate: due_date ? new Date(due_date) : null,
      });

      const populated = await Task.findById(task._id)
        .populate("assignee", "name avatar")
        .populate("creator", "name");

      res.status(201).json({ task: formatTask(populated) });
    } catch {
      res.status(500).json({ error: "Server error" });
    }
  },
);

// PUT /api/projects/:projectId/tasks/:taskId
router.put(
  "/:taskId",
  authenticate,
  requireProjectRole(),
  [
    body("title").optional().trim().notEmpty(),
    body("status").optional().isIn(["todo", "in_progress", "review", "done"]),
    body("priority").optional().isIn(["low", "medium", "high", "urgent"]),
    body("due_date").optional().isISO8601(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { projectId, taskId } = req.params;
    try {
      const task = await Task.findOne({ _id: taskId, project: projectId });
      if (!task) return res.status(404).json({ error: "Task not found" });

      // Members can only edit tasks they created or are assigned to
      if (
        req.memberRole === "member" &&
        task.creator.toString() !== req.user.id &&
        task.assignee?.toString() !== req.user.id
      ) {
        return res.status(403).json({ error: "Cannot edit this task" });
      }

      const { title, description, status, priority, assignee_id, due_date } =
        req.body;

      if (assignee_id) {
        const project = await Project.findById(projectId).lean();
        const isMember = project.members.some(
          (m) => m.user.toString() === assignee_id,
        );
        if (!isMember)
          return res
            .status(400)
            .json({ error: "Assignee is not a project member" });
      }

      if (title !== undefined) task.title = title;
      if (description !== undefined) task.description = description;
      if (status !== undefined) task.status = status;
      if (priority !== undefined) task.priority = priority;
      if (assignee_id !== undefined) task.assignee = assignee_id || null;
      if (due_date !== undefined)
        task.dueDate = due_date ? new Date(due_date) : null;

      await task.save();

      const populated = await Task.findById(task._id)
        .populate("assignee", "name avatar")
        .populate("creator", "name");

      res.json({ task: formatTask(populated) });
    } catch {
      res.status(500).json({ error: "Server error" });
    }
  },
);

// DELETE /api/projects/:projectId/tasks/:taskId
router.delete(
  "/:taskId",
  authenticate,
  requireProjectRole(),
  async (req, res) => {
    const { projectId, taskId } = req.params;
    try {
      const task = await Task.findOne({ _id: taskId, project: projectId });
      if (!task) return res.status(404).json({ error: "Task not found" });

      if (
        req.memberRole === "member" &&
        task.creator.toString() !== req.user.id
      ) {
        return res.status(403).json({ error: "Cannot delete this task" });
      }

      await task.deleteOne();
      res.json({ message: "Task deleted" });
    } catch {
      res.status(500).json({ error: "Server error" });
    }
  },
);

// GET /api/projects/:projectId/tasks/:taskId/comments
router.get(
  "/:taskId/comments",
  authenticate,
  requireProjectRole(),
  async (req, res) => {
    try {
      const task = await Task.findById(req.params.taskId)
        .populate("comments.user", "name avatar")
        .lean();
      if (!task) return res.status(404).json({ error: "Task not found" });

      const comments = task.comments.map((c) => ({
        ...c,
        id: c._id,
        task_id: task._id,
        user_id: c.user._id,
        name: c.user.name,
        avatar: c.user.avatar,
        created_at: c.createdAt,
      }));

      res.json({ comments });
    } catch {
      res.status(500).json({ error: "Server error" });
    }
  },
);

// POST /api/projects/:projectId/tasks/:taskId/comments
router.post(
  "/:taskId/comments",
  authenticate,
  requireProjectRole(),
  [body("content").trim().notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      const task = await Task.findById(req.params.taskId);
      if (!task) return res.status(404).json({ error: "Task not found" });

      task.comments.push({ user: req.user.id, content: req.body.content });
      await task.save();

      await task.populate("comments.user", "name avatar");
      const added = task.comments[task.comments.length - 1];

      res.status(201).json({
        comment: {
          id: added._id,
          task_id: task._id,
          user_id: req.user.id,
          content: added.content,
          name: added.user.name,
          avatar: added.user.avatar,
          created_at: added.createdAt,
        },
      });
    } catch {
      res.status(500).json({ error: "Server error" });
    }
  },
);

module.exports = router;
