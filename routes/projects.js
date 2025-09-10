const express = require("express");
const router = express.Router();
const { getProjects, createProject, getProjectImage } = require("../controllers/projects");

router.get("/projects", getProjects);
router.post("/projects", createProject);
router.get("/projects/:projectId/images/:imageIndex", getProjectImage);

module.exports = router;
