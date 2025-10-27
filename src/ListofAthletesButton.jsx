import { useState } from "react";
import { useNavigate } from "react-router-dom";


export default function ListofAthletesButton({ club, member, state, clubLogo, disabled = false }) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    if (disabled || isLoading) return;
    if (club && member) {
      // Show loading overlay immediately on current page
      setIsLoading(true);
      
      console.log("➡️ Preparing to navigate to /AthletePage with state:", {
        club_id: club.id,
        club_name: club.name_club,
        league_id: state?.league_id,
        member_id: member.id,
        first_name: member.first_name,
        last_name: member.last_name,
        role: member.role_id,
        club_logo: clubLogo,
      });

      // Navigate after a delay to show loading on current page
      setTimeout(() => {
        navigate("/AthletePage", {
          state: {
            club_id: club.id,
            club_name: club.name_club,
            league_id: state?.league_id,
            member_id: member.id,
            first_name: member.first_name,
            last_name: member.last_name,
            role: member.role_id,
            club_logo: clubLogo,
          },
        });
      }, 1500); // 1.5 second delay to show loading
    } else {
      console.log("❌ No club or member found, cannot navigate.");
    }
  };

  return (
    <>
      <button
        type="button"
        className="primary-btn"
        onClick={handleClick}
        disabled={disabled || isLoading}
      >
        {isLoading ? "Loading..." : "List of Athletes"}
      </button>
      
      {isLoading && (
        <div>Loading...</div>
      )}
    </>
  );
}
