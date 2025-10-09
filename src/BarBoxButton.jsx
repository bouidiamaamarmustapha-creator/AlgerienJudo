import { useState } from "react";
    import { useNavigate } from "react-router-dom";
    import { supabase } from "./supabaseClient";

    export default function BarBoxButton() {
  const [activeBox, setActiveBox] = useState(null);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState("");
  const navigate = useNavigate();

      // ✅ This is only used for Federation page
      const federationLogo = "https://example.com/federation-logo.png";
      const federationName = "Algerian Judo Federation";
			const [bgImage, setBgImage] = useState("");
	const [fullscreenData, setFullscreenData] = useState(null);

      // Login handler depending on type
      const handleSubmit = async (target, type) => {
        if (!name || !key) {
          setError("Please enter both Name and Key before continuing.");
          return;
        }

        let tableName = "";
        let nameColumn = "";
        let keyColumn = "";
        if (type === "federation") {
          tableName = "members";
          nameColumn = "last_name";
          keyColumn = "password";
        } else if (type === "league") {
          tableName = "league_members";
          nameColumn = "last_name";
          keyColumn = "password";
        } else if (type === "club") {
          tableName = "club_members";
          nameColumn = "last_name";
          keyColumn = "password";
        }

        const { data, error: supaError } = await supabase
          .from(tableName)
          .select("*")
          .eq(nameColumn, name)
          .eq(keyColumn, key)
          .single();

        if (supaError || !data) {
          setError("❌ Invalid Name or Key. Please try again.");
          return;
        }

        setError("");

        // Pass extra info for Federation, League, Club pages
        let extraData = {};
        if (type === "federation") {
          extraData = { federationLogo, federationName };
        } else if (type === "league") {
          extraData = { league_id: data.league_id, logo_url: data.logo_url };
        } else if (type === "club") {
          // ✅ Now passing both club_id and league_id
          extraData = {
            club_id: data.club_id,
            league_id: data.league_id,
            logo_url: data.logo_url,
          };
        }

        navigate(target, { state: { ...data, ...extraData } });
      };

      const handleAddMember = (target) => {
        navigate(target);
      };

      const resetBox = () => {
        setActiveBox(null);
        setName("");
        setKey("");
        setError("");
      };

      // Modal handlers
      const openModal = (type) => {
        setModalType(type);
        setIsModalOpen(true);
        setActiveBox(type);
        setError("");
        setName("");
        setKey("");
      };

      const closeModal = () => {
        setIsModalOpen(false);
        setModalType("");
        setActiveBox(null);
        setError("");
        setName("");
        setKey("");
      };

      const renderBox = (type, label, addPath, btnClass = "secondary-btn") => (
        <div className="login-box">
          <button className={btnClass} onClick={() => openModal(type)}>
            {label}
          </button>
        </div>
      );

return (
    <>
      {/* Login Buttons */}
      <div className="gorgeous-buttons-layout horizontal-buttons-container">
        <div className="gorgeous-button-wrapper">
          {renderBox("federation", "Federation Account", "/AddMemberPage", "gorgeous-green-btn")}
        </div>
        <div className="gorgeous-button-wrapper">
          {renderBox("league", "League Account", "/AddMemberLeague", "gorgeous-green-btn")}
        </div>
        <div className="gorgeous-button-wrapper">
          {renderBox("club", "Amateur Sports Club", "/AddMemberClub", "gorgeous-green-btn")}
        </div>
      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>
              ×
            </button>
            <div className="login-box">
              <h3 style={{ marginBottom: '1rem', color: '#15803d', textAlign: 'center' }}>
                {modalType === "federation" ? "Federation Account Login" : 
                 modalType === "league" ? "League Account Login" : 
                 "Amateur Sports Club Login"}
              </h3>
              <input
                type="text"
                placeholder="Enter Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field mb-2"
              />
              <input
                type="password"
                placeholder="Enter Key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="input-field mb-2"
              />
              {error && <p className="error-text">{error}</p>}
              <div className="btn-row mt-2 flex gap-2">
                <button
                  className="primary-btn"
                  onClick={() =>
                    handleSubmit(
                      `/${modalType === "federation" ? "FederationPage" : modalType === "league" ? "LeaguePage" : "AmateurSportsClubPage"}`,
                      modalType
                    )
                  }
                >
                  Login
                </button>
                <button className="secondary-btn" onClick={() => handleAddMember(
                  modalType === "federation" ? "/AddMemberPage" : 
                  modalType === "league" ? "/AddMemberLeague" : 
                  "/AddMemberClub"
                )}>
                  ➕ Add Member
                </button>
                <button className="secondary-btn" onClick={closeModal}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
