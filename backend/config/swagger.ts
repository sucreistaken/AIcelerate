import swaggerJsdoc from "swagger-jsdoc";

/* ──────────────────────────── Shared Schemas ──────────────────────────── */

const ErrorSchema = {
  type: "object",
  properties: {
    ok: { type: "boolean", example: false },
    error: { type: "string" },
    code: { type: "string", example: "NOT_FOUND" },
    requestId: { type: "string" },
  },
};

const OkSchema = {
  type: "object",
  properties: { ok: { type: "boolean", example: true } },
};

const PaginatedQuery = [
  { name: "page", in: "query", schema: { type: "integer", default: 1 } },
  { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
  { name: "search", in: "query", schema: { type: "string" } },
];

const CursorQuery = [
  { name: "cursor", in: "query", schema: { type: "string" }, description: "Cursor ID for pagination" },
  { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
];

/* ──────────────────────────── Helper builders ─────────────────────────── */

const ok200 = (desc: string, props?: Record<string, unknown>) => ({
  "200": {
    description: desc,
    content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, ...props } } } },
  },
});

const err = (codes: number[]) => {
  const r: Record<string, unknown> = {};
  if (codes.includes(400)) r["400"] = { description: "Bad request", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } };
  if (codes.includes(401)) r["401"] = { description: "Unauthorized" };
  if (codes.includes(404)) r["404"] = { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } };
  if (codes.includes(403)) r["403"] = { description: "Forbidden" };
  if (codes.includes(409)) r["409"] = { description: "Conflict" };
  if (codes.includes(429)) r["429"] = { description: "Rate limited" };
  if (codes.includes(503)) r["503"] = { description: "Service unavailable" };
  return r;
};

const pathParam = (name: string, desc: string) => ({ name, in: "path" as const, required: true, schema: { type: "string" }, description: desc });

const jsonBody = (props: Record<string, unknown>, required?: string[]) => ({
  required: true,
  content: { "application/json": { schema: { type: "object", properties: props, ...(required ? { required } : {}) } } },
});

/* ──────────────────────────── Path Definitions ────────────────────────── */

