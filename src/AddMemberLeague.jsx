import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Shield } from "lucide-react";
import logo from "./assets/logo.png"; 
import { supabase } from "./supabaseClient";
import Navigation from "./Navigation";
import BackHomeButton from "./BackHomeButton";
import ErrorOverlay from "./components/ErrorOverlay";
import SuccessOverlay from "./components/SuccessOverlay";
import BarLoading from "./components/BarLoading";
import CircleLoading from "./components/CircleLoading";

export default function AddMemberLeague() {
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [dob, setDob] = useState("");
  const [pob, setPob] = useState("");
  const [roleId, setRoleId] = useState("");
  const [roles, setRoles] = useState([]);
  const [bloodType, setBloodType] = useState("");
  const [nid, setNid] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedLeagueId, setSelectedLeagueId] = useState("");
  const [leagues, setLeagues] = useState([]);
  const [logoFile, setLogoFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [nationality, setNationality] = useState("");
  const [holderOf, setHolderOf] = useState("");
  const [grade, setGrade] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [federationLogo, setFederationLogo] = useState(null);
  const [federationName, setFederationName] = useState("Algerian Judo Federation");
  const [members, setMembers] = useState([]);
  const [leagueLogo, setLeagueLogo] = useState(null);
  const [selectedLeague, setSelectedLeague] = useState("");
  const [leagueName, setLeagueName] = useState("");

  const navigate = useNavigate();
  const { state } = useLocation();
  const federationLogoPlaceholder = logo;

  // Helper function to get logo URL
  const getLogoUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `https://aolsbxfulbvpiobqqsao.supabase.co/storage/v1/object/public/logos/${path}`;
  };

  // ✅ fetch roles (leaguerole)
  useEffect(() => {
    const fetchRoles = async () => {
      const { data, error } = await supabase.from("leaguerole").select("id, league_role");
      if (!error && data) setRoles(data);
    };
    fetchRoles();
  }, []);

  // ✅ fetch leagues
  useEffect(() => {
    const fetchLeagues = async () => {
      const { data, error } = await supabase.from("nameleague").select("id, name_league");
      if (!error && data) setLeagues(data);
    };
    fetchLeagues();
  }, []);

  // ✅ fetch federation logo
  useEffect(() => {
    const fetchLatestLogo = async () => {
      const { data, error } = await supabase
        .from("logo")
        .select("logo_url")
        .order("created_at", { ascending: false })
        .limit(1);
      if (!error && data.length > 0) setFederationLogo(data[0].logo_url);
    };
    fetchLatestLogo();
  }, []);

  // ✅ upload logo to storage and return public URL
  const handleLogoUpload = async () => {
    if (!logoFile) return null;
    const fileExt = logoFile.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage.from("logos").upload(filePath, logoFile);
    if (uploadError) {
      setError(`Upload failed: ${uploadError.message}`);
      return null;
    }

    const { data: urlData } = supabase.storage.from("logos").getPublicUrl(filePath);
    return urlData?.publicUrl ?? null;
  };

  // ------------------ upload helpers ------------------
  const handlePhotoUpload = async () => {
    if (!photoFile || photoFile.size === 0) return "";
    const fileExt = photoFile.name.split(".").pop();
    const fileName = `photo-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from("logos").upload(fileName, photoFile);
    if (uploadError) {
      setError(`Photo upload failed: ${uploadError.message}`);
      return "";
    }
    const { data } = supabase.storage.from("logos").getPublicUrl(fileName);
    return data?.publicUrl ?? "";
  };

  // ------------------ renewal helper (updated for year-based logic) ------------------
  const getNextRenewal = async (nidVal, leagueIdVal, roleVal, currentSeasonYear) => {
    // Check if member already exists in current year
    const { data: existingInCurrentYear } = await supabase
      .from("league_members")
      .select("*")
      .eq("national_id_number", nidVal)
      .eq("league_id", leagueIdVal)
      .eq("role", roleVal)
      .eq("year", currentSeasonYear);
    
    if (existingInCurrentYear && existingInCurrentYear.length > 0) {
      throw new Error("This member is already registered for the current season with the same role and league.");
    }

    // Count total registrations across all years for this combination
    const { count } = await supabase
      .from("league_members")
      .select("*", { count: "exact", head: true })
      .eq("national_id_number", nidVal)
      .eq("league_id", leagueIdVal)
      .eq("role", roleVal);
    
    return (count || 0) + 1;
  };

  // ------------------ form submit ------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitLoading(true);

    if (!firstName || !lastName || !dob || !pob || !roleId || !selectedLeagueId || !password || !confirmPassword || !photoFile || !logoFile) {
      const missingFields = [];
      if (!firstName) missingFields.push("First Name");
      if (!lastName) missingFields.push("Last Name");
      if (!dob) missingFields.push("Date of Birth");
      if (!pob) missingFields.push("Place of Birth");
      if (!roleId) missingFields.push("League Role");
      if (!selectedLeagueId) missingFields.push("League (in the table is league_id)");
      if (!password) missingFields.push("Password");
      if (!confirmPassword) missingFields.push("Confirm Password");
      if (!photoFile) missingFields.push("Member Photo");
      if (!logoFile) missingFields.push("League Logo");
      
      setError(`Please fill in the following required fields: ${missingFields.join(", ")}`);
      setSubmitLoading(false);
      return;
    }

    // Additional validation for league_id
    const leagueIdValue = Number(selectedLeagueId);
    if (!leagueIdValue || isNaN(leagueIdValue)) {
      setError("Please select a valid league.");
      setSubmitLoading(false);
      return;
    }
    if (nid.length !== 18) {
      setError("National ID must be exactly 18 digits.");
      setSubmitLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setSubmitLoading(false);
      return;
    }

    // Age validation - member must be more than 21 years old
    const birthDate = new Date(dob);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();
    
    // Adjust age if birthday hasn't occurred this year
    const actualAge = (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) ? age - 1 : age;
    
    if (actualAge <= 21) {
      setError("Member must be more than 21 years old to register.");
      setSubmitLoading(false);
      return;
    }

    // Check if a member with the same last name and password already exists
    try {
      const { data: existingMembers, error: checkError } = await supabase
        .from("league_members")
        .select("id, last_name, password")
        .eq("last_name", lastName)
        .eq("password", password);

      if (checkError) {
        setError(`Failed to validate member data: ${checkError.message}`);
        setSubmitLoading(false);
        return;
      }

      if (existingMembers && existingMembers.length > 0) {
        setError(`A member with the last name "${lastName}" and this password already exists. Please change the password.`);
        setSubmitLoading(false);
        return;
      }
    } catch (err) {
      setError(`Validation error: ${err.message}`);
      setSubmitLoading(false);
      return;
    }

    try {
      const uploadedPhotoUrl = await handlePhotoUpload();
      const uploadedLogoUrl = await handleLogoUpload();
      
      const currentYear = new Date().getFullYear();
      const seasonYear = `${currentYear}/${currentYear + 1}`;
      
      // Convert roleId to role name
    const roleName = roles.find((r) => r.id === parseInt(roleId))?.league_role || "";
    
    // Validate that the role must be "League President"
    if (roleName !== "League President") {
      setError("Only members with the role 'League President' can be submitted.");
      setSubmitLoading(false);
      return;
    }
    
    const renewal = await getNextRenewal(nid, selectedLeagueId, roleName, seasonYear);

      const newMember = {
        last_name: lastName,
        first_name: firstName,
        date_of_birth: dob,
        place_of_birth: pob,
        role: roleName,
        blood_type: bloodType,
        national_id_number: nid,
        password,
        license_number: "LIC-" + Date.now(),
        registration_date: new Date().toISOString().split("T")[0],
        logo_url: uploadedLogoUrl,
        league_id: leagueIdValue,
        // new fields:
        photo_url: uploadedPhotoUrl,
        renewal: renewal,
        year: seasonYear,
        nationality,
        holder_of: holderOf,
        grade,
        confirmation: false,
      };

      const { error: insertError } = await supabase.from("league_members").insert([newMember]);
      if (insertError) {
        setError(`Failed to save member: ${insertError.message}`);
        setSubmitLoading(false);
        return;
      }

      // Optionally update nameleague logo
      if (uploadedLogoUrl && selectedLeagueId) {
        await supabase.from("nameleague").update({ logo_url: uploadedLogoUrl }).eq("id", selectedLeagueId);
      }

      setSuccess(`Member "${firstName} ${lastName}" has been successfully added to the League!`);
      // Reset fields
      setLastName("");
      setFirstName("");
      setDob("");
      setPob("");
      setNid("");
      setPassword("");
      setConfirmPassword("");
      setRoleId("");
      setBloodType("");
      setSelectedLeagueId("");
      setPhotoFile(null);
      setLogoFile(null);
      setNationality("");
      setHolderOf("");
      setGrade("");
      // refresh members for this league
      if (selectedLeagueId) {
        const { data } = await supabase.from("league_members").select("*").eq("league_id", Number(selectedLeagueId));
        setMembers(data || []);
        
        // Also refresh league logo in case it was updated
        const { data: updatedLeagueData } = await supabase
          .from("nameleague")
          .select("logo_url")
          .eq("id", selectedLeagueId)
          .single();
        
        if (updatedLeagueData?.logo_url) {
          setLeagueLogo(getLogoUrl(updatedLeagueData.logo_url));
        }
      }
      setSubmitLoading(false);
    } catch (err) {
      setError(`Unexpected error: ${err.message}`);
      setSubmitLoading(false);
    }
  };

  return (
    <div className="page-container">
      {loading && <BarLoading />}
      <div className="content-box">
        {/* Federation Header */}
        <header className="bg-white text-gray-800 p-6 shadow-lg border-b-4 border-red-500">
          <div className="container mx-auto">
            <div className="federation-header">
              {federationLogo ? (
                <img src={federationLogo} alt="Federation Logo" className="federation-logo" />
              ) : (
                <Shield className="w-16 h-16 text-green-700" />
              )}
              <h1 className="federation-title">
                {federationName || "Algerian Judo Federation"}
              </h1>
            </div>
          </div>
        </header>

        <h2 className="form-title">Add League Member</h2>

        <form onSubmit={handleSubmit} className="form-grid">
         <label>
            League Role *
            <select value={roleId} onChange={(e) => setRoleId(e.target.value)} required>
              <option value="">Select Role</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.league_role}
                </option>
              ))}
            </select>
          </label>

            <label>
              League *
              <select
                value={selectedLeagueId}
                onChange={(e) => {
                  setSelectedLeagueId(e.target.value);
                  setSelectedLeague(e.target.value);
                }}
                required
                disabled={!!state?.league_id}  // <— disables if coming from state
              >
                {/* If locked to one league, just show that */}
                {state?.league_id ? (
                  <option value={state.league_id}>{leagueName || "Selected League"}</option>
                ) : (
                  <>
                    <option value="">Select League</option>
                    {leagues.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name_league}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </label>

            <label>
              Blood Type *
              <select value={bloodType} onChange={(e) => setBloodType(e.target.value)} required>
                <option value="">-- Select Blood Type --</option>
                <option>A+</option>
                <option>A-</option>
                <option>B+</option>
                <option>B-</option>
                <option>AB+</option>
                <option>AB-</option>
                <option>O+</option>
                <option>O-</option>
              </select>
            </label>

            <label>
              Last Name *
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </label>

            <label>
              First Name *
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </label>

            <label>
              Date of Birth *
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} required />
            </label>

            <label>
              Place of Birth *
              <input type="text" value={pob} onChange={(e) => setPob(e.target.value)} required />
            </label>

            <label>
              National Identity Number *
              <input type="text" value={nid} onChange={(e) => setNid(e.target.value)} maxLength="18" minLength="18" required />
               <small>18 digits required — must be unique. </small>
            </label>

            <label>
              Password *
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>

            <label>
              Confirm Password *
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </label>

            <label>
              Nationality *
              <select value={nationality} onChange={(e) => setNationality(e.target.value)} required>
                <option value="">-- Select --</option>
                <option>Algerian</option>
                <option>Tunisian</option>
                <option>Moroccan</option>
              </select>
            </label>

            <label>
              Holder of *
              <input type="text" value={holderOf} onChange={(e) => setHolderOf(e.target.value)} placeholder="Licences, Coach degree..." required />
            </label>

            <label>
              Grade *
              <select value={grade} onChange={(e) => setGrade(e.target.value)} required>
                <option value="">-- Select --</option>
                <option>Brown Belt</option>
                <option>Black Belt</option>
              </select>
            </label>

            <label>
              Upload Member Photo *
              <input type="file" required onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
            </label>

            <label>
            Upload League Logo *
            <input type="file" required onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
          </label>
           <div className="btn-row">
            <button type="submit" className="primary-b">
               Add Member
            </button>
            
            <button
              type="button"
              className="secondary-btn"
              onClick={() => navigate("/member-list")}
            >
             The Member List
            </button>
						<BackHomeButton />
          </div>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '10px', textAlign: 'center' }}>
              All fields marked with an asterisk (*) must be filled in.
            </p>
          </form>

          {/* Transparent Error/Success Overlay System */}
          {error && (
            <ErrorOverlay 
              error={error} 
              onClose={() => setError(null)} 
            />
          )}
          {success && (
            <SuccessOverlay 
              success={success} 
              onClose={() => setSuccess("")} 
            />
          )}


        {loading && (
          <div>Loading...</div>
        )}

        <Navigation />
      </div>
    </div>
  );
}
