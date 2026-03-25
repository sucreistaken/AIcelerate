interface Props {
  inviteCode: string;
  setInviteCode: (v: string) => void;
  error: string;
  loading: boolean;
  handleClose: () => void;
  handleJoin: () => void;
}

export default function JoinTab({
  inviteCode, setInviteCode,
  error, loading,
  handleClose, handleJoin,
}: Props) {
  return (
    <>
      <div className="mb-4">
        <label className="sh-label">Davet Kodu</label>
        <input
          className="input w-full"
          placeholder="Ör: ABC123"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          maxLength={6}
          style={{ textTransform: "uppercase", letterSpacing: 4, fontSize: "1.2em", textAlign: "center" }}
        />
      </div>

      {error && <p style={{ color: "var(--danger)", marginBottom: 12 }}>{error}</p>}

      <div className="sh-modal-actions">
        <button className="btn btn--ghost" onClick={handleClose}>İptal</button>
        <button
          className="btn btn--primary"
          onClick={handleJoin}
          disabled={inviteCode.length < 4 || loading}
        >
          {loading ? "Katılınıyor..." : "Katıl"}
        </button>
      </div>
    </>
  );
}
