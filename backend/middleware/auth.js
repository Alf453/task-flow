const jwt = require("jsonwebtoken");
const { User, Project } = require("../models/db");

const JWT_SECRET =
  process.env.JWT_SECRET || "taskflow-super-secret-key-change-in-production";

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    const user = await User.findById(payload.id).select("-password").lean();
    if (!user) return res.status(401).json({ error: "User not found" });
    req.user = { ...user, id: user._id.toString() };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function requireProjectRole(...roles) {
  return async (req, res, next) => {
    try {
      const { projectId } = req.params;
      const project = await Project.findById(projectId).lean();
      if (!project) return res.status(404).json({ error: "Project not found" });

      const member = project.members.find(
        (m) => m.user.toString() === req.user.id,
      );
      if (!member)
        return res.status(403).json({ error: "Not a project member" });
      if (roles.length && !roles.includes(member.role)) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }
      req.memberRole = member.role;
      next();
    } catch {
      return res.status(500).json({ error: "Server error" });
    }
  };
}

module.exports = { authenticate, requireProjectRole, JWT_SECRET };
