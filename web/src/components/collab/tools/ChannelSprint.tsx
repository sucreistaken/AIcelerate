import { useChannelSprint } from "./sprint/useChannelSprint";
import SprintSetup from "./sprint/SprintSetup";
import SprintTimer from "./sprint/SprintTimer";
import SprintControls from "./sprint/SprintControls";
import SprintMemberList from "./sprint/SprintMemberList";

interface Props {
  channelId: string;
  topic: string;
  serverName: string;
  userId: string;
  nickname: string;
}

export default function ChannelSprint({ channelId, topic, userId, nickname }: Props) {
  const {
    sprint,
    studyMin,
    setStudyMin,
    breakMin,
    setBreakMin,
    timeLeft,
    starting,
    members,
    memberEntries,
    pomodorosCompleted,
    handleStart,
    handlePause,
    handleResume,
    handleReset,
    handleStatusChange,
  } = useChannelSprint(channelId, userId, nickname);

  if (!sprint || sprint.phase === "idle") {
    return (
      <SprintSetup
        topic={topic}
        studyMin={studyMin}
        setStudyMin={setStudyMin}
        breakMin={breakMin}
        setBreakMin={setBreakMin}
        starting={starting}
        handleStart={handleStart}
        memberEntries={memberEntries}
        userId={userId}
      />
    );
  }

  return (
    <div className="sh-tool">
      <div className="sh-tool__header">
        <div className="sh-tool__header-left">
          <span>{"S"}</span>
          <h3 className="sh-main-content__channel-name">Sprint - {topic}</h3>
        </div>
        <div className="sh-tool__header-right">
          {pomodorosCompleted > 0 && (
            <div className="sh-sprint__pomodoro-row">
              {Array.from({ length: pomodorosCompleted }, (_, i) => (
                <span key={i} className="sh-sprint__pomodoro-dot sh-sprint__pomodoro-dot--done" />
              ))}
              <span className="sh-sprint__pomodoro-dot" />
            </div>
          )}
          <span className="sh-tool__count">
            {pomodorosCompleted} pomodoro
          </span>
        </div>
      </div>

      <div className="sh-tool__body">
        <SprintTimer sprint={sprint} timeLeft={timeLeft} />

        <SprintControls
          sprint={sprint}
          members={members}
          userId={userId}
          handlePause={handlePause}
          handleResume={handleResume}
          handleReset={handleReset}
          handleStatusChange={handleStatusChange}
        />

        <SprintMemberList memberEntries={memberEntries} userId={userId} />
      </div>
    </div>
  );
}
