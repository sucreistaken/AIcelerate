import React, { useState } from "react";
import type { StudyServer } from "../../types";
import { useRoomStore } from "../../stores/roomStore";
import { useAuthStore } from "../../stores/authStore";
import { roomsApi } from "../../services/roomsApi";
import { ConfirmModal } from "../ui/ConfirmModal";

interface Props {
  room: StudyServer;
  onClose: () => void;
}

export default function RoomSettings({ room, onClose }: Props) {
  const user = useAuthStore((s) => s.user);
  const leaveRoom = useRoomStore((s) => s.leaveRoom);
  const deleteRoom = useRoomStore((s) => s.deleteRoom);
  const archiveRoom = useRoomStore((s) => s.archiveRoom);
  const [inviteCode, setInviteCode] = useState(room.inviteCode);
  const [copied, setCopied] = useState(false);
  const isOwner = user?.id === room.ownerId;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    if (!user) return;
    const res = await roomsApi.regenerateInvite(room.id, user.id);
    setInviteCode(res.inviteCode);
  };

  return (
    <div className="sh-room-settings-overlay" onClick={onClose}>
      <div className="sh-room-settings" onClick={(e) => e.stopPropagation()}>
        <h3>Room Settings</h3>
        <button className="sh-room-settings__close" onClick={onClose}>&times;</button>

        <div className="sh-room-settings__section">
          <label>Invite Code</label>
          <div className="sh-room-settings__invite">
            <code>{inviteCode}</code>
            <button onClick={copyInvite}>{copied ? "Copied!" : "Copy"}</button>
            {isOwner && <button onClick={handleRegenerate}>Regenerate</button>}
          </div>
        </div>

        <div className="sh-room-settings__section">
          <label>Members ({room.memberIds?.length || 0})</label>
          <p style={{ color: "var(--muted)", fontSize: "var(--text-sm)" }}>
            {room.settings?.isPublic ? "Public room" : "Private room"} &middot; Max {room.settings?.maxMembers || 50}
          </p>
        </div>

        <div className="sh-room-settings__actions">
          <button
            className="sh-room-settings__btn sh-room-settings__btn--danger"
            onClick={() => { if (user) leaveRoom(room.id, user.id); onClose(); }}
          >
            Leave Room
          </button>
          {isOwner && (
            <>
              <button
                className="sh-room-settings__btn sh-room-settings__btn--danger"
                onClick={() => { if (user) archiveRoom(room.id, user.id); onClose(); }}
              >
                Archive Room
              </button>
              <button
                className="sh-room-settings__btn sh-room-settings__btn--danger"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete Room
              </button>
            </>
          )}
        </div>
      </div>
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onConfirm={() => { setShowDeleteConfirm(false); if (user) { deleteRoom(room.id, user.id); onClose(); } }}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Delete Room"
        message="Delete this room permanently? This action cannot be undone."
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
}
