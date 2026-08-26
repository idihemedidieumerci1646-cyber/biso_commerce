
"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

export default function IosInstallPrompt() {
  const [show, setShow] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const userAgent = navigator.userAgent || navigator.vendor || "";

    const detectedIOS =
      /iPhone|iPad|iPod/i.test(userAgent) ||
      (navigator.platform === "MacIntel" &&
        navigator.maxTouchPoints > 1);

    const detectedAndroid = /Android/i.test(userAgent);

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone ===
        true;

    setIsIOS(detectedIOS);
    setIsAndroid(detectedAndroid);

    // Si l'application est déjà installée
    if (isStandalone) {
      return;
    }

    /*
     * Ancien système de mémorisation.
     * On le supprime pour utiliser le nouveau système.
     */
    localStorage.removeItem("biso-ios-install-prompt");

    /*
     * Fermeture définitive.
     */
    const permanentlyClosed =
      localStorage.getItem("biso-install-closed") === "true";

    if (permanentlyClosed) {
      return;
    }

    /*
     * Vérification du bouton "Plus tard".
     */
    const postponedAt = localStorage.getItem(
      "biso-install-postponed"
    );

    if (postponedAt) {
      const postponedDate = Number(postponedAt);
      const now = Date.now();

      const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;

      if (
        Number.isFinite(postponedDate) &&
        now - postponedDate < THREE_DAYS
      ) {
        return;
      }

      localStorage.removeItem("biso-install-postponed");
    }

    /*
     * Android :
     * on récupère la possibilité d'installation native
     * fournie par le navigateur.
     */
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();

      const deferredEvent = event as BeforeInstallPromptEvent;

      setInstallPrompt(deferredEvent);

      /*
       * On affiche la popup seulement sur Android.
       */
      if (detectedAndroid) {
        window.setTimeout(() => {
          setShow(true);

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setVisible(true);
            });
          });
        }, 1200);
      }
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    );

    /*
     * iPhone/iPad :
     * il n'y a pas de beforeinstallprompt.
     * On affiche donc directement les instructions.
     */
    let iosTimer: number | undefined;

    if (detectedIOS) {
      iosTimer = window.setTimeout(() => {
        setShow(true);

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setVisible(true);
          });
        });
      }, 1200);
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );

      if (iosTimer) {
        window.clearTimeout(iosTimer);
      }
    };
  }, []);

  /*
   * Installation Android.
   */
  const installAndroid = async () => {
    if (!installPrompt) {
      return;
    }

    try {
      setInstalling(true);

      await installPrompt.prompt();

      const choice = await installPrompt.userChoice;

      if (choice.outcome === "accepted") {
        setVisible(false);

        window.setTimeout(() => {
          localStorage.setItem(
            "biso-install-closed",
            "true"
          );

          setShow(false);
          setInstallPrompt(null);
        }, 250);
      }
    } catch {
      // Rien de bloquant si le navigateur refuse l'installation.
    } finally {
      setInstalling(false);
    }
  };

  /*
   * Fermeture définitive.
   */
  const closePermanently = () => {
    setVisible(false);

    window.setTimeout(() => {
      localStorage.setItem(
        "biso-install-closed",
        "true"
      );

      localStorage.removeItem(
        "biso-install-postponed"
      );

      setShow(false);
    }, 250);
  };

  /*
   * "Plus tard" :
   * la popup revient après 3 jours.
   */
  const postponeInstall = () => {
    setVisible(false);

    window.setTimeout(() => {
      localStorage.setItem(
        "biso-install-postponed",
        Date.now().toString()
      );

      setShow(false);
    }, 250);
  };

  if (!show) return null;

  return (
    <>
      <style jsx>{`
        @keyframes bisoBackdropIn {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        @keyframes bisoSheetIn {
          from {
            opacity: 0;
            transform: translateY(35px) scale(0.97);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes bisoIconPulse {
          0%,
          100% {
            transform: scale(1);
          }

          50% {
            transform: scale(1.04);
          }
        }

        @keyframes bisoArrow {
          0%,
          100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-3px);
          }
        }

        .biso-backdrop {
          animation: bisoBackdropIn 0.25s ease-out forwards;
        }

        .biso-sheet {
          animation: bisoSheetIn 0.35s
            cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .biso-sheet-hidden {
          opacity: 0;
          transform: translateY(35px) scale(0.97);
        }

        .biso-install-icon {
          animation: bisoIconPulse 2.4s ease-in-out infinite;
        }

        .biso-share-arrow {
          animation: bisoArrow 1.8s ease-in-out infinite;
        }

        .biso-install-button {
          transition:
            transform 0.15s ease,
            box-shadow 0.15s ease;
        }

        .biso-install-button:active {
          transform: scale(0.98);
        }

        @media (max-width: 360px) {
          .biso-sheet-content {
            padding: 20px 16px !important;
          }

          .biso-title {
            font-size: 20px !important;
          }

          .biso-description {
            font-size: 13px !important;
          }

          .biso-step-text {
            font-size: 13px !important;
          }

          .biso-step {
            gap: 10px !important;
          }
        }

        @media (min-width: 600px) {
          .biso-sheet {
            margin-bottom: 20px;
          }
        }
      `}</style>

      <div
        className="biso-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="biso-install-title"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 99999,
          background: "rgba(15, 23, 42, 0.64)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          padding: "12px",
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closePermanently();
          }
        }}
      >
        <div
          className={`biso-sheet ${
            visible ? "" : "biso-sheet-hidden"
          }`}
          style={{
            width: "100%",
            maxWidth: "470px",
            maxHeight: "calc(100vh - 24px)",
            overflowY: "auto",
            background: "#ffffff",
            borderRadius: "30px",
            overflowX: "hidden",
            boxShadow:
              "0 30px 80px rgba(0,0,0,0.30), 0 10px 30px rgba(15,61,145,0.12)",
            transition:
              "opacity 0.25s ease, transform 0.25s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          {/* Barre supérieure */}
          <div
            style={{
              height: "5px",
              width: "100%",
              background:
                "linear-gradient(90deg, #0f3d91 0%, #2563eb 50%, #60a5fa 100%)",
            }}
          />

          <div
            className="biso-sheet-content"
            style={{
              padding: "24px 22px 20px",
            }}
          >
            {/* En-tête */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "16px",
              }}
            >
              <div
                className="biso-install-icon"
                style={{
                  width: "60px",
                  height: "60px",
                  minWidth: "60px",
                  borderRadius: "19px",
                  background:
                    "linear-gradient(145deg, #eef4ff 0%, #dbeafe 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow:
                    "inset 0 0 0 1px rgba(37,99,235,0.08)",
                }}
              >
                {isIOS ? (
                  /* Icône iPhone */
                  <svg
                    width="31"
                    height="31"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <rect
                      x="6"
                      y="2.8"
                      width="12"
                      height="18.4"
                      rx="2.6"
                      stroke="#0f3d91"
                      strokeWidth="1.8"
                    />

                    <path
                      d="M10 18.2h4"
                      stroke="#0f3d91"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />

                    <path
                      d="M12 6v6"
                      stroke="#2563eb"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />

                    <path
                      d="m9.5 8.5 2.5-2.5 2.5 2.5"
                      stroke="#2563eb"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  /* Icône Android */
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M7 9.5h10v7.2a1.8 1.8 0 0 1-1.8 1.8H8.8A1.8 1.8 0 0 1 7 16.7V9.5Z"
                      stroke="#0f3d91"
                      strokeWidth="1.7"
                    />

                    <path
                      d="M9 9.5 7.7 6.8M15 9.5l1.3-2.7"
                      stroke="#2563eb"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />

                    <path
                      d="M8 6.7a5 5 0 0 1 8 0"
                      stroke="#2563eb"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />

                    <circle
                      cx="10"
                      cy="11.8"
                      r="0.8"
                      fill="#0f3d91"
                    />

                    <circle
                      cx="14"
                      cy="11.8"
                      r="0.8"
                      fill="#0f3d91"
                    />
                  </svg>
                )}
              </div>

              {/* Fermer */}
              <button
                type="button"
                onClick={closePermanently}
                aria-label="Fermer"
                style={{
                  width: "37px",
                  height: "37px",
                  border: "none",
                  borderRadius: "50%",
                  background: "#f8fafc",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M6 6l12 12M18 6 6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {/* Titre */}
            <div style={{ marginTop: "18px" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "6px 10px",
                  borderRadius: "999px",
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  fontSize: "11px",
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                Biso-Commerce
              </div>

              <h2
                id="biso-install-title"
                className="biso-title"
                style={{
                  margin: "10px 0 0",
                  fontSize: "23px",
                  lineHeight: 1.2,
                  fontWeight: 800,
                  letterSpacing: "-0.025em",
                  color: "#0f172a",
                }}
              >
                Installez Biso-Commerce
              </h2>

              <p
                className="biso-description"
                style={{
                  margin: "9px 0 0",
                  fontSize: "14px",
                  lineHeight: 1.6,
                  color: "#64748b",
                }}
              >
                Utilisez Biso-Commerce directement depuis votre
                écran d'accueil, comme une vraie application.
              </p>
            </div>

            {/* ========================= */}
            {/* ANDROID */}
            {/* ========================= */}

            {isAndroid && (
              <div style={{ marginTop: "20px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "14px",
                    borderRadius: "16px",
                    background:
                      "linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      minWidth: "42px",
                      borderRadius: "12px",
                      background: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 3px 10px rgba(15,23,42,0.06)",
                    }}
                  >
                    <svg
                      width="23"
                      height="23"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M12 4v11"
                        stroke="#2563eb"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />

                      <path
                        d="m7.5 10 4.5 5 4.5-5"
                        stroke="#2563eb"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      <path
                        d="M5 19h14"
                        stroke="#0f3d91"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 800,
                        color: "#0f172a",
                      }}
                    >
                      Installation rapide
                    </div>

                    <div
                      style={{
                        marginTop: "3px",
                        fontSize: "12px",
                        lineHeight: 1.4,
                        color: "#64748b",
                      }}
                    >
                      Ajoutez Biso-Commerce à votre écran
                      d'accueil.
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={installAndroid}
                  disabled={!installPrompt || installing}
                  className="biso-install-button"
                  style={{
                    width: "100%",
                    minHeight: "53px",
                    marginTop: "16px",
                    border: "none",
                    borderRadius: "15px",
                    background:
                      !installPrompt || installing
                        ? "#94a3b8"
                        : "linear-gradient(135deg, #0f3d91 0%, #1d4ed8 100%)",
                    color: "#ffffff",
                    fontSize: "15px",
                    fontWeight: 800,
                    cursor:
                      !installPrompt || installing
                        ? "default"
                        : "pointer",
                    boxShadow:
                      !installPrompt || installing
                        ? "none"
                        : "0 9px 22px rgba(29,78,216,0.22)",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {installing
                    ? "Installation..."
                    : installPrompt
                      ? "Installer maintenant"
                      : "Installation disponible dans le navigateur"}
                </button>

                {!installPrompt && (
                  <p
                    style={{
                      margin: "10px 4px 0",
                      textAlign: "center",
                      fontSize: "12px",
                      lineHeight: 1.45,
                      color: "#64748b",
                    }}
                  >
                    Si le bouton d'installation n'est pas
                    disponible, ouvrez le menu de votre navigateur
                    et choisissez{" "}
                    <strong style={{ color: "#334155" }}>
                      Ajouter à l'écran d'accueil
                    </strong>
                    .
                  </p>
                )}
              </div>
            )}

            {/* ========================= */}
            {/* IPHONE / IPAD */}
            {/* ========================= */}

            {isIOS && (
              <div
                style={{
                  marginTop: "20px",
                }}
              >
                {/* Étape 1 */}
                <div
                  className="biso-step"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "13px",
                    padding: "11px 0",
                  }}
                >
                  <div
                    style={{
                      width: "39px",
                      height: "39px",
                      minWidth: "39px",
                      borderRadius: "12px",
                      background: "#eff6ff",
                      color: "#1d4ed8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "15px",
                      fontWeight: 800,
                    }}
                  >
                    1
                  </div>

                  <div
                    className="biso-step-text"
                    style={{
                      flex: 1,
                      fontSize: "14px",
                      lineHeight: 1.45,
                      color: "#334155",
                    }}
                  >
                    Appuyez sur{" "}
                    <strong style={{ color: "#0f172a" }}>
                      Partager
                    </strong>{" "}
                    dans Safari.

                    <span
                      className="biso-share-arrow"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginLeft: "6px",
                        width: "25px",
                        height: "25px",
                        borderRadius: "7px",
                        background: "#f1f5f9",
                        color: "#2563eb",
                        verticalAlign: "middle",
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M12 16V4"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />

                        <path
                          d="m7 9 5-5 5 5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        <path
                          d="M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                  </div>
                </div>

                {/* Étape 2 */}
                <div
                  className="biso-step"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "13px",
                    padding: "11px 0",
                  }}
                >
                  <div
                    style={{
                      width: "39px",
                      height: "39px",
                      minWidth: "39px",
                      borderRadius: "12px",
                      background: "#eff6ff",
                      color: "#1d4ed8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "15px",
                      fontWeight: 800,
                    }}
                  >
                    2
                  </div>

                  <div
                    className="biso-step-text"
                    style={{
                      flex: 1,
                      fontSize: "14px",
                      lineHeight: 1.45,
                      color: "#334155",
                    }}
                  >
                    Choisissez{" "}
                    <strong style={{ color: "#0f172a" }}>
                      Ajouter à l'écran d'accueil
                    </strong>
                    .
                  </div>
                </div>

                {/* Étape 3 */}
                <div
                  className="biso-step"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "13px",
                    padding: "11px 0",
                  }}
                >
                  <div
                    style={{
                      width: "39px",
                      height: "39px",
                      minWidth: "39px",
                      borderRadius: "12px",
                      background: "#eff6ff",
                      color: "#1d4ed8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "15px",
                      fontWeight: 800,
                    }}
                  >
                    3
                  </div>

                  <div
                    className="biso-step-text"
                    style={{
                      flex: 1,
                      fontSize: "14px",
                      lineHeight: 1.45,
                      color: "#334155",
                    }}
                  >
                    Appuyez sur{" "}
                    <strong style={{ color: "#0f172a" }}>
                      Ajouter
                    </strong>{" "}
                    pour terminer.
                  </div>
                </div>

                {/* Conseil iPhone */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "9px",
                    marginTop: "10px",
                    padding: "12px",
                    borderRadius: "14px",
                    background: "#f8fafc",
                    border: "1px solid #f1f5f9",
                  }}
                >
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="#64748b"
                      strokeWidth="1.8"
                    />

                    <path
                      d="M12 10.5v5"
                      stroke="#64748b"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />

                    <circle
                      cx="12"
                      cy="7.5"
                      r="1"
                      fill="#64748b"
                    />
                  </svg>

                  <span
                    style={{
                      fontSize: "12px",
                      lineHeight: 1.45,
                      color: "#64748b",
                    }}
                  >
                    Sur iPhone, l'installation se fait depuis
                    Safari. Aucun téléchargement depuis l'App
                    Store n'est nécessaire.
                  </span>
                </div>
              </div>
            )}

            {/* ========================= */}
            {/* BOUTONS */}
            {/* ========================= */}

            <div style={{ marginTop: "20px" }}>
              <button
                type="button"
                onClick={closePermanently}
                style={{
                  width: "100%",
                  minHeight: "52px",
                  border: "none",
                  borderRadius: "15px",
                  background:
                    "linear-gradient(135deg, #0f3d91 0%, #1d4ed8 100%)",
                  color: "#ffffff",
                  fontSize: "15px",
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow:
                    "0 8px 20px rgba(29,78,216,0.20)",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                J'ai compris
              </button>

              <button
                type="button"
                onClick={postponeInstall}
                style={{
                  width: "100%",
                  minHeight: "43px",
                  marginTop: "3px",
                  border: "none",
                  background: "transparent",
                  color: "#64748b",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                Plus tard
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
