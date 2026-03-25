import { motion, AnimatePresence } from "framer-motion";
import { useCreateServer } from "./useCreateServer";
import PurposeStep from "./create-server/PurposeStep";
import DetailsStep from "./create-server/DetailsStep";
import PreviewStep from "./create-server/PreviewStep";
import JoinTab from "./create-server/JoinTab";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CreateServerModal({ open, onClose }: Props) {
  const {
    tab, setTab,
    step, setStep,
    selectedTemplate,
    name, setName,
    description, setDescription,
    color, setColor,
    university, setUniversity,
    tagsInput, setTagsInput,
    isPublic, setIsPublic,
    inviteCode, setInviteCode,
    error, setError,
    loading,
    currentTemplate,
    handleClose,
    handleSelectTemplate,
    handleCreate,
    handleJoin,
  } = useCreateServer(onClose);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="modal"
            initial={{ scale: 0.85, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.85, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 500 }}
          >
            <div className="sh-modal-tabs" style={{ position: "relative" }}>
              <button
                className={`sh-modal-tab ${tab === "create" ? "sh-modal-tab--active" : ""}`}
                onClick={() => { setTab("create"); setError(""); setStep("purpose"); }}
              >
                Oda Oluştur
                {tab === "create" && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="sh-modal-tab__indicator"
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 2,
                      background: "var(--accent-2)",
                      borderRadius: 1,
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  />
                )}
              </button>
              <button
                className={`sh-modal-tab ${tab === "join" ? "sh-modal-tab--active" : ""}`}
                onClick={() => { setTab("join"); setError(""); }}
              >
                Odaya Katıl
                {tab === "join" && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="sh-modal-tab__indicator"
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 2,
                      background: "var(--accent-2)",
                      borderRadius: 1,
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  />
                )}
              </button>
            </div>

            {tab === "create" ? (
              <>
                {step === "purpose" && <PurposeStep onSelectTemplate={handleSelectTemplate} />}
                {step === "details" && (
                  <DetailsStep
                    name={name} setName={setName}
                    description={description} setDescription={setDescription}
                    university={university} setUniversity={setUniversity}
                    tagsInput={tagsInput} setTagsInput={setTagsInput}
                    color={color} setColor={setColor}
                    isPublic={isPublic} setIsPublic={setIsPublic}
                    selectedTemplate={selectedTemplate}
                    error={error} loading={loading}
                    setStep={setStep} handleClose={handleClose} handleCreate={handleCreate}
                  />
                )}
                {step === "preview" && (
                  <PreviewStep
                    name={name} color={color} isPublic={isPublic}
                    currentTemplate={currentTemplate}
                    error={error} loading={loading}
                    setStep={setStep} handleClose={handleClose} handleCreate={handleCreate}
                  />
                )}
              </>
            ) : (
              <JoinTab
                inviteCode={inviteCode} setInviteCode={setInviteCode}
                error={error} loading={loading}
                handleClose={handleClose} handleJoin={handleJoin}
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
