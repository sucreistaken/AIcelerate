import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Info, Plus, Search, SearchX, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { serversApi } from "../../../services/collabApi";
import { useServerStore } from "../../../stores/serverStore";
import { useProfileStore } from "../../../stores/profileStore";
import { t } from "../../../utils/i18n";
import type { StudyServer } from "../../../types";
import LobbyChat from "../chat/LobbyChat";

interface Props {
  onCreateServer?: () => void;
}

export default function ServerDiscovery({ onCreateServer }: Props) {
  const [search, setSearch] = useState("");
  const [servers, setServers] = useState<StudyServer[]>([]);
  const [loading, setLoading] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeTab, setActiveTab] = useState<"discover" | "chat">("discover");

  const profile = useProfileStore((s) => s.profile);
  const userServers = useServerStore((s) => s.servers);
  const joinPublicServer = useServerStore((s) => s.joinPublicServer);
  const selectServer = useServerStore((s) => s.selectServer);

  const fetchServers = useCallback(async (query?: string) => {
    setLoading(true);
    try {
      const results = await serversApi.discover(query || undefined);
      setServers(results);
      setHasSearched(true);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const handleSearch = () => {
    fetchServers(search.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleJoin = async (server: StudyServer) => {
    if (!profile) return;
    setJoiningId(server.id);
    try {
      await joinPublicServer(server.id);
      await selectServer(server.id);
      toast.success(`${server.name} ${t("studyHub.joinedRoom")}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("studyHub.joinFailed");
      toast.error(msg || t("studyHub.joinFailed"));
    } finally {
      setJoiningId(null);
    }
  };

  const isAlreadyMember = (serverId: string) => userServers.some((s) => s.id === serverId);

  const hasNoServers = userServers.length === 0;

  return (
    <div className="sh-main-content">
      <div className="sh-discovery">
        {/* Welcome header */}
        <motion.div
          className="sh-discovery__header"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="sh-discovery__welcome-icon" aria-hidden="true">
            <Sparkles size={22} strokeWidth={1.5} />
          </div>
          <h2 className="sh-discovery__title">
            {hasNoServers ? t("studyHub.welcomeTitle") : t("studyHub.homeTitle")}
          </h2>
          <p className="sh-discovery__subtitle">
            {hasNoServers ? t("studyHub.discoveryDesc") : t("studyHub.discoveryDescAlt")}
          </p>
        </motion.div>

        {/* Primary action stack — shown when the user has no servers */}
        {hasNoServers && (
          <motion.div
            className="sh-discovery__actions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <button
              type="button"
              className="sh-action-card sh-action-card--primary"
              onClick={onCreateServer}
            >
              <div className="sh-action-card__icon" aria-hidden="true">
                <Plus size={18} strokeWidth={1.75} />
              </div>
              <div className="sh-action-card__content">
                <h3 className="sh-action-card__title">{t("studyHub.createRoom")}</h3>
                <p className="sh-action-card__desc">{t("studyHub.createRoomDesc")}</p>
              </div>
              <ArrowRight className="sh-action-card__arrow" size={16} strokeWidth={1.75} aria-hidden="true" />
            </button>

            <div className="sh-onboarding-hint" role="note">
              <div className="sh-onboarding-hint__icon" aria-hidden="true">
                <Info size={14} strokeWidth={1.75} />
              </div>
              <div className="sh-onboarding-hint__text">
                <strong>{t("studyHub.howItWorks")}</strong> {t("studyHub.howItWorksText")}
              </div>
            </div>
          </motion.div>
        )}

        {/* Quick bar — shown when the user already has servers */}
        {!hasNoServers && (
          <motion.div
            className="sh-discovery__quick-bar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <button type="button" className="sh-quick-btn" onClick={onCreateServer}>
              <span className="sh-quick-btn__icon" aria-hidden="true">
                <Plus size={14} strokeWidth={2} />
              </span>
              <span>{t("studyHub.createRoom")}</span>
            </button>
          </motion.div>
        )}

        {/* Tab bar */}
        <div className="sh-discovery__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "discover"}
            className={`sh-discovery__tab ${activeTab === "discover" ? "sh-discovery__tab--active" : ""}`}
            onClick={() => setActiveTab("discover")}
          >
            {t("studyHub.tabDiscover")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "chat"}
            className={`sh-discovery__tab ${activeTab === "chat" ? "sh-discovery__tab--active" : ""}`}
            onClick={() => setActiveTab("chat")}
          >
            {t("studyHub.tabChat")}
          </button>
        </div>

        {activeTab === "discover" && (
          <>
            <motion.div
              className="sh-discovery__search-section"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <h3 className="sh-discovery__section-title">{t("studyHub.discoverTitle")}</h3>
              <div className="sh-discovery__search">
                <Search
                  className="sh-discovery__search-icon"
                  size={14}
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <input
                  className="sh-discovery__input"
                  placeholder={t("studyHub.searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  aria-label={t("studyHub.searchPlaceholder")}
                />
                <button
                  type="button"
                  className="sh-discovery__search-btn"
                  onClick={handleSearch}
                  disabled={loading}
                >
                  {loading ? "…" : t("collab.search")}
                </button>
              </div>
            </motion.div>

            <div className="sh-discovery__results">
              <AnimatePresence mode="wait">
                {loading && servers.length === 0 && (
                  <motion.div
                    key="loading"
                    className="sh-discovery__loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="sh-skeleton sh-skeleton--card" />
                    <div className="sh-skeleton sh-skeleton--card" />
                    <div className="sh-skeleton sh-skeleton--card" />
                  </motion.div>
                )}

                {!loading && hasSearched && servers.length === 0 && (
                  <motion.div
                    key="empty"
                    className="sh-discovery__empty"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="sh-discovery__empty-icon" aria-hidden="true">
                      <SearchX size={28} strokeWidth={1.4} />
                    </div>
                    <p className="sh-discovery__empty-title">
                      {search ? t("studyHub.resultsEmpty") : t("studyHub.noPublicRooms")}
                    </p>
                    <p className="sh-discovery__empty-desc">
                      {search ? t("studyHub.tryDifferent") : t("studyHub.createFirstPublic")}
                    </p>
                    {!search && (
                      <button
                        type="button"
                        className="btn btn--primary"
                        onClick={onCreateServer}
                        style={{ marginTop: 16 }}
                      >
                        {t("studyHub.createRoom")}
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {servers.map((server, index) => {
                const isMember = isAlreadyMember(server.id);
                const memberCount = server.memberCount || server.memberIds.length;
                return (
                  <motion.div
                    key={server.id}
                    className="sh-server-card"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.05 }}
                  >
                    <div
                      className="sh-server-card__icon"
                      style={{ background: server.iconColor }}
                      aria-hidden="true"
                    >
                      {server.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="sh-server-card__info">
                      <div className="sh-server-card__name-row">
                        <h3 className="sh-server-card__name">{server.name}</h3>
                        {server.university && (
                          <span className="sh-server-card__university">{server.university}</span>
                        )}
                      </div>
                      {server.description && (
                        <p className="sh-server-card__desc">{server.description}</p>
                      )}
                      <div className="sh-server-card__meta">
                        <span className="sh-server-card__members">
                          {memberCount} {t("studyHub.memberUnit")}
                        </span>
                        {server.tags && server.tags.length > 0 && (
                          <div className="sh-server-card__tags">
                            {server.tags.slice(0, 5).map((tag) => (
                              <span key={tag} className="sh-server-card__tag">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="sh-server-card__action">
                      {isMember ? (
                        <button
                          type="button"
                          className="btn btn--ghost sh-server-card__btn"
                          onClick={() => selectServer(server.id)}
                        >
                          {t("studyHub.go")}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn--primary sh-server-card__btn"
                          onClick={() => handleJoin(server)}
                          disabled={joiningId === server.id}
                        >
                          {joiningId === server.id ? "…" : t("studyHub.join")}
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}

        {activeTab === "chat" && (
          <div className="sh-discovery__lobby">
            <LobbyChat />
          </div>
        )}
      </div>
    </div>
  );
}
