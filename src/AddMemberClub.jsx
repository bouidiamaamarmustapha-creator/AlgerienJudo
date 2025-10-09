import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { supabase } from "./supabaseClient";
import Navigation from "./Navigation";
import BackHomeButton from "./BackHomeButton";
import logo from "./assets/logo.png";
import ErrorOverlay from "./components/ErrorOverlay";
import SuccessOverlay from "./components/SuccessOverlay";
import BarLoading from "./components/BarLoading";
import CircleLoading from "./components/CircleLoading"; 

export default function AddMemberClub() {
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

  const [clubs, setClubs] = useState([]);
  const [leagues, setLeagues] = useState([]);

  const [logoFile, setLogoFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);

  const [nationality, setNationality] = useState("");
  const [grade, setGrade] = useState("");
  const [holderOf, setHolderOf] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [federationLogo, setFederationLogo] = useState(null);
  const federationName = "Algerian Judo Federation";

  const [selectedLeague, setSelectedLeague] = useState("");
  const [selectedClub, setSelectedClub] = useState("");

  const navigate = useNavigate();

  // fetch roles
  useEffect(() => {
    const fetchRoles = async () => {
      const { data, error } = await supabase
        .from("clubrole")
        .select("id, club_role");
      if (error) console.error("Error fetching roles:", error.message);
      if (data) setRoles(data);
    };
    fetchRoles();
  }, []);

  // fetch leagues
  useEffect(() => {
    const fetchLeagues = async () => {
      const { data, error } = await supabase
        .from("nameleague")
        .select("id, name_league");
      if (error) console.error("Error fetching leagues:", error.message);
      if (data) setLeagues(data);
    };
    fetchLeagues();
  }, []);

  // fetch clubs based on selected league (league_i)
  useEffect(() => {
    if (!selectedLeague) {
      setClubs([]);
      return;
    }
    const fetchClubs = async () => {
      const { data, error } = await supabase
        .from("nameclub")
        .select("id, name_club")
        .eq("league_i", selectedLeague);

      if (error) {
        console.error("Error fetching clubs:", error.message);
      } else {
        setClubs(data || []);
      }
    };
    fetchClubs();
  }, [selectedLeague]);

  // fetch federation logo
  useEffect(() => {
    const fetchLatestLogo = async () => {
      const { data, error } = await supabase
        .from("logo")
        .select("logo_url")
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) console.error("Error fetching logo:", error.message);
      if (data?.length) setFederationLogo(data[0].logo_url);
    };
    fetchLatestLogo();
  }, []);

       // Upload a file to storage and return public URL
  const uploadFile = async (file) => {
    if (!file) return null;
    
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()}.${ext}`;
      
      console.log(`Uploading logo file: ${fileName}`);
      const { error } = await supabase.storage.from("logos").upload(fileName, file);
      
      if (error) {
        console.error("Logo upload error:", error);
        throw new Error(`Logo upload failed: ${error.message}`);
      }
      
      const { data } = supabase.storage.from("logos").getPublicUrl(fileName);
      const publicUrl = data?.publicUrl;
      
      if (!publicUrl) {
        throw new Error("Failed to get public URL for uploaded logo");
      }
      
      console.log(`Logo uploaded successfully: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      console.error("uploadFile error:", error);
      throw error;
    }
  };

  const handlePhotoUpload = async () => {
    if (!photoFile) return null;
    
    try {
      const ext = photoFile.name.split(".").pop();
      const fileName = `club_member-${Date.now()}.${ext}`;
      
      console.log(`Uploading photo file: ${fileName}`);
      const { error } = await supabase.storage.from("logos").upload(fileName, photoFile);
      
      if (error) {
        console.error("Photo upload error:", error);
        throw new Error(`Photo upload failed: ${error.message}`);
      }
      
      const { data } = supabase.storage.from("logos").getPublicUrl(fileName);
      const publicUrl = data?.publicUrl;
      
      if (!publicUrl) {
        throw new Error("Failed to get public URL for uploaded photo");
      }
      
      console.log(`Photo uploaded successfully: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      console.error("handlePhotoUpload error:", error);
      throw error;
    }
  };

  // ------------------ renewal helper (updated for year-based logic) ------------------
  const getNextRenewal = async (nidVal, clubIdVal, roleVal, currentSeasonYear) => {
    // Debug logging
    console.log("getNextRenewal called with:", {
      nidVal,
      clubIdVal,
      roleVal,
      currentSeasonYear
    });
    
    // Check if member already exists in current year
    const { data: existingInCurrentYear, error: queryError } = await supabase
      .from("club_members")
      .select("*")
      .eq("national_id_number", nidVal)
      .eq("club_id", clubIdVal)
      .eq("role", roleVal)
      .eq("year", currentSeasonYear);
    
    console.log("Query result:", { existingInCurrentYear, queryError });
    
    if (existingInCurrentYear && existingInCurrentYear.length > 0) {
      console.log("Found existing member, throwing error");
      throw new Error("This member is already registered for the current season with the same role and club.");
    }
    
    // Count total registrations across all years for this combination
    const { count } = await supabase
      .from("club_members")
      .select("*", { count: "exact", head: true })
      .eq("national_id_number", nidVal)
      .eq("club_id", clubIdVal)
      .eq("role", roleVal);
    
    return (count || 0) + 1;
  };

   const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    console.log("Setting submitLoading to true");
    setSubmitLoading(true);
    
    // Add a small delay to ensure loading state is visible
    await new Promise(resolve => setTimeout(resolve, 100));

    if (!firstName || !lastName || !dob || !pob || !roleId || !selectedClub || !selectedLeague || !password || !confirmPassword) {
      const missingFields = [];
      if (!firstName) missingFields.push("First Name");
      if (!lastName) missingFields.push("Last Name");
      if (!dob) missingFields.push("Date of Birth");
      if (!pob) missingFields.push("Place of Birth");
      if (!roleId) missingFields.push("Role");
      if (!selectedClub) missingFields.push("Club");
      if (!selectedLeague) missingFields.push("League");
      if (!password) missingFields.push("Password");
      if (!confirmPassword) missingFields.push("Confirm Password");
     
      
      setError(`Please fill in the following required fields: ${missingFields.join(", ")}`);
      console.log("Setting submitLoading to false - missing fields");
      setSubmitLoading(false);
      return;
    }

    // Additional validation for club_id and league_id
    const clubIdValue = Number(selectedClub);
    const leagueIdValue = Number(selectedLeague);
    if (!clubIdValue || isNaN(clubIdValue)) {
      setError("Please select a valid club.");
      setSubmitLoading(false);
      return;
    }
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

    // Check if Last Name and Password combination already exists
    if (lastName && password) {
      const { data: existingNamePassword } = await supabase
        .from("club_members")
        .select("*")
        .eq("last_name", lastName)
        .eq("password", password);
      
      if (existingNamePassword && existingNamePassword.length > 0) {
        setError("Change your Password for this name because is already exist");
        setSubmitLoading(false);
        return;
      }
    }

    // Convert role_id to role name for database storage
    const roleName = roles.find((r) => r.id === parseInt(roleId))?.club_role || "";
    
    // Get renewal number
    const currentYear = new Date().getFullYear();
    const seasonYear = `${currentYear}/${currentYear + 1}`;
    
    let renewal;
    try {
      renewal = await getNextRenewal(nid, clubIdValue, roleName, seasonYear);
    } catch (renewalError) {
      setError(renewalError.message);
      setSubmitLoading(false);
      return;
    }

    try {
      console.log("Starting file uploads...");
      const photoUrl = await handlePhotoUpload();
      const uploadedClubLogo = await uploadFile(logoFile);
      console.log("File uploads completed:", { photoUrl, uploadedClubLogo });

       // Validate that the role must be "League President"
    if (roleName !== "president of the club") {
      setError("Only members with the role 'president of the club' can be submitted.");
      setSubmitLoading(false);
      return;
    }
    
      const newClubMember = {
        last_name: lastName,
        first_name: firstName,
        date_of_birth: dob,
        place_of_birth: pob,
        role: roleName,
        blood_type: bloodType,
        national_id_number: nid,
        password,
        photo_url: photoUrl,
        logo_url: uploadedClubLogo,
        nationality,
        grade,
        holder_of: holderOf,
        club_id: clubIdValue,
        league_id: leagueIdValue,
        license_number: `LIC-${Date.now()}`,
        renewal: renewal,
        year: seasonYear,
        confirmation: false,
      };

      const { error } = await supabase.from("club_members").insert([newClubMember]);
      if (error) {
        console.error("insert club member error", error);
        setError("Error saving club member: " + error.message);
        setSubmitLoading(false);
      } else {
        setSuccess(`Member "${firstName} ${lastName}" has been successfully added to the club!`);
        setLastName("");
        setFirstName("");
        setDob("");
        setPob("");
        setRoleId("");
        setBloodType("");
        setNid("");
        setPassword("");
        setConfirmPassword("");
        setNationality("");
        setGrade("");
        setHolderOf("");
        setPhotoFile(null);
        setLogoFile(null);

        setSubmitLoading(false);
      }
    } catch (err) {
      console.error("handleSubmit error", err);
      setError("Unexpected error: " + err.message);
      setSubmitLoading(false);
    }
  };


  return (
    <div className="page-container">
      {loading && <BarLoading />}
      <div className="content-box">
        <header className="bg-white text-gray-800 p-6 shadow-lg border-b-4 border-red-500">
          <div className="federation-header">
            {federationLogo ? (
              <img
                src={federationLogo}
                alt="Federation Logo"
                className="federation-logo"
              />
            ) : (
              <Shield className="w-16 h-16 text-green-700" />
            )}
            <h1 className="federation-title">{federationName}</h1>
          </div>
        </header>

        <h2 className="form-title">Add Club Member</h2>
        <form onSubmit={handleSubmit} className="form-grid">
          <label>
            Club Role *
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              required
            >
              <option value="">Select Role</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.club_role}
                </option>
              ))}
            </select>
          </label>

          <label>
            League *
            <select
              value={selectedLeague}
              onChange={(e) => {
                setSelectedLeague(e.target.value);
                setSelectedClub("");
              }}
              required
            >
              <option value="">-- Select League --</option>
              {leagues.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name_league}
                </option>
              ))}
            </select>
          </label>

          <label>
            Club *
            <select
              value={selectedClub}
              onChange={(e) => setSelectedClub(e.target.value)}
              disabled={!selectedLeague}
              required
            >
              <option value="">-- Select Club --</option>
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_club}
                </option>
              ))}
            </select>
          </label>

          <label>
            Nationality *
            <select
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              required
            >
              <option value="">-- Select --</option>
              <option>Algerian</option>
              <option>Tunisian</option>
            </select>
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
            Holder of *
            <input
              type="text"
              value={holderOf}
              onChange={(e) => setHolderOf(e.target.value)} 
              placeholder="Licences, Coach degree..."
              required
            />
          </label>

          <label>
            Blood Type *
            <select
              value={bloodType}
              onChange={(e) => setBloodType(e.target.value)}
              required
            >
              <option value="">-- Select --</option>
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
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </label>

          <label>
            First Name *
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </label>

          <label>
            Date of Birth *
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              required
            />
          </label>

          <label>
            Place of Birth *
            <input
              type="text"
              value={pob}
              onChange={(e) => setPob(e.target.value)}
              required
            />
          </label>

          <label>
            National Identity Number *
            <input
              type="text"
              value={nid}
              onChange={(e) => setNid(e.target.value)}
              maxLength="18"
              minLength="18"
              required
            />
          </label>

          <label>
            Password *
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <label>
            Confirm Password *
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </label>

          <label>
            Upload Club Logo *
            <input
              type="file"
              onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
              required
            />
          </label>

          <label>
            Upload Member Photo *
            <input
              type="file"
              onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              required
            />
          </label>

          <div className="btn-row">
            <button type="submit" className="primary-b">
               Add Member
            </button>
            
            <button
              type="button"
              className="secondary-btn"
              onClick={() => navigate("/club-member-list")}
            >
             The Member List
            </button>
						<BackHomeButton />
          </div>
           <p style={{ fontSize: '12px', color: '#666', marginTop: '10px', textAlign: 'center' }}>
                  All fields marked with an asterisk (*) must be filled in.
                </p>
        </form>

        {/* Circle Loading for Submit Operations */}
        {submitLoading && (
          <CircleLoading message="Adding member..." />
        )}

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

        <Navigation />
      </div>
    </div>
  );
}