const paths: Record<string, unknown> = {

  // ═══════════════════════════ HEALTH (2) ═══════════════════════════════
  "/health": {
    get: {
      tags: ["Health"], summary: "Health check", description: "Returns MongoDB connection status.", security: [],
      responses: { ...ok200("Service healthy", { ok: { type: "boolean" } }), ...err([503]) },
    },
  },
  "/health/ai-metrics": {
    get: {
      tags: ["Health"], summary: "AI service metrics", description: "Token usage, latency and cost metrics for AI calls.",
      responses: { ...ok200("AI metrics", { data: { type: "object" } }), ...err([401]) },
    },
  },

  // ═══════════════════════════ AUTH (8) ═══════════════════════════════
  "/api/auth/register": {
    post: {
      tags: ["Auth"], summary: "Register a new user", security: [],
      description: "Rate limited: 5 req/min.",
      requestBody: jsonBody(
        { email: { type: "string", format: "email" }, password: { type: "string", minLength: 8 }, name: { type: "string" } },
        ["email", "password"],
      ),
      responses: { ...ok200("User registered", { token: { type: "string" }, refreshToken: { type: "string" }, user: { type: "object" } }), ...err([400, 409, 429]) },
    },
  },
  "/api/auth/login": {
    post: {
      tags: ["Auth"], summary: "Login with email & password", security: [],
      description: "Rate limited: 10 req/min. Returns JWT access + refresh tokens.",
      requestBody: jsonBody(
        { email: { type: "string", format: "email" }, password: { type: "string" } },
        ["email", "password"],
      ),
      responses: { ...ok200("Login successful", { token: { type: "string" }, refreshToken: { type: "string" }, user: { type: "object" } }), ...err([400, 401, 429]) },
    },
  },
  "/api/auth/refresh": {
    post: {
      tags: ["Auth"], summary: "Refresh access token", security: [],
      description: "Rate limited: 20 req/min. Send refresh token via cookie or body.",
      responses: { ...ok200("Token refreshed", { token: { type: "string" } }), ...err([401, 429]) },
    },
  },
  "/api/auth/logout": {
    post: {
      tags: ["Auth"], summary: "Logout (clear refresh token)", security: [],
      responses: { ...ok200("Logged out") },
    },
  },
  "/api/auth/logout-all": {
    post: {
      tags: ["Auth"], summary: "Logout from all devices",
      description: "Invalidates all refresh tokens for the current user.",
      responses: { ...ok200("All sessions terminated"), ...err([401]) },
    },
  },
  "/api/auth/me": {
    get: {
      tags: ["Auth"], summary: "Get current user profile",
      responses: { ...ok200("Current user", { user: { type: "object" } }), ...err([401]) },
    },
  },
  "/api/auth/change-password": {
    post: {
      tags: ["Auth"], summary: "Change password",
      requestBody: jsonBody(
        { currentPassword: { type: "string" }, newPassword: { type: "string", minLength: 8 } },
        ["currentPassword", "newPassword"],
      ),
      responses: { ...ok200("Password changed"), ...err([400, 401]) },
    },
  },
  "/api/auth/delete-account": {
    post: {
      tags: ["Auth"], summary: "Delete own account",
      description: "Permanently deletes the user account and all associated data.",
      requestBody: jsonBody({ password: { type: "string" } }, ["password"]),
      responses: { ...ok200("Account deleted"), ...err([400, 401]) },
    },
  },

  // ═══════════════════════════ DASHBOARD (1) ════════════════════════════
  "/api/dashboard/init": {
    get: {
      tags: ["Dashboard"], summary: "Dashboard batch init",
      description: "Replaces 7 separate calls with 1. All data from in-memory cache. ?lite=true strips transcript/slideText.",
      parameters: [
        { name: "lite", in: "query", schema: { type: "boolean" }, description: "Strip heavy text fields" },
        { name: "courseId", in: "query", schema: { type: "string" }, description: "Filter scheduler data by course" },
        ...CursorQuery,
      ],
      responses: {
        ...ok200("Dashboard data", {
          lessons: { type: "array", items: { type: "object" } },
          courses: { type: "array", items: { type: "object" } },
          unreadCount: { type: "integer" },
          scheduler: { type: "object" },
          flashcardStats: { type: "object" },
          _perf: { type: "object", properties: { ms: { type: "number" } } },
        }),
        ...err([401]),
      },
    },
  },

  // ═══════════════════════════ LESSONS (7) ══════════════════════════════
  "/api/lessons": {
    get: {
      tags: ["Lessons"], summary: "List lessons",
      description: "Supports cursor-based pagination. Without pagination params returns all (legacy).",
      parameters: [...CursorQuery],
      responses: { ...ok200("Lesson list", { items: { type: "array" }, nextCursor: { type: "string" }, hasMore: { type: "boolean" } }), ...err([401]) },
    },
    post: {
      tags: ["Lessons"], summary: "Create or update a lesson",
      requestBody: jsonBody({
        id: { type: "string", description: "Omit for new lesson" },
        title: { type: "string" },
        transcript: { type: "string" },
        slideText: { type: "string" },
        courseCode: { type: "string" },
      }),
      responses: { ...ok200("Lesson upserted", { id: { type: "string" } }), ...err([400, 401]) },
    },
  },
  "/api/lessons/{id}": {
    get: {
      tags: ["Lessons"], summary: "Get a lesson by ID",
      parameters: [pathParam("id", "Lesson ID")],
      responses: { ...ok200("Lesson detail"), ...err([401, 404]) },
    },
    delete: {
      tags: ["Lessons"], summary: "Delete a lesson",
      description: "Also removes the lesson from its course and rebuilds the knowledge index.",
      parameters: [pathParam("id", "Lesson ID")],
      responses: { ...ok200("Lesson deleted", { deleted: { type: "string" } }), ...err([401, 404]) },
    },
  },
  "/api/lessons/{id}/progress": {
    patch: {
      tags: ["Lessons"], summary: "Update lesson progress",
      parameters: [pathParam("id", "Lesson ID")],
      requestBody: jsonBody({ currentModule: { type: "integer" }, completedModules: { type: "array", items: { type: "integer" } } }),
      responses: { ...ok200("Progress updated"), ...err([400, 401, 404]) },
    },
  },
  "/api/lessons/{id}/modules": {
    get: {
      tags: ["Lessons"], summary: "List lesson modules",
      description: "Returns plan modules with an extra 'all modules' option at index 0.",
      parameters: [pathParam("id", "Lesson ID")],
      responses: { ...ok200("Module list", { lessonTitle: { type: "string" }, modules: { type: "array" } }), ...err([401, 404]) },
    },
  },
  "/api/memory": {
    get: {
      tags: ["Lessons"], summary: "Get memory usage stats",
      responses: { ...ok200("Memory stats"), ...err([401]) },
    },
  },

  // ═══════════════════════════ LESSON AI (11) ═══════════════════════════
  "/api/lessons/{id}/cheat-sheet": {
    post: {
      tags: ["Lesson AI"], summary: "Generate cheat sheet",
      description: "AI-generated cheat sheet for a lesson. Cached; use ?force=true to regenerate.",
      parameters: [pathParam("id", "Lesson ID"), { name: "force", in: "query", schema: { type: "boolean" } }],
      requestBody: jsonBody({ language: { type: "string", enum: ["tr", "en"], default: "tr" }, courseWide: { type: "boolean", default: false } }),
      responses: { ...ok200("Cheat sheet", { cheatSheet: { type: "object" }, cached: { type: "boolean" } }), ...err([400, 401, 404]) },
    },
  },
  "/api/lessons/{id}/lo-modules": {
    post: {
      tags: ["Lesson AI"], summary: "Generate LO-based modules",
      description: "AI-generated learning-outcome-aligned modules. Cached; use ?force=true to regenerate.",
      parameters: [pathParam("id", "Lesson ID"), { name: "force", in: "query", schema: { type: "boolean" } }],
      responses: { ...ok200("LO modules", { modules: { type: "array" }, cached: { type: "boolean" } }), ...err([401, 404]) },
    },
  },
  "/api/lessons/{id}/lo-align": {
    post: {
      tags: ["Lesson AI"], summary: "Align lecture content with learning outcomes",
      parameters: [pathParam("id", "Lesson ID"), { name: "force", in: "query", schema: { type: "boolean" } }],
      requestBody: jsonBody({
        transcript: { type: "string" },
        slidesText: { type: "string" },
        learningOutcomes: { type: "array", items: { type: "string" } },
      }),
      responses: { ...ok200("LO alignment", { loAlignment: { type: "object" } }), ...err([400, 401, 404]) },
    },
  },
  "/api/plan-from-text/stream": {
    post: {
      tags: ["Lesson AI"], summary: "Generate lesson plan (SSE streaming)",
      description: "Streams plan generation progress via Server-Sent Events. Final event contains { type: 'done', plan, lessonId }.",
      requestBody: jsonBody({
        lectureText: { type: "string" },
        slidesText: { type: "string" },
        title: { type: "string" },
        lessonId: { type: "string" },
        courseCode: { type: "string" },
        learningOutcomes: { type: "array", items: { type: "string" } },
      }),
      responses: {
        "200": { description: "SSE stream", content: { "text/event-stream": { schema: { type: "string" } } } },
        ...err([400, 401]),
      },
    },
  },
  "/api/plan-from-text": {
    post: {
      tags: ["Lesson AI"], summary: "Generate lesson plan (sync)",
      description: "Full lesson plan from transcript/slides. Set alignOnly=true to only regenerate alignment.",
      requestBody: jsonBody({
        lectureText: { type: "string" },
        slidesText: { type: "string" },
        title: { type: "string" },
        lessonId: { type: "string" },
        courseCode: { type: "string" },
        learningOutcomes: { type: "array", items: { type: "string" } },
        alignOnly: { type: "boolean" },
        prevPlan: { type: "object", description: "Required when alignOnly=true" },
      }),
      responses: { ...ok200("Plan generated", { plan: { type: "object" }, lessonId: { type: "string" } }), ...err([400, 401]) },
    },
  },
  "/api/lessons/{id}/deviation": {
    post: {
      tags: ["Lesson AI"], summary: "Analyze deviation between slides and lecture",
      parameters: [pathParam("id", "Lesson ID"), { name: "force", in: "query", schema: { type: "boolean" } }],
      responses: { ...ok200("Deviation analysis", { deviation: { type: "object" }, cached: { type: "boolean" } }), ...err([401, 404]) },
    },
  },
  "/api/ieu/learning-outcomes": {
    get: {
      tags: ["Lesson AI"], summary: "Fetch IEU learning outcomes",
      description: "Scrapes Izmir University of Economics course page for learning outcomes.",
      parameters: [{ name: "code", in: "query", required: true, schema: { type: "string" }, description: "Course code (e.g., CE316)" }],
      responses: { ...ok200("Learning outcomes", { learningOutcomes: { type: "array", items: { type: "string" } }, url: { type: "string" } }), ...err([401]) },
    },
  },
  "/api/lessons/{id}/chat": {
    post: {
      tags: ["Lesson AI"], summary: "Deep Dive chat with lesson context",
      description: "AI chat grounded in lesson content. Supports ?stream=true for SSE.",
      parameters: [pathParam("id", "Lesson ID"), { name: "stream", in: "query", schema: { type: "boolean" } }],
      requestBody: jsonBody(
        { message: { type: "string" }, history: { type: "array", items: { type: "object", properties: { role: { type: "string" }, content: { type: "string" } } } } },
        ["message"],
      ),
      responses: { ...ok200("Chat response", { text: { type: "string" }, suggestions: { type: "array", items: { type: "string" } } }), ...err([400, 401, 404]) },
    },
  },
  "/api/lessons/{id}/mindmap": {
    post: {
      tags: ["Lesson AI"], summary: "Generate full lesson mindmap",
      description: "Mermaid mindmap code for the entire lesson. Cached; use ?force=true to regenerate.",
      parameters: [pathParam("id", "Lesson ID"), { name: "force", in: "query", schema: { type: "boolean" } }],
      responses: { ...ok200("Mindmap", { code: { type: "string" }, cached: { type: "boolean" } }), ...err([401, 404]) },
    },
  },
  "/api/lessons/{id}/mindmap/module": {
    post: {
      tags: ["Lesson AI"], summary: "Generate mindmap for a specific module",
      parameters: [pathParam("id", "Lesson ID"), { name: "force", in: "query", schema: { type: "boolean" } }],
      requestBody: jsonBody({ moduleIndex: { type: "integer", description: "-1 for all modules overview" } }),
      responses: { ...ok200("Module mindmap", { code: { type: "string" }, moduleTitle: { type: "string" }, cached: { type: "boolean" } }), ...err([400, 401, 404]) },
    },
  },
  "/api/lessons/{id}/mindmap/node-detail": {
    post: {
      tags: ["Lesson AI"], summary: "Get detailed info for a mindmap node",
      parameters: [pathParam("id", "Lesson ID")],
      requestBody: jsonBody(
        { nodeName: { type: "string" }, action: { type: "string", enum: ["explain", "quiz", "examples"] } },
        ["nodeName", "action"],
      ),
      responses: { ...ok200("Node detail"), ...err([400, 401, 404]) },
    },
  },

  // ═══════════════════════════ LESSON QUIZ (4) ══════════════════════════
  "/api/quiz-from-plan": {
    post: {
      tags: ["Quiz"], summary: "Generate quiz from lesson plan",
      requestBody: jsonBody({ plan: { type: "object" }, lessonId: { type: "string" } }, ["plan"]),
      responses: { ...ok200("Quiz questions", { questions: { type: "array" } }), ...err([400, 401]) },
    },
  },
  "/api/quiz-answers": {
    post: {
      tags: ["Quiz"], summary: "Generate AI answers for quiz questions",
      requestBody: jsonBody({
        questions: { type: "array" },
        lectureText: { type: "string" },
        slidesText: { type: "string" },
        plan: { type: "object" },
        lessonId: { type: "string" },
      }, ["questions"]),
      responses: { ...ok200("Quiz answers", { answers: { type: "array" } }), ...err([400, 401]) },
    },
  },
  "/api/quiz-eval": {
    post: {
      tags: ["Quiz"], summary: "Evaluate a single quiz answer",
      requestBody: jsonBody({
        q: { type: "string" },
        student_answer: { type: "string" },
        lectureText: { type: "string" },
        slidesText: { type: "string" },
        lessonId: { type: "string" },
      }, ["q", "student_answer"]),
      responses: { ...ok200("Evaluation result", { grade: { type: "string", enum: ["correct", "partial", "incorrect"] }, feedback: { type: "string" } }), ...err([400, 401]) },
    },
  },
  "/api/quiz-eval-batch": {
    post: {
      tags: ["Quiz"], summary: "Evaluate multiple quiz answers in batch",
      requestBody: jsonBody({
        items: { type: "array", items: { type: "object", properties: { q: { type: "string" }, student_answer: { type: "string" } } } },
        lectureText: { type: "string" },
        slidesText: { type: "string" },
        lessonId: { type: "string" },
      }, ["items"]),
      responses: { ...ok200("Batch results", { results: { type: "array" } }), ...err([400, 401]) },
    },
  },

  // ═══════════════════════════ QUIZ PACKS (3) ═══════════════════════════
  "/api/quiz/generate": {
    post: {
      tags: ["Quiz"], summary: "Generate quiz from professor emphases",
      requestBody: jsonBody({
        count: { type: "integer", default: 5 },
        lessonIds: { type: "array", items: { type: "string" } },
        lessonId: { type: "string", description: "Attach pack to this lesson" },
      }),
      responses: { ...ok200("Quiz pack"), ...err([400, 401]) },
    },
  },
  "/api/quiz/{packId}": {
    get: {
      tags: ["Quiz"], summary: "Get a quiz pack by ID",
      parameters: [pathParam("packId", "Quiz pack ID")],
      responses: { ...ok200("Quiz pack"), ...err([401, 404]) },
    },
  },
  "/api/quiz/{packId}/submit": {
    post: {
      tags: ["Quiz"], summary: "Submit quiz answers for scoring",
      parameters: [pathParam("packId", "Quiz pack ID")],
      requestBody: jsonBody({
        answers: { type: "array", items: { type: "object", properties: { id: { type: "string" }, answer: {} } } },
        lessonId: { type: "string" },
      }, ["answers"]),
      responses: { ...ok200("Score result", { score: { type: "number" }, total: { type: "integer" } }), ...err([401, 404]) },
    },
  },

  // ═══════════════════════════ COURSES (14) ═════════════════════════════
  "/api/courses": {
    get: {
      tags: ["Courses"], summary: "List all courses for current user",
      responses: { ...ok200("Course list", { courses: { type: "array" } }), ...err([401]) },
    },
    post: {
      tags: ["Courses"], summary: "Create a new course",
      requestBody: jsonBody({
        name: { type: "string" },
        code: { type: "string" },
        color: { type: "string" },
        settings: { type: "object", properties: { language: { type: "string" } } },
      }, ["name"]),
      responses: { ...ok200("Course created", { course: { type: "object" } }), ...err([400, 401]) },
    },
  },
  "/api/courses/{id}": {
    get: {
      tags: ["Courses"], summary: "Get a course by ID",
      parameters: [pathParam("id", "Course ID")],
      responses: { ...ok200("Course detail", { course: { type: "object" } }), ...err([401, 404]) },
    },
    patch: {
      tags: ["Courses"], summary: "Update a course",
      parameters: [pathParam("id", "Course ID")],
      requestBody: jsonBody({ name: { type: "string" }, code: { type: "string" }, color: { type: "string" }, settings: { type: "object" } }),
      responses: { ...ok200("Course updated", { course: { type: "object" } }), ...err([400, 401, 404]) },
    },
    delete: {
      tags: ["Courses"], summary: "Delete a course",
      parameters: [pathParam("id", "Course ID")],
      responses: { ...ok200("Course deleted"), ...err([401, 404]) },
    },
  },
  "/api/courses/{id}/lessons/{lessonId}": {
    post: {
      tags: ["Courses"], summary: "Add a lesson to a course",
      parameters: [pathParam("id", "Course ID"), pathParam("lessonId", "Lesson ID")],
      responses: { ...ok200("Lesson added", { course: { type: "object" } }), ...err([401, 404]) },
    },
    delete: {
      tags: ["Courses"], summary: "Remove a lesson from a course",
      parameters: [pathParam("id", "Course ID"), pathParam("lessonId", "Lesson ID")],
      responses: { ...ok200("Lesson removed", { course: { type: "object" } }), ...err([401, 404]) },
    },
  },
  "/api/courses/{id}/lessons": {
    get: {
      tags: ["Courses"], summary: "List lessons in a course",
      parameters: [pathParam("id", "Course ID")],
      responses: { ...ok200("Course lessons", { lessons: { type: "array" } }), ...err([401, 404]) },
    },
  },
  "/api/courses/{id}/rebuild-index": {
    post: {
      tags: ["Courses"], summary: "Rebuild course knowledge index",
      parameters: [pathParam("id", "Course ID")],
      responses: { ...ok200("Index rebuilt", { knowledgeIndex: { type: "object" } }), ...err([401, 404]) },
    },
  },
  "/api/courses/{id}/knowledge-index": {
    get: {
      tags: ["Courses"], summary: "Get course knowledge index",
      parameters: [pathParam("id", "Course ID")],
      responses: { ...ok200("Knowledge index", { knowledgeIndex: { type: "object" } }), ...err([401, 404]) },
    },
  },
  "/api/courses/{id}/chat": {
    post: {
      tags: ["Courses"], summary: "Chat with course AI assistant",
      description: "AI chat with full course context across all lessons.",
      parameters: [pathParam("id", "Course ID")],
      requestBody: jsonBody(
        { message: { type: "string" }, history: { type: "array", items: { type: "object" } } },
        ["message"],
      ),
      responses: { ...ok200("Chat response", { text: { type: "string" }, suggestions: { type: "array" } }), ...err([400, 401, 404]) },
    },
  },
  "/api/courses/{id}/progress": {
    get: {
      tags: ["Courses"], summary: "Get course progress overview",
      parameters: [pathParam("id", "Course ID")],
      responses: { ...ok200("Progress data", { progress: { type: "object" } }), ...err([401, 404]) },
    },
  },
  "/api/courses/{id}/study-schedule": {
    post: {
      tags: ["Courses"], summary: "Generate AI study schedule",
      description: "AI-generated study schedule based on course content and exam date.",
      parameters: [pathParam("id", "Course ID")],
      requestBody: jsonBody({ examDate: { type: "string", format: "date" } }, ["examDate"]),
      responses: { ...ok200("Study schedule", { schedule: { type: "object" } }), ...err([400, 401, 404]) },
    },
  },
  "/api/courses/{id}/export": {
    get: {
      tags: ["Courses"], summary: "Export full course data",
      parameters: [pathParam("id", "Course ID")],
      responses: { ...ok200("Course export", { export: { type: "object" } }), ...err([401, 404]) },
    },
  },

  // ═══════════════════════════ FLASHCARDS (8) ═══════════════════════════
  "/api/flashcards/generate/{lessonId}": {
    post: {
      tags: ["Flashcards"], summary: "Auto-generate flashcards from a lesson",
      parameters: [pathParam("lessonId", "Lesson ID")],
      responses: { ...ok200("Generated", { generated: { type: "integer" }, cards: { type: "array" } }), ...err([401, 404]) },
    },
  },
  "/api/flashcards/due": {
    get: {
      tags: ["Flashcards"], summary: "Get due flashcards (SM-2)",
      description: "Returns cards due for review based on the SM-2 spaced repetition algorithm.",
      responses: { ...ok200("Due cards", { cards: { type: "array" } }), ...err([401]) },
    },
  },
  "/api/flashcards/{cardId}/review": {
    post: {
      tags: ["Flashcards"], summary: "Review a flashcard (SM-2)",
      description: "Submit a quality rating (0-5) for SM-2 interval calculation.",
      parameters: [pathParam("cardId", "Flashcard ID")],
      requestBody: jsonBody({ quality: { type: "integer", minimum: 0, maximum: 5 } }, ["quality"]),
      responses: { ...ok200("Review result", { nextReview: { type: "string", format: "date-time" }, interval: { type: "number" }, easeFactor: { type: "number" } }), ...err([400, 401, 404]) },
    },
  },
  "/api/flashcards/stats": {
    get: {
      tags: ["Flashcards"], summary: "Get flashcard statistics",
      responses: { ...ok200("Stats", { total: { type: "integer" }, due: { type: "integer" }, mastered: { type: "integer" } }), ...err([401]) },
    },
  },
  "/api/flashcards": {
    get: {
      tags: ["Flashcards"], summary: "List flashcards",
      description: "Supports cursor-based pagination and filtering by lessonId.",
      parameters: [
        { name: "lessonId", in: "query", schema: { type: "string" }, description: "Filter by lesson" },
        ...CursorQuery,
      ],
      responses: { ...ok200("Flashcard list", { cards: { type: "array" }, nextCursor: { type: "string" }, hasMore: { type: "boolean" } }), ...err([401]) },
    },
    post: {
      tags: ["Flashcards"], summary: "Create a flashcard manually",
      requestBody: jsonBody(
        { lessonId: { type: "string" }, front: { type: "string" }, back: { type: "string" }, topicName: { type: "string" } },
        ["lessonId", "front", "back"],
      ),
      responses: { ...ok200("Card created", { card: { type: "object" } }), ...err([400, 401]) },
    },
  },
  "/api/flashcards/{cardId}": {
    patch: {
      tags: ["Flashcards"], summary: "Edit a flashcard",
      parameters: [pathParam("cardId", "Flashcard ID")],
      requestBody: jsonBody({ front: { type: "string" }, back: { type: "string" } }),
      responses: { ...ok200("Card updated", { card: { type: "object" } }), ...err([400, 401, 404]) },
    },
    delete: {
      tags: ["Flashcards"], summary: "Delete a flashcard",
      parameters: [pathParam("cardId", "Flashcard ID")],
      responses: { ...ok200("Card deleted"), ...err([401, 404]) },
    },
  },

  // ═══════════════════════════ UPLOAD (3) ═══════════════════════════════
  "/api/transcribe/start": {
    post: {
      tags: ["Upload"], summary: "Start audio/video transcription",
      description: "Rate limited: 3 req/min. Max file size: 100 MB. Returns a job ID for SSE streaming.",
      requestBody: {
        required: true,
        content: { "multipart/form-data": { schema: { type: "object", properties: { file: { type: "string", format: "binary" }, lessonId: { type: "string" } }, required: ["file"] } } },
      },
      responses: { ...ok200("Job started", { jobId: { type: "string" } }), ...err([400, 401, 429]) },
    },
  },
  "/api/slides/upload": {
    post: {
      tags: ["Upload"], summary: "Upload slide file for OCR",
      description: "Rate limited: 5 req/min. Supports PDF/PPTX. Extracts text via OCR.",
      requestBody: {
        required: true,
        content: { "multipart/form-data": { schema: { type: "object", properties: { file: { type: "string", format: "binary" }, lessonId: { type: "string" } }, required: ["file", "lessonId"] } } },
      },
      responses: { ...ok200("Slide text extracted", { text: { type: "string" } }), ...err([400, 401, 429]) },
    },
  },
  "/api/transcribe/stream/{jobId}": {
    get: {
      tags: ["Upload"], summary: "Stream transcription progress (SSE)",
      description: "Server-Sent Events stream for transcription job progress.",
      parameters: [pathParam("jobId", "Transcription job ID")],
      responses: { "200": { description: "SSE stream", content: { "text/event-stream": { schema: { type: "string" } } } }, ...err([401, 404]) },
    },
  },

  // ═══════════════════════════ CONNECTIONS (3) ══════════════════════════
  "/api/connections": {
    get: {
      tags: ["Connections"], summary: "Get cross-lesson concept connections",
      responses: { ...ok200("Connections", { connections: { type: "array" } }), ...err([401]) },
    },
  },
  "/api/connections/build": {
    post: {
      tags: ["Connections"], summary: "Build/rebuild connections via AI",
      description: "Analyzes all lessons to discover shared concepts.",
      responses: { ...ok200("Connections built", { connections: { type: "array" } }), ...err([401]) },
    },
  },
  "/api/connections/deep-dive": {
    post: {
      tags: ["Connections"], summary: "Deep dive into a connection concept",
      requestBody: jsonBody({
        concept: { type: "string" },
        lessonTitles: { type: "array", items: { type: "string" } },
        relatedConcepts: { type: "array", items: { type: "string" } },
      }, ["concept", "lessonTitles"]),
      responses: { ...ok200("Deep dive analysis", { analysis: { type: "object" } }), ...err([400, 401]) },
    },
  },

  // ═══════════════════════════ SCHEDULER (5) ════════════════════════════
  "/api/scheduler/next-session": {
    get: {
      tags: ["Scheduler"], summary: "Get next study session",
      parameters: [{ name: "courseId", in: "query", schema: { type: "string" } }],
      responses: { ...ok200("Next session"), ...err([401]) },
    },
  },
  "/api/scheduler/daily": {
    get: {
      tags: ["Scheduler"], summary: "Get daily study plan",
      parameters: [{ name: "courseId", in: "query", schema: { type: "string" } }],
      responses: { ...ok200("Daily plan", { plan: { type: "object" } }), ...err([401]) },
    },
  },
  "/api/scheduler/weekly": {
    get: {
      tags: ["Scheduler"], summary: "Get weekly study overview",
      parameters: [{ name: "courseId", in: "query", schema: { type: "string" } }],
      responses: { ...ok200("Weekly overview", { overview: { type: "object" } }), ...err([401]) },
    },
  },
  "/api/scheduler/complete-task": {
    post: {
      tags: ["Scheduler"], summary: "Mark a scheduler task as complete",
      requestBody: jsonBody({ taskId: { type: "string" } }, ["taskId"]),
      responses: { ...ok200("Task completed"), ...err([400, 401]) },
    },
  },
  "/api/scheduler/streak": {
    get: {
      tags: ["Scheduler"], summary: "Get current study streak",
      responses: { ...ok200("Streak", { streak: { type: "object" } }), ...err([401]) },
    },
  },

  // ═══════════════════════════ NOTIFICATIONS (5) ════════════════════════
  "/api/notifications": {
    get: {
      tags: ["Notifications"], summary: "List notifications",
      parameters: [{ name: "unread", in: "query", schema: { type: "boolean" }, description: "Filter unread only" }],
      responses: { ...ok200("Notification list", { notifications: { type: "array" } }), ...err([401]) },
    },
  },
  "/api/notifications/{id}/dismiss": {
    post: {
      tags: ["Notifications"], summary: "Dismiss a notification",
      parameters: [pathParam("id", "Notification ID")],
      responses: { ...ok200("Dismissed", { notification: { type: "object" } }), ...err([401, 404]) },
    },
  },
  "/api/notifications/dismiss-all": {
    post: {
      tags: ["Notifications"], summary: "Dismiss all notifications",
      responses: { ...ok200("All dismissed", { dismissed: { type: "integer" } }), ...err([401]) },
    },
  },
  "/api/notifications/unread-count": {
    get: {
      tags: ["Notifications"], summary: "Get unread notification count",
      responses: { ...ok200("Unread count", { count: { type: "integer" } }), ...err([401]) },
    },
  },
  "/api/notifications/check": {
    post: {
      tags: ["Notifications"], summary: "Trigger notification generation",
      description: "Checks for due notifications (flashcard reviews, study reminders, etc.) and emits via Socket.IO.",
      responses: { ...ok200("Check result", { newNotifications: { type: "array" }, count: { type: "integer" } }), ...err([401]) },
    },
  },

  // ═══════════════════════════ GAMIFICATION (2) ═════════════════════════
  "/api/xp/add": {
    post: {
      tags: ["Gamification"], summary: "Add XP to current user",
      requestBody: jsonBody({ amount: { type: "integer" }, reason: { type: "string" } }, ["amount"]),
      responses: { ...ok200("XP added"), ...err([400, 401]) },
    },
  },
  "/api/xp/stats": {
    get: {
      tags: ["Gamification"], summary: "Get XP and achievement stats",
      responses: { ...ok200("XP stats"), ...err([401]) },
    },
  },

  // ═══════════════════════════ KNOWLEDGE GRAPH (2) ══════════════════════
  "/api/courses/{id}/knowledge-graph": {
    get: {
      tags: ["Knowledge Graph"], summary: "Get course knowledge graph",
      parameters: [pathParam("id", "Course ID")],
      responses: { ...ok200("Knowledge graph", { graph: { type: "object" } }), ...err([401]) },
    },
  },
  "/api/courses/{id}/knowledge-graph/rebuild": {
    post: {
      tags: ["Knowledge Graph"], summary: "Rebuild knowledge graph from lessons",
      description: "AI-powered graph extraction from all course lessons.",
      parameters: [pathParam("id", "Course ID")],
      responses: { ...ok200("Graph rebuilt", { graph: { type: "object" } }), ...err([401]) },
    },
  },

  // ═══════════════════════════ ADAPTIVE QUIZ (4) ════════════════════════
  "/api/adaptive-quiz/start": {
    post: {
      tags: ["Adaptive Quiz"], summary: "Start adaptive quiz session",
      description: "IRT-based (Item Response Theory) adaptive quiz. Selects questions based on estimated ability (theta).",
      requestBody: jsonBody({ courseId: { type: "string" }, lessonIds: { type: "array", items: { type: "string" } } }, ["courseId"]),
      responses: {
        ...ok200("Session started", {
          sessionId: { type: "string" },
          currentTheta: { type: "number" },
          poolSize: { type: "integer" },
          nextQuestion: { type: "object" },
        }),
        ...err([400, 401]),
      },
    },
  },
  "/api/adaptive-quiz/{sessionId}": {
    get: {
      tags: ["Adaptive Quiz"], summary: "Get adaptive quiz session state",
      parameters: [pathParam("sessionId", "Session ID")],
      responses: {
        ...ok200("Session state", {
          sessionId: { type: "string" },
          currentTheta: { type: "number" },
          questionsAsked: { type: "integer" },
          isComplete: { type: "boolean" },
          stoppingReason: { type: "string" },
          nextQuestion: { type: "object" },
        }),
        ...err([401, 404]),
      },
    },
  },
  "/api/adaptive-quiz/{sessionId}/answer": {
    post: {
      tags: ["Adaptive Quiz"], summary: "Submit answer in adaptive quiz",
      parameters: [pathParam("sessionId", "Session ID")],
      requestBody: jsonBody({ itemId: { type: "string" }, answer: { type: "string" } }, ["itemId", "answer"]),
      responses: {
        ...ok200("Answer result", {
          grade: { type: "string", enum: ["correct", "partial", "incorrect"] },
          currentTheta: { type: "number" },
          questionsAsked: { type: "integer" },
          isComplete: { type: "boolean" },
          nextQuestion: { type: "object" },
        }),
        ...err([400, 401, 404]),
      },
    },
  },
  "/api/adaptive-quiz/{sessionId}/end": {
    post: {
      tags: ["Adaptive Quiz"], summary: "Force end adaptive quiz session",
      parameters: [pathParam("sessionId", "Session ID")],
      responses: { ...ok200("Session ended", { summary: { type: "object" } }), ...err([401, 404]) },
    },
  },

  // ═══════════════════════════ LO PROGRESS (3) ═════════════════════════
  "/api/courses/{id}/lo-progress": {
    get: {
      tags: ["LO Progress"], summary: "Get LO progress dashboard for a course",
      parameters: [pathParam("id", "Course ID")],
      responses: { ...ok200("LO progress", { courseName: { type: "string" }, loProgress: { type: "array" } }), ...err([401, 404]) },
    },
  },
  "/api/courses/{id}/lo-progress/{loId}": {
    get: {
      tags: ["LO Progress"], summary: "Get single LO detail",
      parameters: [pathParam("id", "Course ID"), pathParam("loId", "Learning Outcome ID")],
      responses: { ...ok200("LO detail"), ...err([401, 404]) },
    },
  },
  "/api/courses/{id}/lo-progress/refresh": {
    post: {
      tags: ["LO Progress"], summary: "Force recompute LO progress",
      parameters: [pathParam("id", "Course ID")],
      responses: { ...ok200("LO progress refreshed"), ...err([401, 404]) },
    },
  },

  // ═══════════════════════════ SHARE (6) ════════════════════════════════
  "/api/shares": {
    get: {
      tags: ["Share"], summary: "List all shares",
      responses: { ...ok200("Share list", { shares: { type: "array" } }), ...err([401]) },
    },
    post: {
      tags: ["Share"], summary: "Create a share link for a lesson",
      requestBody: jsonBody({ lessonId: { type: "string" } }, ["lessonId"]),
      responses: { ...ok200("Share created", { share: { type: "object" } }), ...err([400, 401, 404]) },
    },
  },
  "/api/shares/{shareId}": {
    get: {
      tags: ["Share"], summary: "Get a share by ID",
      description: "Public endpoint -- no auth required.",
      security: [],
      parameters: [pathParam("shareId", "Share ID")],
      responses: { ...ok200("Share data", { share: { type: "object" } }), ...err([404]) },
    },
    delete: {
      tags: ["Share"], summary: "Delete a share",
      parameters: [pathParam("shareId", "Share ID")],
      responses: { ...ok200("Share deleted"), ...err([401, 404]) },
    },
  },
  "/api/shares/{shareId}/comments": {
    post: {
      tags: ["Share"], summary: "Add a comment to a share",
      parameters: [pathParam("shareId", "Share ID")],
      requestBody: jsonBody({ text: { type: "string" } }, ["text"]),
      responses: { ...ok200("Comment added", { share: { type: "object" } }), ...err([400, 401, 404]) },
    },
  },
  "/api/shares/{shareId}/import": {
    post: {
      tags: ["Share"], summary: "Import a shared lesson into own library",
      parameters: [pathParam("shareId", "Share ID")],
      responses: { ...ok200("Lesson imported", { lessonId: { type: "string" }, lesson: { type: "object" } }), ...err([401, 404]) },
    },
  },

  // ═══════════════════════════ COLLAB -- PROFILES (9) ═══════════════════
  "/api/collab/profiles": {
    post: {
      tags: ["Collaboration"], summary: "Create collaboration profile",
      requestBody: jsonBody({ displayName: { type: "string" }, avatar: { type: "string" }, bio: { type: "string" } }, ["displayName"]),
      responses: { ...ok200("Profile created"), ...err([400, 401]) },
    },
  },
  "/api/collab/profiles/{id}": {
    get: {
      tags: ["Collaboration"], summary: "Get collaboration profile",
      parameters: [pathParam("id", "Profile/User ID")],
      responses: { ...ok200("Profile"), ...err([401, 404]) },
    },
    patch: {
      tags: ["Collaboration"], summary: "Update collaboration profile",
      parameters: [pathParam("id", "Profile/User ID")],
      requestBody: jsonBody({ displayName: { type: "string" }, avatar: { type: "string" }, bio: { type: "string" } }),
      responses: { ...ok200("Profile updated"), ...err([400, 401, 404]) },
    },
  },
  "/api/collab/profiles/{id}/status": {
    patch: {
      tags: ["Collaboration"], summary: "Set online status",
      parameters: [pathParam("id", "Profile/User ID")],
      requestBody: jsonBody({ status: { type: "string", enum: ["online", "idle", "dnd", "offline"] } }, ["status"]),
      responses: { ...ok200("Status set"), ...err([400, 401]) },
    },
  },
  "/api/collab/profiles/{id}/friend-request": {
    post: {
      tags: ["Collaboration"], summary: "Send friend request",
      parameters: [pathParam("id", "Profile/User ID")],
      requestBody: jsonBody({ targetId: { type: "string" } }, ["targetId"]),
      responses: { ...ok200("Request sent"), ...err([400, 401]) },
    },
  },
  "/api/collab/profiles/{id}/friend-accept": {
    post: {
      tags: ["Collaboration"], summary: "Accept friend request",
      parameters: [pathParam("id", "Profile/User ID")],
      requestBody: jsonBody({ requesterId: { type: "string" } }, ["requesterId"]),
      responses: { ...ok200("Request accepted"), ...err([400, 401]) },
    },
  },
  "/api/collab/profiles/{id}/friend-reject": {
    post: {
      tags: ["Collaboration"], summary: "Reject friend request",
      parameters: [pathParam("id", "Profile/User ID")],
      requestBody: jsonBody({ requesterId: { type: "string" } }, ["requesterId"]),
      responses: { ...ok200("Request rejected"), ...err([400, 401]) },
    },
  },
  "/api/collab/profiles/{id}/friends/{friendId}": {
    delete: {
      tags: ["Collaboration"], summary: "Remove a friend",
      parameters: [pathParam("id", "Profile/User ID"), pathParam("friendId", "Friend ID")],
      responses: { ...ok200("Friend removed"), ...err([401, 404]) },
    },
  },
  "/api/collab/profiles/{id}/friends": {
    get: {
      tags: ["Collaboration"], summary: "Get friends list",
      parameters: [pathParam("id", "Profile/User ID")],
      responses: { ...ok200("Friends list"), ...err([401]) },
    },
  },

  // ═══════════════════════════ COLLAB -- SERVERS (15) ═══════════════════
  "/api/collab/servers": {
    post: {
      tags: ["Collaboration"], summary: "Create a server",
      requestBody: jsonBody({ name: { type: "string" }, description: { type: "string" }, icon: { type: "string" }, isPublic: { type: "boolean" } }, ["name"]),
      responses: { ...ok200("Server created"), ...err([400, 401]) },
    },
  },
  "/api/collab/servers/discover": {
    get: {
      tags: ["Collaboration"], summary: "Discover public servers",
      responses: { ...ok200("Server list"), ...err([401]) },
    },
  },
  "/api/collab/servers/templates": {
    get: {
      tags: ["Collaboration"], summary: "Get server templates",
      responses: { ...ok200("Templates"), ...err([401]) },
    },
  },
  "/api/collab/servers/invite/{code}": {
    get: {
      tags: ["Collaboration"], summary: "Get server by invite code",
      parameters: [pathParam("code", "Invite code")],
      responses: { ...ok200("Server preview"), ...err([401, 404]) },
    },
  },
  "/api/collab/servers/user/{userId}": {
    get: {
      tags: ["Collaboration"], summary: "Get servers for a user",
      parameters: [pathParam("userId", "User ID")],
      responses: { ...ok200("User servers"), ...err([401]) },
    },
  },
  "/api/collab/servers/join-invite": {
    post: {
      tags: ["Collaboration"], summary: "Join server via invite code",
      requestBody: jsonBody({ inviteCode: { type: "string" } }, ["inviteCode"]),
      responses: { ...ok200("Joined"), ...err([400, 401, 404]) },
    },
  },
  "/api/collab/servers/{id}": {
    get: {
      tags: ["Collaboration"], summary: "Get server details",
      parameters: [pathParam("id", "Server ID")],
      responses: { ...ok200("Server"), ...err([401, 404]) },
    },
    patch: {
      tags: ["Collaboration"], summary: "Update server settings",
      parameters: [pathParam("id", "Server ID")],
      requestBody: jsonBody({ name: { type: "string" }, description: { type: "string" }, icon: { type: "string" }, isPublic: { type: "boolean" } }),
      responses: { ...ok200("Server updated"), ...err([400, 401, 404]) },
    },
    delete: {
      tags: ["Collaboration"], summary: "Delete a server",
      parameters: [pathParam("id", "Server ID")],
      responses: { ...ok200("Server deleted"), ...err([401, 403, 404]) },
    },
  },
  "/api/collab/servers/{id}/join": {
    post: {
      tags: ["Collaboration"], summary: "Join a public server",
      parameters: [pathParam("id", "Server ID")],
      responses: { ...ok200("Joined"), ...err([401, 404]) },
    },
  },
  "/api/collab/servers/{id}/leave": {
    post: {
      tags: ["Collaboration"], summary: "Leave a server",
      parameters: [pathParam("id", "Server ID")],
      responses: { ...ok200("Left"), ...err([401, 404]) },
    },
  },
  "/api/collab/servers/{id}/kick": {
    post: {
      tags: ["Collaboration"], summary: "Kick a member from server",
      parameters: [pathParam("id", "Server ID")],
      requestBody: jsonBody({ userId: { type: "string" } }, ["userId"]),
      responses: { ...ok200("Member kicked"), ...err([401, 403, 404]) },
    },
  },
  "/api/collab/servers/{id}/categories": {
    post: {
      tags: ["Collaboration"], summary: "Add a category to server",
      parameters: [pathParam("id", "Server ID")],
      requestBody: jsonBody({ name: { type: "string" } }, ["name"]),
      responses: { ...ok200("Category added"), ...err([400, 401, 404]) },
    },
  },
  "/api/collab/servers/{id}/regenerate-invite": {
    post: {
      tags: ["Collaboration"], summary: "Regenerate server invite code",
      parameters: [pathParam("id", "Server ID")],
      responses: { ...ok200("Invite regenerated"), ...err([401, 403]) },
    },
  },
  "/api/collab/servers/{id}/members": {
    get: {
      tags: ["Collaboration"], summary: "Get server member list",
      parameters: [pathParam("id", "Server ID")],
      responses: { ...ok200("Members"), ...err([401, 404]) },
    },
  },

  // ═══════════════════════════ COLLAB -- CHANNELS (5) ═══════════════════
  "/api/collab/servers/{serverId}/channels": {
    post: {
      tags: ["Collaboration"], summary: "Create a channel in server",
      parameters: [pathParam("serverId", "Server ID")],
      requestBody: jsonBody({ name: { type: "string" }, type: { type: "string", enum: ["text", "voice"] }, categoryId: { type: "string" } }, ["name"]),
      responses: { ...ok200("Channel created"), ...err([400, 401, 404]) },
    },
    get: {
      tags: ["Collaboration"], summary: "List channels in server",
      parameters: [pathParam("serverId", "Server ID")],
      responses: { ...ok200("Channel list"), ...err([401, 404]) },
    },
  },
  "/api/collab/servers/{serverId}/channels/{channelId}": {
    get: {
      tags: ["Collaboration"], summary: "Get channel details",
      parameters: [pathParam("serverId", "Server ID"), pathParam("channelId", "Channel ID")],
      responses: { ...ok200("Channel"), ...err([401, 404]) },
    },
    patch: {
      tags: ["Collaboration"], summary: "Update channel",
      parameters: [pathParam("serverId", "Server ID"), pathParam("channelId", "Channel ID")],
      requestBody: jsonBody({ name: { type: "string" }, topic: { type: "string" } }),
      responses: { ...ok200("Channel updated"), ...err([400, 401, 404]) },
    },
    delete: {
      tags: ["Collaboration"], summary: "Delete channel",
      parameters: [pathParam("serverId", "Server ID"), pathParam("channelId", "Channel ID")],
      responses: { ...ok200("Channel deleted"), ...err([401, 403, 404]) },
    },
  },

  // ═══════════════════════════ COLLAB -- LOBBY (2) ═════════════════════
  "/api/collab/lobby/messages": {
    get: {
      tags: ["Collaboration"], summary: "Get lobby messages",
      responses: { ...ok200("Lobby messages"), ...err([401]) },
    },
    post: {
      tags: ["Collaboration"], summary: "Send lobby message",
      description: "Rate limited: 20 req/min.",
      requestBody: jsonBody({ content: { type: "string" } }, ["content"]),
      responses: { ...ok200("Message sent"), ...err([400, 401, 429]) },
    },
  },

  // ═══════════════════════════ COLLAB -- MESSAGES (7) ═══════════════════
  "/api/collab/channels/{channelId}/messages": {
    post: {
      tags: ["Collaboration"], summary: "Send message to channel",
      description: "Rate limited: 30 req/min.",
      parameters: [pathParam("channelId", "Channel ID")],
      requestBody: jsonBody({ content: { type: "string" }, threadId: { type: "string" } }, ["content"]),
      responses: { ...ok200("Message sent"), ...err([400, 401, 429]) },
    },
    get: {
      tags: ["Collaboration"], summary: "Get channel messages",
      parameters: [pathParam("channelId", "Channel ID")],
      responses: { ...ok200("Messages"), ...err([401, 404]) },
    },
  },
  "/api/collab/channels/{channelId}/threads/{threadId}": {
    get: {
      tags: ["Collaboration"], summary: "Get thread messages",
      parameters: [pathParam("channelId", "Channel ID"), pathParam("threadId", "Thread ID")],
      responses: { ...ok200("Thread"), ...err([401, 404]) },
    },
  },
  "/api/collab/channels/{channelId}/messages/{messageId}": {
    patch: {
      tags: ["Collaboration"], summary: "Edit a message",
      parameters: [pathParam("channelId", "Channel ID"), pathParam("messageId", "Message ID")],
      requestBody: jsonBody({ content: { type: "string" } }, ["content"]),
      responses: { ...ok200("Message edited"), ...err([400, 401, 403, 404]) },
    },
    delete: {
      tags: ["Collaboration"], summary: "Delete a message",
      parameters: [pathParam("channelId", "Channel ID"), pathParam("messageId", "Message ID")],
      responses: { ...ok200("Message deleted"), ...err([401, 403, 404]) },
    },
  },
  "/api/collab/channels/{channelId}/messages/{messageId}/react": {
    post: {
      tags: ["Collaboration"], summary: "Toggle reaction on a message",
      parameters: [pathParam("channelId", "Channel ID"), pathParam("messageId", "Message ID")],
      requestBody: jsonBody({ emoji: { type: "string" } }, ["emoji"]),
      responses: { ...ok200("Reaction toggled"), ...err([400, 401, 404]) },
    },
  },
  "/api/collab/channels/{channelId}/messages/{messageId}/pin": {
    post: {
      tags: ["Collaboration"], summary: "Toggle pin on a message",
      parameters: [pathParam("channelId", "Channel ID"), pathParam("messageId", "Message ID")],
      requestBody: jsonBody({ pinned: { type: "boolean" } }),
      responses: { ...ok200("Pin toggled"), ...err([401, 404]) },
    },
  },

  // ═══════════════════════════ COLLAB -- LESSON TOOLS (16+2+4=22) ══════
  "/api/collab/lessons": {
    get: {
      tags: ["Collaboration"], summary: "List lessons for material linking",
      responses: { ...ok200("Lessons"), ...err([401]) },
    },
  },
  "/api/collab/channels/{channelId}/link-lesson": {
    post: {
      tags: ["Collaboration"], summary: "Link a lesson to a channel",
      parameters: [pathParam("channelId", "Channel ID")],
      requestBody: jsonBody({ lessonId: { type: "string" } }, ["lessonId"]),
      responses: { ...ok200("Lesson linked"), ...err([400, 401, 404]) },
    },
    delete: {
      tags: ["Collaboration"], summary: "Unlink lesson from channel",
      parameters: [pathParam("channelId", "Channel ID")],
      responses: { ...ok200("Lesson unlinked"), ...err([401, 404]) },
    },
  },
  "/api/collab/channels/{channelId}/lesson-context": {
    get: {
      tags: ["Collaboration"], summary: "Get linked lesson context summary",
      parameters: [pathParam("channelId", "Channel ID")],
      responses: { ...ok200("Lesson context"), ...err([401, 404]) },
    },
  },
  "/api/collab/channels/{channelId}/lesson-detail": {
    get: {
      tags: ["Collaboration"], summary: "Get linked lesson full detail",
      parameters: [pathParam("channelId", "Channel ID")],
      responses: { ...ok200("Lesson detail"), ...err([401, 404]) },
    },
  },
  "/api/collab/channels/{channelId}/tool-data": {
    get: {
      tags: ["Collaboration"], summary: "Get all tool data for a channel",
      parameters: [pathParam("channelId", "Channel ID")],
      responses: { ...ok200("Tool data"), ...err([401, 404]) },
    },
  },
  "/api/collab/channels/{channelId}/tool/quiz/generate": {
    post: {
      tags: ["Collaboration"], summary: "Generate quiz in channel",
      parameters: [pathParam("channelId", "Channel ID")],
      responses: { ...ok200("Quiz generated"), ...err([401, 404]) },
    },
  },
  "/api/collab/channels/{channelId}/tool/quiz/answer": {
    post: {
      tags: ["Collaboration"], summary: "Submit quiz answer in channel",
      parameters: [pathParam("channelId", "Channel ID")],
      requestBody: jsonBody({ questionId: { type: "string" }, answer: { type: "string" } }, ["questionId", "answer"]),
      responses: { ...ok200("Answer result"), ...err([400, 401, 404]) },
    },
  },
  "/api/collab/channels/{channelId}/tool/flashcards/add": {
    post: {
      tags: ["Collaboration"], summary: "Add flashcard in channel",
      parameters: [pathParam("channelId", "Channel ID")],
      requestBody: jsonBody({ front: { type: "string" }, back: { type: "string" } }, ["front", "back"]),
      responses: { ...ok200("Flashcard added"), ...err([400, 401, 404]) },
    },
  },
  "/api/collab/channels/{channelId}/tool/flashcards/generate": {
    post: {
      tags: ["Collaboration"], summary: "Auto-generate flashcards for channel",
      parameters: [pathParam("channelId", "Channel ID")],
      responses: { ...ok200("Flashcards generated"), ...err([401, 404]) },
    },
  },
  "/api/collab/channels/{channelId}/tool/flashcards/extract": {
    post: {
      tags: ["Collaboration"], summary: "Extract flashcards from conversation",
      parameters: [pathParam("channelId", "Channel ID")],
      responses: { ...ok200("Flashcards extracted"), ...err([401, 404]) },
    },
  },
  "/api/collab/channels/{channelId}/tool/flashcards/review": {
    post: {
      tags: ["Collaboration"], summary: "Review flashcard in channel (SM-2)",
      parameters: [pathParam("channelId", "Channel ID")],
      requestBody: jsonBody({ cardId: { type: "string" }, quality: { type: "integer", minimum: 0, maximum: 5 } }, ["cardId", "quality"]),
      responses: { ...ok200("Review result"), ...err([400, 401, 404]) },
    },
  },
  "/api/collab/channels/{channelId}/tool/deep-dive/chat": {
    post: {
      tags: ["Collaboration"], summary: "Deep Dive chat in channel",
      parameters: [pathParam("channelId", "Channel ID")],
      requestBody: jsonBody({ message: { type: "string" }, history: { type: "array" } }, ["message"]),
      responses: { ...ok200("Chat response"), ...err([400, 401, 404]) },
    },
  },
  "/api/collab/channels/{channelId}/tool/mind-map/generate": {
    post: {
      tags: ["Collaboration"], summary: "Generate mind map in channel",
      parameters: [pathParam("channelId", "Channel ID")],
      responses: { ...ok200("Mind map"), ...err([401, 404]) },
    },
  },
  "/api/collab/channels/{channelId}/tool/sprint/start": {
    post: {
      tags: ["Collaboration"], summary: "Start a study sprint",
      parameters: [pathParam("channelId", "Channel ID")],
      requestBody: jsonBody({ durationMinutes: { type: "integer" } }),
      responses: { ...ok200("Sprint started"), ...err([401, 404]) },
    },
  },
  "/api/collab/channels/{channelId}/tool/sprint/status": {
    post: {
      tags: ["Collaboration"], summary: "Update study sprint status",
      parameters: [pathParam("channelId", "Channel ID")],
      requestBody: jsonBody({ status: { type: "string" } }),
      responses: { ...ok200("Sprint status updated"), ...err([401, 404]) },
    },
  },
  "/api/collab/channels/{channelId}/tool/notes/add": {
    post: {
      tags: ["Collaboration"], summary: "Add a shared note",
      parameters: [pathParam("channelId", "Channel ID")],
      requestBody: jsonBody({ content: { type: "string" }, title: { type: "string" } }, ["content"]),
      responses: { ...ok200("Note added"), ...err([400, 401, 404]) },
    },
  },
  "/api/collab/channels/{channelId}/tool/notes/{noteId}": {
    patch: {
      tags: ["Collaboration"], summary: "Edit a shared note",
      parameters: [pathParam("channelId", "Channel ID"), pathParam("noteId", "Note ID")],
      requestBody: jsonBody({ content: { type: "string" }, title: { type: "string" } }),
      responses: { ...ok200("Note edited"), ...err([400, 401, 404]) },
    },
    delete: {
      tags: ["Collaboration"], summary: "Delete a shared note",
      parameters: [pathParam("channelId", "Channel ID"), pathParam("noteId", "Note ID")],
      responses: { ...ok200("Note deleted"), ...err([401, 404]) },
    },
  },
  "/api/collab/channels/{channelId}/tool/notes/{noteId}/pin": {
    post: {
      tags: ["Collaboration"], summary: "Toggle pin on a note",
      parameters: [pathParam("channelId", "Channel ID"), pathParam("noteId", "Note ID")],
      responses: { ...ok200("Pin toggled"), ...err([401, 404]) },
    },
  },
  "/api/collab/channels/{channelId}/tool/lock": {
    post: {
      tags: ["Collaboration"], summary: "Lock a channel tool for editing",
      parameters: [pathParam("channelId", "Channel ID")],
      requestBody: jsonBody({ tool: { type: "string" } }, ["tool"]),
      responses: { ...ok200("Tool locked"), ...err([401, 409]) },
    },
  },
  "/api/collab/channels/{channelId}/tool/unlock": {
    post: {
      tags: ["Collaboration"], summary: "Unlock a channel tool",
      parameters: [pathParam("channelId", "Channel ID")],
      requestBody: jsonBody({ tool: { type: "string" } }, ["tool"]),
      responses: { ...ok200("Tool unlocked"), ...err([401]) },
    },
  },

  // ═══════════════════════════ COLLAB -- EXPORT (5) ════════════════════
  "/api/collab/channels/{channelId}/export/quiz": {
    get: {
      tags: ["Collaboration"], summary: "Export channel quiz data",
      parameters: [pathParam("channelId", "Channel ID")],
      responses: { ...ok200("Quiz export"), ...err([401, 404]) },
    },
  },
  "/api/collab/channels/{channelId}/export/flashcards": {
    get: {
      tags: ["Collaboration"], summary: "Export channel flashcards",
      parameters: [pathParam("channelId", "Channel ID")],
      responses: { ...ok200("Flashcard export"), ...err([401, 404]) },
    },
  },
  "/api/collab/channels/{channelId}/export/notes": {
    get: {
      tags: ["Collaboration"], summary: "Export channel notes",
      parameters: [pathParam("channelId", "Channel ID")],
      responses: { ...ok200("Notes export"), ...err([401, 404]) },
    },
  },
  "/api/collab/channels/{channelId}/export/mind-map": {
    get: {
      tags: ["Collaboration"], summary: "Export channel mind map",
      parameters: [pathParam("channelId", "Channel ID")],
      responses: { ...ok200("Mind map export"), ...err([401, 404]) },
    },
  },
  "/api/collab/channels/{channelId}/export/all": {
    get: {
      tags: ["Collaboration"], summary: "Export all channel data",
      parameters: [pathParam("channelId", "Channel ID")],
      responses: { ...ok200("Full export"), ...err([401, 404]) },
    },
  },

  // ═══════════════════════════ ROOMS (21) ══════════════════════════════
  "/api/rooms": {
    post: {
      tags: ["Rooms"], summary: "Create a collaboration room",
      requestBody: jsonBody({ name: { type: "string" }, description: { type: "string" }, isPublic: { type: "boolean" }, maxMembers: { type: "integer" } }, ["name"]),
      responses: { ...ok200("Room created"), ...err([400, 401]) },
    },
  },
  "/api/rooms/solo": {
    post: {
      tags: ["Rooms"], summary: "Create a solo study room",
      requestBody: jsonBody({ name: { type: "string" }, lessonId: { type: "string" } }),
      responses: { ...ok200("Solo room created"), ...err([400, 401]) },
    },
  },
  "/api/rooms/discover": {
    get: {
      tags: ["Rooms"], summary: "Discover public rooms", security: [],
      responses: { ...ok200("Room list") },
    },
  },
  "/api/rooms/templates": {
    get: {
      tags: ["Rooms"], summary: "Get room templates", security: [],
      responses: { ...ok200("Templates") },
    },
  },
  "/api/rooms/invite/{code}": {
    get: {
      tags: ["Rooms"], summary: "Get room by invite code", security: [],
      parameters: [pathParam("code", "Invite code")],
      responses: { ...ok200("Room preview"), ...err([404]) },
    },
  },
  "/api/rooms/user/{userId}": {
    get: {
      tags: ["Rooms"], summary: "Get rooms for a user",
      parameters: [pathParam("userId", "User ID")],
      responses: { ...ok200("User rooms"), ...err([401]) },
    },
  },
  "/api/rooms/join-invite": {
    post: {
      tags: ["Rooms"], summary: "Join room via invite code",
      requestBody: jsonBody({ inviteCode: { type: "string" } }, ["inviteCode"]),
      responses: { ...ok200("Joined"), ...err([400, 401, 404]) },
    },
  },
  "/api/rooms/{id}": {
    get: {
      tags: ["Rooms"], summary: "Get room details", security: [],
      parameters: [pathParam("id", "Room ID")],
      responses: { ...ok200("Room"), ...err([404]) },
    },
    patch: {
      tags: ["Rooms"], summary: "Update room settings",
      parameters: [pathParam("id", "Room ID")],
      requestBody: jsonBody({ name: { type: "string" }, description: { type: "string" }, isPublic: { type: "boolean" } }),
      responses: { ...ok200("Room updated"), ...err([400, 401, 404]) },
    },
    delete: {
      tags: ["Rooms"], summary: "Delete a room",
      parameters: [pathParam("id", "Room ID")],
      responses: { ...ok200("Room deleted"), ...err([401, 403, 404]) },
    },
  },
  "/api/rooms/{id}/topic": {
    patch: {
      tags: ["Rooms"], summary: "Update room topic",
      parameters: [pathParam("id", "Room ID")],
      requestBody: jsonBody({ topic: { type: "string" } }, ["topic"]),
      responses: { ...ok200("Topic updated"), ...err([400, 401, 404]) },
    },
  },
  "/api/rooms/{id}/join": {
    post: {
      tags: ["Rooms"], summary: "Join a room",
      parameters: [pathParam("id", "Room ID")],
      responses: { ...ok200("Joined"), ...err([401, 404]) },
    },
  },
  "/api/rooms/{id}/leave": {
    post: {
      tags: ["Rooms"], summary: "Leave a room",
      parameters: [pathParam("id", "Room ID")],
      responses: { ...ok200("Left"), ...err([401, 404]) },
    },
  },
  "/api/rooms/{id}/kick": {
    post: {
      tags: ["Rooms"], summary: "Kick a member from room",
      parameters: [pathParam("id", "Room ID")],
      requestBody: jsonBody({ userId: { type: "string" } }, ["userId"]),
      responses: { ...ok200("Member kicked"), ...err([401, 403, 404]) },
    },
  },
  "/api/rooms/{id}/archive": {
    post: {
      tags: ["Rooms"], summary: "Archive a room",
      parameters: [pathParam("id", "Room ID")],
      responses: { ...ok200("Room archived"), ...err([401, 403]) },
    },
  },
  "/api/rooms/{id}/unarchive": {
    post: {
      tags: ["Rooms"], summary: "Unarchive a room",
      parameters: [pathParam("id", "Room ID")],
      responses: { ...ok200("Room unarchived"), ...err([401, 403]) },
    },
  },
  "/api/rooms/{id}/transfer-ownership": {
    post: {
      tags: ["Rooms"], summary: "Transfer room ownership",
      parameters: [pathParam("id", "Room ID")],
      requestBody: jsonBody({ newOwnerId: { type: "string" } }, ["newOwnerId"]),
      responses: { ...ok200("Ownership transferred"), ...err([400, 401, 403]) },
    },
  },
  "/api/rooms/{id}/material": {
    post: {
      tags: ["Rooms"], summary: "Set room study material",
      parameters: [pathParam("id", "Room ID")],
      requestBody: jsonBody({ lessonId: { type: "string" }, courseId: { type: "string" } }),
      responses: { ...ok200("Material set"), ...err([400, 401, 404]) },
    },
  },
  "/api/rooms/{id}/categories": {
    post: {
      tags: ["Rooms"], summary: "Add a category to room",
      parameters: [pathParam("id", "Room ID")],
      requestBody: jsonBody({ name: { type: "string" } }, ["name"]),
      responses: { ...ok200("Category added"), ...err([400, 401, 404]) },
    },
  },
  "/api/rooms/{id}/regenerate-invite": {
    post: {
      tags: ["Rooms"], summary: "Regenerate room invite code",
      parameters: [pathParam("id", "Room ID")],
      responses: { ...ok200("Invite regenerated"), ...err([401, 403]) },
    },
  },
  "/api/rooms/{id}/members": {
    get: {
      tags: ["Rooms"], summary: "Get room member list", security: [],
      parameters: [pathParam("id", "Room ID")],
      responses: { ...ok200("Members"), ...err([404]) },
    },
  },

  // ═══════════════════════════ ADMIN (23) ══════════════════════════════
  "/api/admin/stats": {
    get: {
      tags: ["Admin"], summary: "Get platform statistics",
      description: "Requires stats:read permission.",
      responses: { ...ok200("Stats", { data: { type: "object" } }), ...err([401, 403]) },
    },
  },
  "/api/admin/users": {
    get: {
      tags: ["Admin"], summary: "List users (paginated)",
      description: "Requires users:read permission.",
      parameters: [...PaginatedQuery],
      responses: { ...ok200("User list", { data: { type: "array" }, total: { type: "integer" }, page: { type: "integer" }, limit: { type: "integer" } }), ...err([401, 403]) },
    },
  },
  "/api/admin/users/{id}": {
    get: {
      tags: ["Admin"], summary: "Get user by ID",
      parameters: [pathParam("id", "User ID")],
      responses: { ...ok200("User", { data: { type: "object" } }), ...err([401, 403, 404]) },
    },
    patch: {
      tags: ["Admin"], summary: "Update user",
      description: "Requires users:write permission. Audit logged.",
      parameters: [pathParam("id", "User ID")],
      requestBody: jsonBody({ name: { type: "string" }, email: { type: "string" }, isActive: { type: "boolean" } }),
      responses: { ...ok200("User updated", { data: { type: "object" } }), ...err([400, 401, 403, 404]) },
    },
    delete: {
      tags: ["Admin"], summary: "Delete user",
      description: "Requires users:delete permission. Audit logged.",
      parameters: [pathParam("id", "User ID")],
      responses: { ...ok200("User deleted"), ...err([401, 403, 404]) },
    },
  },
  "/api/admin/users/{id}/role": {
    patch: {
      tags: ["Admin"], summary: "Set user role",
      description: "Requires users:write permission. Audit logged.",
      parameters: [pathParam("id", "User ID")],
      requestBody: jsonBody({ role: { type: "string" } }, ["role"]),
      responses: { ...ok200("Role set", { data: { type: "object" } }), ...err([400, 401, 403, 404]) },
    },
  },
  "/api/admin/courses": {
    get: {
      tags: ["Admin"], summary: "List all courses (paginated)",
      description: "Requires courses:read permission.",
      parameters: [...PaginatedQuery],
      responses: { ...ok200("Course list", { data: { type: "array" }, total: { type: "integer" } }), ...err([401, 403]) },
    },
  },
  "/api/admin/courses/{id}": {
    delete: {
      tags: ["Admin"], summary: "Delete course",
      description: "Requires courses:delete permission. Audit logged.",
      parameters: [pathParam("id", "Course ID")],
      responses: { ...ok200("Course deleted"), ...err([401, 403, 404]) },
    },
  },
  "/api/admin/lessons": {
    get: {
      tags: ["Admin"], summary: "List all lessons (paginated)",
      description: "Requires lessons:read permission.",
      parameters: [...PaginatedQuery],
      responses: { ...ok200("Lesson list", { data: { type: "array" }, total: { type: "integer" } }), ...err([401, 403]) },
    },
  },
  "/api/admin/lessons/{id}": {
    delete: {
      tags: ["Admin"], summary: "Delete lesson",
      description: "Requires lessons:delete permission. Audit logged.",
      parameters: [pathParam("id", "Lesson ID")],
      responses: { ...ok200("Lesson deleted"), ...err([401, 403, 404]) },
    },
  },
  "/api/admin/roles": {
    get: {
      tags: ["Admin"], summary: "List roles",
      description: "Requires roles:read permission.",
      responses: { ...ok200("Role list", { data: { type: "array" } }), ...err([401, 403]) },
    },
    post: {
      tags: ["Admin"], summary: "Create a role",
      description: "Requires roles:write permission. Audit logged.",
      requestBody: jsonBody({ name: { type: "string" }, permissions: { type: "array", items: { type: "string" } } }, ["name", "permissions"]),
      responses: { ...ok200("Role created", { data: { type: "object" } }), ...err([400, 401, 403]) },
    },
  },
  "/api/admin/roles/{id}": {
    patch: {
      tags: ["Admin"], summary: "Update a role",
      description: "Requires roles:write permission. Audit logged.",
      parameters: [pathParam("id", "Role ID")],
      requestBody: jsonBody({ name: { type: "string" }, permissions: { type: "array", items: { type: "string" } } }),
      responses: { ...ok200("Role updated", { data: { type: "object" } }), ...err([400, 401, 403, 404]) },
    },
    delete: {
      tags: ["Admin"], summary: "Delete a role",
      description: "Requires roles:delete permission. Audit logged.",
      parameters: [pathParam("id", "Role ID")],
      responses: { ...ok200("Role deleted"), ...err([401, 403, 404]) },
    },
  },
  "/api/admin/audit-log": {
    get: {
      tags: ["Admin"], summary: "Query audit log",
      description: "Requires audit:read permission.",
      parameters: [
        ...PaginatedQuery,
        { name: "action", in: "query", schema: { type: "string" }, description: "Filter by action type" },
        { name: "userId", in: "query", schema: { type: "string" }, description: "Filter by acting user" },
      ],
      responses: { ...ok200("Audit log", { data: { type: "array" }, total: { type: "integer" } }), ...err([401, 403]) },
    },
  },
  "/api/admin/notifications": {
    post: {
      tags: ["Admin"], summary: "Send admin notification",
      description: "Requires notifications:write permission. Audit logged.",
      requestBody: jsonBody({ title: { type: "string" }, message: { type: "string" }, targetUserIds: { type: "array", items: { type: "string" } } }, ["title", "message"]),
      responses: { ...ok200("Notification sent", { data: { type: "object" } }), ...err([400, 401, 403]) },
    },
  },
  "/api/admin/settings": {
    get: {
      tags: ["Admin"], summary: "Get platform settings",
      description: "Requires settings:read permission.",
      responses: { ...ok200("Settings", { data: { type: "object" } }), ...err([401, 403]) },
    },
    patch: {
      tags: ["Admin"], summary: "Update platform settings",
      description: "Requires settings:write permission. Audit logged.",
      requestBody: jsonBody({ maxUploadSizeMb: { type: "integer" }, enableSignups: { type: "boolean" }, maintenanceMode: { type: "boolean" } }),
      responses: { ...ok200("Settings updated", { data: { type: "object" } }), ...err([400, 401, 403]) },
    },
  },
};

