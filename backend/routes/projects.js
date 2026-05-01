const router = require("express").Router();
const { body, validationResult } = require("express-validator");
const { User, Project, Task } = require("../models/db");
const { authenticate, requireProjectRole } = require("../middleware/auth");

// helper: enrich project with counts for list view
async function withCounts(project, userId) {
  const pid = project._id;
  const [task_count, done_count] = await Promise.all([
    Task.countDocuments({ project: pid }),
    Task.countDocuments({ project: pid, status: "done" }),
  ]);
  const member = project.members.find(
    (m) => m.user.toString() === userId.toString(),
  );
  return {
    ...project,
    id: project._id,
    role: member?.role || "member",
    task_count,
    done_count,
    member_count: project.members.length,
  };
}

// GET /api/projects
router.get("/", authenticate, async (req, res) => {
  try {
    const projects = await Project.find({ "members.user": req.user.id })
      .populate("owner", "name")
      .sort({ createdAt: -1 })
      .lean();

    const enriched = await Promise.all(
      projects.map((p) => withCounts(p, req.user.id)),
    );
    res.json({ projects: enriched });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/projects
router.post(
  "/",
  authenticate,
  [
    body("name").trim().notEmpty().withMessage("Project name required"),
    body("description").optional().trim(),
    body("color")
      .optional()
      .matches(/^#[0-9A-Fa-f]{6}$/),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { name, description, color } = req.body;
    try {
      const project = await Project.create({
        name,
        description: description || undefined,
        color: color || "#6366f1",
        owner: req.user.id,
        members: [{ user: req.user.id, role: "admin" }],
      });

      res.status(201).json({
        project: {
          ...project.toObject(),
          id: project._id,
          role: "admin",
          task_count: 0,
          done_count: 0,
          member_count: 1,
        },
      });
    } catch {
      res.status(500).json({ error: "Server error" });
    }
  },
);

// GET /api/projects/:projectId
router.get(
  "/:projectId",
  authenticate,
  requireProjectRole(),
  async (req, res) => {
    try {
      const project = await Project.findById(req.params.projectId).lean();

      // Populate member user details
      const memberIds = project.members.map((m) => m.user);
      const users = await User.find({ _id: { $in: memberIds } })
        .select("name email avatar")
        .lean();
      const usersMap = Object.fromEntries(
        users.map((u) => [u._id.toString(), u]),
      );

      const members = project.members.map((m) => ({
        ...usersMap[m.user.toString()],
        id: m.user,
        role: m.role,
        joined_at: m.joinedAt,
      }));

      res.json({
        project: { ...project, id: project._id, role: req.memberRole },
        members,
      });
    } catch {
      res.status(500).json({ error: "Server error" });
    }
  },
);

// PUT /api/projects/:projectId
router.put(
  "/:projectId",
  authenticate,
  requireProjectRole("admin"),
  [
    body("name").optional().trim().notEmpty(),
    body("description").optional().trim(),
    body("color")
      .optional()
      .matches(/^#[0-9A-Fa-f]{6}$/),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { name, description, color } = req.body;
    try {
      const update = {};
      if (name) update.name = name;
      if (description !== undefined) update.description = description;
      if (color) update.color = color;

      const project = await Project.findByIdAndUpdate(
        req.params.projectId,
        update,
        { new: true },
      ).lean();
      res.json({ project: { ...project, id: project._id } });
    } catch {
      res.status(500).json({ error: "Server error" });
    }
  },
);

// DELETE /api/projects/:projectId
router.delete(
  "/:projectId",
  authenticate,
  requireProjectRole("admin"),
  async (req, res) => {
    try {
      await Promise.all([
        Project.findByIdAndDelete(req.params.projectId),
        Task.deleteMany({ project: req.params.projectId }),
      ]);
      res.json({ message: "Project deleted" });
    } catch {
      res.status(500).json({ error: "Server error" });
    }
  },
);

// POST /api/projects/:projectId/members
router.post(
  "/:projectId/members",
  authenticate,
  requireProjectRole("admin"),
  [
    body("email").isEmail().normalizeEmail(),
    body("role").optional().isIn(["admin", "member"]),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { email, role = "member" } = req.body;
    try {
      const user = await User.findOne({ email })
        .select("name email avatar")
        .lean();
      if (!user)
        return res
          .status(404)
          .json({ error: "User not found. They must sign up first." });

      const project = await Project.findById(req.params.projectId);
      const alreadyMember = project.members.some(
        (m) => m.user.toString() === user._id.toString(),
      );
      if (alreadyMember)
        return res.status(409).json({ error: "User already a member" });

      project.members.push({ user: user._id, role });
      await project.save();

      res.status(201).json({ member: { ...user, id: user._id, role } });
    } catch {
      res.status(500).json({ error: "Server error" });
    }
  },
);

// PUT /api/projects/:projectId/members/:userId
router.put(
  "/:projectId/members/:userId",
  authenticate,
  requireProjectRole("admin"),
  [body("role").isIn(["admin", "member"])],
  async (req, res) => {
    try {
      const project = await Project.findById(req.params.projectId);
      const member = project.members.find(
        (m) => m.user.toString() === req.params.userId,
      );
      if (!member) return res.status(404).json({ error: "Member not found" });
      member.role = req.body.role;
      await project.save();
      res.json({ message: "Role updated" });
    } catch {
      res.status(500).json({ error: "Server error" });
    }
  },
);

// DELETE /api/projects/:projectId/members/:userId
router.delete(
  "/:projectId/members/:userId",
  authenticate,
  requireProjectRole("admin"),
  async (req, res) => {
    const { userId } = req.params;
    if (userId === req.user.id)
      return res.status(400).json({ error: "Cannot remove yourself" });
    try {
      await Project.findByIdAndUpdate(req.params.projectId, {
        $pull: { members: { user: userId } },
      });
      res.json({ message: "Member removed" });
    } catch {
      res.status(500).json({ error: "Server error" });
    }
  },
);

module.exports = router;
