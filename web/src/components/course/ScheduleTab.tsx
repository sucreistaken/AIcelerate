import { motion } from "framer-motion";
import type { WeeklySchedule } from "../../types";

interface ScheduleTabProps {
  course: { id: string; settings?: { examDate?: string } };
  weeklySchedule: WeeklySchedule | null;
  scheduleLoading: boolean;
  onGenerate: (courseId: string, examDate?: string) => void;
}

export function ScheduleTab({ course, weeklySchedule, scheduleLoading, onGenerate }: ScheduleTabProps) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 className="h3">Weekly Study Schedule</h3>
        <button
          className="btn btn-primary"
          onClick={() => onGenerate(course.id, course.settings?.examDate)}
          disabled={scheduleLoading}
          style={{ fontSize: 12 }}
        >
          {scheduleLoading ? "Generating..." : weeklySchedule ? "Regenerate Schedule" : "Generate Schedule"}
        </button>
      </div>

      {scheduleLoading && (
        <div className="muted-block" style={{ padding: 24, textAlign: "center" }}>
          <div style={{ marginBottom: 8 }}>Generating your personalized study schedule...</div>
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            style={{ fontSize: 24 }}
          >
            ...
          </motion.div>
        </div>
      )}

      {!scheduleLoading && !weeklySchedule && (
        <div className="muted-block" style={{ padding: 24, textAlign: "center" }}>
          <p className="muted">Click "Generate Schedule" to get an AI-powered personalized weekly study plan based on your progress and weak topics.</p>
        </div>
      )}

      {weeklySchedule && !scheduleLoading && (
        <>
          {weeklySchedule.examDate && (
            <div className="small" style={{ marginBottom: 12, color: "var(--accent-2)" }}>
              Exam: {weeklySchedule.examDate} | Generated: {new Date(weeklySchedule.generatedAt).toLocaleDateString()}
            </div>
          )}

          <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
            {weeklySchedule.days.map((day, di) => (
              <div key={di} className="card" style={{ padding: "12px 14px" }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: "var(--accent-2)" }}>
                  {day.day}
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {day.slots.map((slot, si) => (
                    <div
                      key={si}
                      style={{
                        display: "flex", gap: 10, alignItems: "flex-start",
                        padding: "6px 10px", borderRadius: 8,
                        background: "var(--bg)",
                      }}
                    >
                      <span style={{
                        fontSize: 10, fontWeight: 700, minWidth: 60,
                        color: slot.time === "Morning" ? "var(--warning)" : slot.time === "Afternoon" ? "var(--accent-2)" : "var(--success)",
                      }}>
                        {slot.time}
                      </span>
                      <div style={{ flex: 1, fontSize: 12 }}>
                        <div>{slot.activity}</div>
                        {slot.lessonRef && <span className="small muted" style={{ marginLeft: 4 }}>({slot.lessonRef})</span>}
                        {slot.tip && <div className="small muted" style={{ marginTop: 2 }}>{slot.tip}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {weeklySchedule.tips.length > 0 && (
            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Tips</div>
              <div style={{ display: "grid", gap: 4 }}>
                {weeklySchedule.tips.map((tip, i) => (
                  <div key={i} style={{ fontSize: 12, display: "flex", gap: 6 }}>
                    <span style={{ color: "var(--accent-2)" }}>•</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
