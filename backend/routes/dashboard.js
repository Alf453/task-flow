const router = require("express").Router();
const mongoose = require("mongoose");
const { Project, Task } = require("../models/db");
const { authenticate } = require("../middleware/auth");

// GET /api/dashboard
router.get("/", authenticate, async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user.id);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    // Projects the user is a member of
    const userProjects = await Project.find({ "members.user": userId })
      .select("_id name color")
      .lean();
    const projectIds = userProjects.map((p) => p._id);
    const projectMap = Object.fromEntries(
      userProjects.map((p) => [p._id.toString(), p]),
    );

    // My open tasks (assigned to me, not done), sorted by due date
    const myTasksDocs = await Task.find({
      project: { $in: projectIds },
      assignee: userId,
      status: { $ne: "done" },
    })
      .populate("assignee", "name avatar")
      .sort({ dueDate: 1, createdAt: -1 })
      .limit(20)
      .lean();

    const myTasks = myTasksDocs.map((t) => ({
      ...t,
      id: t._id,
      project_id: t.project,
      assignee_id: t.assignee?._id,
      assignee_name: t.assignee?.name,
      assignee_avatar: t.assignee?.avatar,
      due_date: t.dueDate ? t.dueDate.toISOString().split("T")[0] : null,
      project_name: projectMap[t.project.toString()]?.name,
      project_color: projectMap[t.project.toString()]?.color,
    }));

    // Overdue tasks (any task in my projects, not done, past due)
    const overdueTasksDocs = await Task.find({
      project: { $in: projectIds },
      dueDate: { $lt: today },
      status: { $ne: "done" },
    })
      .sort({ dueDate: 1 })
      .lean();

    const overdueTasks = overdueTasksDocs.map((t) => ({
      ...t,
      id: t._id,
      project_id: t.project,
      due_date: t.dueDate ? t.dueDate.toISOString().split("T")[0] : null,
      project_name: projectMap[t.project.toString()]?.name,
      project_color: projectMap[t.project.toString()]?.color,
    }));

    // Stats
    const [totalTasks, myTasksTotal, completedTasks, overdueCount] =
      await Promise.all([
        Task.countDocuments({ project: { $in: projectIds } }),
        Task.countDocuments({ project: { $in: projectIds }, assignee: userId }),
        Task.countDocuments({
          project: { $in: projectIds },
          assignee: userId,
          status: "done",
        }),
        Task.countDocuments({
          project: { $in: projectIds },
          dueDate: { $lt: today },
          status: { $ne: "done" },
        }),
      ]);

    const stats = {
      total_projects: projectIds.length,
      total_tasks: totalTasks,
      my_tasks: myTasksTotal,
      completed_tasks: completedTasks,
      overdue_count: overdueCount,
    };

    // Status breakdown (my assigned tasks)
    const breakdown = await Task.aggregate([
      { $match: { project: { $in: projectIds }, assignee: userId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const statusBreakdown = breakdown.map((b) => ({
      status: b._id,
      count: b.count,
    }));

    // Recent activity (last updated tasks in my projects)
    const recentDocs = await Task.find({ project: { $in: projectIds } })
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean();

    const recentActivity = recentDocs.map((t) => ({
      id: t._id,
      title: t.title,
      status: t.status,
      project_id: t.project,
      updated_at: t.updatedAt,
      project_name: projectMap[t.project.toString()]?.name,
      project_color: projectMap[t.project.toString()]?.color,
    }));

    res.json({ myTasks, overdueTasks, stats, statusBreakdown, recentActivity });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
