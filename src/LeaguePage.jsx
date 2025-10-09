import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navigation from "./Navigation";
import BackHomeButton from "./BackHomeButton";
import { supabase } from "./supabaseClient";
import logo from "./assets/logo.png";
import ErrorOverlay from "./components/ErrorOverlay";
import SuccessOverlay from "./components/SuccessOverlay";
import BarLoading from './components/BarLoading';
import { initializePrimaryButtons, handlePrimaryButtonClick } from './primaryButtonHandler';

export default function LeaguePage() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [leagueName, setLeagueName] = useState("");
  const [federationLogo, setFederationLogo] = useState(null);
  const [federationName, setFederationName] = useState("Algerian Judo Federation");
  const [league, setLeague] = useState(null);

  // New state for clubs and member
  const [clubs, setClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState(null);
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const federationLogoPlaceholder = logo;
//Initialize in useEffect button: 
useEffect(() => {
  initializePrimaryButtons();
}, []);
  // fetch federation logo
useEffect(() => {
  const fetchLatestLogo = async () => {
    const { data, error } = await supabase
      .from("logo")
      .select("logo_url")
      .order("created_at", { ascending: false })
      .limit(1);

    if (!error && data.length > 0) {
      setFederationLogo(data[0].logo_url);
    }
  };

  fetchLatestLogo();
}, []);

// fetch league info and associated clubs
useEffect(() => {
  if (!state?.league_id) return;

  setMember(state); // Set the logged-in member from location state

  const getLeagueInfoAndClubs = async () => {
    // Fetch league info
    const { data: leagueData, error: leagueError } = await supabase
      .from("nameleague")
      .select("*")
      .eq("id", state.league_id)
      .single();

    if (!leagueError && leagueData) {
      setLeagueName(leagueData.name_league);
      setLeague(leagueData);
    }

    // ✅ Get first club_id from club_members in this league
    const { data: firstMember, error: firstMemberError } = await supabase
      .from("club_members")
      .select("club_id")
      .eq("league_id", state.league_id)
      .limit(1)
      .single();

    if (!firstMemberError && firstMember) {
      const { data: firstClub, error: firstClubError } = await supabase
        .from("nameclub")
        .select("*")
        .eq("id", firstMember.club_id)
        .single();

      if (!firstClubError && firstClub) {
        setSelectedClub(firstClub);
      }
    }

    // Fetch clubs for this league
    const { data: clubsData, error: clubsError } = await supabase
      .from("nameclub")
      .select("*")
      .eq("league_id", state.league_id);

    if (!clubsError && clubsData) {
      setClubs(clubsData);
    } else {
      console.error("Error fetching clubs:", clubsError);
    }
  };

    getLeagueInfoAndClubs();
  }, [state]);

  // Initialize primary buttons functionality
  useEffect(() => {
    initializePrimaryButtons();
  }, []);

  const handleClubChange = (e) => {
    const clubId = e.target.value;
    if (clubId) {
      const club = clubs.find((c) => c.id === parseInt(clubId));
      setSelectedClub(club);
    } else {
      setSelectedClub(null);
    }
  };

  if (!state) return <p>No account data found.</p>;

  return (
    <div className="app-container">
      {loading && <BarLoading />}
      
      <header>{/* HEADER Fédération + League */}
        <div className="federation-header">
          {/* Federation row */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {federationLogo ? (
              <img
                src={federationLogo}
                alt="Federation Logo"
                className="federation-logo"
              />
            ) : (
              <img
                src={federationLogoPlaceholder}
                alt="Default Federation Logo"
                className="federation-logo"
              />
            )}
            <h1 className="federation-title">
              {federationName || "Algerian Judo Federation"}
            </h1>
          </div>

          {/* League row */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {state.logo_url ? (
              <img
                src={state.logo_url}
                alt="League Logo"
                className="member-logo"
              />
            ) : null}
            <h2 className="federation-title" style={{ fontSize: "1.5rem" }}>
              {leagueName || "League Name"}
            </h2>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <section className="content">
        <h2>
          Welcome {state.first_name} {state.last_name}
        </h2>
        <p>
          <strong>Role:</strong> {state.role}
        </p>

        <BackHomeButton />
				
        {/* ✅ UPDATED BUTTON:  */}
       <button
  className="primary-btn" 
  onClick={async (e) => {
    // Highlight clicked button
    handlePrimaryButtonClick(e.currentTarget);

    if (!league) {
      alert("League data not loaded yet.");
      return;
    }

    navigate("/member-list-l", {
      state: {
        ...state,
        league_id: league?.id,
        league_name: league?.name_league,
        league_logo: league?.logo_url,
      },
    });
  }}
>
  The League Member List
</button>

<button
  className="primary-btn" 
  onClick={async (e) => {
    // Highlight clicked button
    handlePrimaryButtonClick(e.currentTarget);

    if (!league) {
      alert("League data not loaded yet.");
      return;
    }

    navigate("/TheClubListAddFed-League", {
      state: {
        ...state,
        league_id: league?.id,
        league_name: league?.name_league,
        league_logo: league?.logo_url,
      },
    });
  }}
>
  The Club Member List
</button>

<button
  className="primary-btn" 
  onClick={async (e) => {
    // Highlight clicked button
    handlePrimaryButtonClick(e.currentTarget);

    if (!league) {
      alert("League data not loaded yet.");
      return;
    }

    navigate("/TheAthleteListAdd-League", {
      state: {
        ...state,
        league_id: league?.id,
        league_name: league?.name_league,
        league_logo: league?.logo_url,
      },
    });
  }}
>
  The Athlete List Add
</button>


       
      </section>

      {/* Transparent Error/Success Overlay System */}
      {error && (
        <ErrorOverlay 
          error={error} 
          onClose={() => setError("")} 
        />
      )}
      {success && (
        <SuccessOverlay 
          success={success} 
          onClose={() => setSuccess("")} 
        />
      )}

      {/* NAVIGATION */}
      <Navigation />

      {/* FOOTER */}
      <footer className="footer" style={{ backgroundColor: "red" }}>
        <p>&copy; 2025 Algerian Judo Federation. All rights reserved.</p>
      </footer>
    </div>
  );
}