/* ──────────────────────────── Swagger Configuration ───────────────────── */

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "AIcelerate API",
      version: "1.0.0",
      description:
        "AI-powered collaborative learning platform API. Features include lesson analysis, " +
        "quiz generation, flashcard management (SM-2 spaced repetition), real-time collaboration " +
        "(Discord-style servers/channels), adaptive quizzing (IRT), knowledge graphs, and study scheduling.",
      contact: { name: "AIcelerate Team" },
    },
    servers: [
      { url: "http://localhost:4000", description: "Development" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT access token obtained from /api/auth/login",
        },
      },
      schemas: {
        Error: ErrorSchema,
        Ok: OkSchema,
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: "Health", description: "Health checks and service metrics" },
      { name: "Auth", description: "Authentication, registration, and account management" },
      { name: "Dashboard", description: "Aggregated dashboard data (single-call init)" },
      { name: "Lessons", description: "Lesson CRUD and progress tracking" },
      { name: "Lesson AI", description: "AI-powered lesson analysis, plan generation, mindmaps, and chat" },
      { name: "Quiz", description: "Quiz generation, evaluation, and scoring" },
      { name: "Courses", description: "Course management, chat, progress, and export" },
      { name: "Flashcards", description: "Flashcard management with SM-2 spaced repetition" },
      { name: "Upload", description: "File upload, transcription, and slide OCR" },
      { name: "Connections", description: "Cross-lesson concept connections and deep dives" },
      { name: "Scheduler", description: "Study scheduling, daily/weekly plans, and streaks" },
      { name: "Notifications", description: "User notifications and badge counts" },
      { name: "Gamification", description: "XP tracking and achievement stats" },
      { name: "Knowledge Graph", description: "AI-extracted course knowledge graphs" },
      { name: "Adaptive Quiz", description: "IRT-based adaptive quizzing with theta estimation" },
      { name: "LO Progress", description: "Learning outcome progress tracking per course" },
      { name: "Share", description: "Lesson sharing, commenting, and importing" },
      { name: "Collaboration", description: "Discord-style servers, channels, messaging, and study tools" },
      { name: "Rooms", description: "Collaboration rooms with material linking and sprints" },
      { name: "Admin", description: "Admin panel: user/course/lesson/role management, audit log, and settings" },
    ],
    paths,
  },
  apis: [], // All paths defined inline above
};

export const swaggerSpec = swaggerJsdoc(options);
