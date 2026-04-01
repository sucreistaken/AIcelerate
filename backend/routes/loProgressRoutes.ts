import { Router } from "express";
import { computeLOProgress } from "../services/loProgressService";
import { notFound } from "../middleware/errorHandler";

const router = Router();

// Get LO progress dashboard for a course
router.get("/courses/:id/lo-progress", (req, res) => {
  const data = computeLOProgress(req.params.id);
  if (!data) throw notFound("Course not found");
  res.json({ ok: true, ...data });
});

// Get single LO detail
router.get("/courses/:id/lo-progress/:loId", (req, res) => {
  const data = computeLOProgress(req.params.id);
  if (!data) throw notFound("Course not found");

  const lo = data.loProgress.find(l => l.loId === req.params.loId);
  if (!lo) throw notFound("Learning Outcome not found");

  res.json({ ok: true, ...lo, courseName: data.courseName });
});

// Force recompute (same as GET but explicit)
router.post("/courses/:id/lo-progress/refresh", (req, res) => {
  const data = computeLOProgress(req.params.id);
  if (!data) throw notFound("Course not found");
  res.json({ ok: true, ...data });
});

export default router;
