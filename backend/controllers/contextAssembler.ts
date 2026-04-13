// controllers/contextAssembler.ts - Moved to services/contextAssemblerService.ts
// This file re-exports for backward compatibility.
export {
  assembleCourseContext,
  assembleCourseWideContext,
  buildToolContext,
  invalidateToolContextCache,
  type AssembledContext,
  type LessonContextMeta,
} from "../services/contextAssemblerService";
