import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import logo from "./assets/logo.png";
import { supabase } from "./supabaseClient";
import Navigation from "./Navigation";
import BackHomeButton from "./BackHomeButton";
import ErrorOverlay from "./components/ErrorOverlay";
import SuccessOverlay from "./components/SuccessOverlay";
import BarLoading from "./components/BarLoading";
import CircleLoading from "./components/CircleLoading";

export default function AddMemberPage() {
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [dob, setDob] = useState("");
  const [pob, setPob] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [nid, setNid] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedFederationRole, setSelectedFederationRole] = useState("");
  const [federationRoles, setFederationRoles] = useState([]);
  const [nationality, setNationality] = useState("");
  const [holderOf, setHolderOf] = useState("");
  const [grade, setGrade] = useState("");

  const [federationLogo, setFederationLogo] = useState(null);
  const [federationName, setFederationName] = useState("Algerian Judo Federation");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const navigate = useNavigate();
  const federationLogoPlaceholder = logo;

  // ✅ fetch federation logo
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

  // ✅ fetch federation roles
  useEffect(() => {
    const fetchFederationRoles = async () => {
      const { data, error } = await supabase
        .from("federationrole")
        .select("federation_role")
        .order("federation_role", { ascending: true });
      if (!error && data) {
        setFederationRoles(data);
      }
    };
    fetchFederationRoles();
  }, []);
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

  // ------------------ form submit ------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitLoading(true);

    if (
      !selectedFederationRole ||
      !bloodType ||
      !lastName ||
      !firstName ||
      !dob ||
      !pob ||
      !nid ||
      !password ||
      !confirmPassword ||
      !nationality ||
      !holderOf ||
      !grade
    ) {
      setError("All fields are required.");
      setSubmitLoading(false);
      return;
    }

    if (nid.length !== 18) {
      setError("National Identity Number must be exactly 18 digits.");
      setSubmitLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setSubmitLoading(false);
      return;
    }

    try {
      const uploadedPhotoUrl = await handlePhotoUpload();

      const currentYear = new Date().getFullYear();
      const seasonYear = `${currentYear}/${currentYear + 1}`;
      
       if (roleName !== "League President") {
      setError("Only members with the role 'League President' can be submitted.");
      setSubmitLoading(false);
      return;
    }
    
      const newMember = {
        last_name: lastName,
        first_name: firstName,
        date_of_birth: dob,
        place_of_birth: pob,
        role: selectedFederationRole,
        blood_type: bloodType,
        national_id_number: nid,
        password,
        license_number: "LIC-" + Date.now(),
        registration_date: new Date().toISOString().split("T")[0],
        nationality,
        holder_of: holderOf,
        grade,
        photo_url: uploadedPhotoUrl,
        confirmation: false,
        year: seasonYear,
      };

      const { error } = await supabase.from("members").insert([newMember]);
      if (error) {
        setError(`❌ Failed to add member: ${error.message}`);
      } else {
        setSuccess(`✅ Member "${firstName} ${lastName}" added successfully!`);
        setLastName("");
        setFirstName("");
        setDob("");
        setPob("");
        setNid("");
        setPassword("");
        setConfirmPassword("");
        setSelectedFederationRole("");
        setBloodType("");
        setNationality("");
        setHolderOf("");
        setGrade("");
        setPhotoFile(null);
      }
    } catch (err) {
      setError(`❌ An unexpected error occurred: ${err.message}`);
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="page-container">
      {loading && <BarLoading />}
      <div className="content-box">
        {/* Header */}
        <header className="bg-white text-gray-800 p-6 shadow-lg border-b-4 border-red-500">
          <div className="container mx-auto">
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
              <h1 className="federation-title">
                {federationName || "Algerian Judo Federation"}
              </h1>
            </div>
          </div>
        </header>

        <h2 className="form-title">Add a New Member</h2>

        <form onSubmit={handleSubmit} className="form-grid">
          {/* Role */}
          <label>
            Federation Role *
            <select
              value={selectedFederationRole}
              onChange={(e) => setSelectedFederationRole(e.target.value)}
              required
            >
              <option value="">Select Federation Role</option>
              {federationRoles.map((role) => (
                <option key={role.federation_role} value={role.federation_role}>
                  {role.federation_role}
                </option>
              ))}
            </select>
          </label>

          {/* Text inputs */}
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
               {/* Blood type */}
          <label>
            Blood Type *
            <select
              value={bloodType}
              onChange={(e) => setBloodType(e.target.value)}
              required
            >
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

          {/* Passwords */}
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
            Nationality *
            <input
              type="text"
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              required
            />
          </label>

          <label>
            Holder of *
            <input
              type="text"
              value={holderOf}
              onChange={(e) => setHolderOf(e.target.value)}
              placeholder="Licenses, Coach degree..."
              required
            />
          </label>

          <label>
            Grade *
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              required
            >
              <option value="">-- Select --</option>
              <option>Brown Belt</option>
              <option>Black Belt</option>
            </select>
          </label>
            <label>
              Upload Member Photo *
              <input type="file" required onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
            </label>
          {/* Buttons */}
        {/*  <div className="btn-row">
            <button type="submit" className="primary-b">
              Add Member
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => navigate("/MemberListPage")}
            >
              The Member List
            </button>
            <BackHomeButton />
          </div>*/}

          <p
            style={{
              fontSize: "12px",
              color: "#666",
              marginTop: "10px",
              textAlign: "center",
            }}
          >
            All fields marked with an asterisk (*) must be filled in.
          </p>
        </form>

        {/* Transparent Error/Success Overlay System */}
        {error && <ErrorOverlay error={error} onClose={() => setError("")} />}
        {success && (
          <SuccessOverlay success={success} onClose={() => setSuccess("")} />
        )}

        {submitLoading && <CircleLoading message="Adding member..." />}

        <Navigation />
      </div>
    </div>
  );
}
