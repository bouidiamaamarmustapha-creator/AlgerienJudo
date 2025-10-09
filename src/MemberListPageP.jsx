import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate, useLocation } from "react-router-dom";
import Navigation from "./Navigation";
import "./index.css";
import BackHomeButton from "./BackHomeButton";
import { exportToPDF, fetchClubNames, fetchLeagueNames, sanitizeText } from "./ExportUtils";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import loadImage from 'blueimp-load-image';
import { Shield } from "lucide-react";
import logo from "./assets/logo.png"; 
import PhotosLogoPublication from "./PhotosLogoPublication";
import { initializePrimaryButtons, handlePrimaryButtonClick } from './primaryButtonHandler';
import { useDragScroll } from './useDragScroll';
import ErrorOverlay from './components/ErrorOverlay';
import SuccessOverlay from './components/SuccessOverlay';
import BarLoading from './components/BarLoading';

export default function MemberListPageP() {
  // Initialize active state for primary buttons
  useEffect(() => {
    initializePrimaryButtons();
  }, []);
  const { state } = useLocation();
  const [members, setMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editedMember, setEditedMember] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); 
  const [success, setSuccess] = useState("");

  // ✅ form states
  const [roleName, setRoleName] = useState("");
  const [selectedFederationRole, setSelectedFederationRole] = useState("");
  const [federationRoles, setFederationRoles] = useState([]);
  const [bloodType, setBloodType] = useState("");
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [dob, setDob] = useState("");
  const [pob, setPob] = useState("");
  const [nid, setNid] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nationality, setNationality] = useState("");
  const [holderOf, setHolderOf] = useState("");
  const [grade, setGrade] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // ✅ federation & UI states
  const [publications, setPublications] = useState([]);
  const [federationLogo, setFederationLogo] = useState(null);
  const [federationName, setFederationName] = useState("Algerian Judo Federation");
  const [isGreen, setIsGreen] = useState(true);

  const navigate = useNavigate();
  const tableRef = useDragScroll();

 

  // ✅ fetch publications from Supabase
  useEffect(() => {
    const fetchPublications = async () => {
      const { data, error } = await supabase
        .from("publications")
        .select("id, title, description, photo_url, created_at")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setPublications(data);
      }
    };

    fetchPublications();
  }, []);

  useEffect(() => {
    const fetchLatestLogo = async () => {
      const { data, error } = await supabase
        .from("logo") // ✅ using the "logo" table we created
        .select("logo_url")
        .order("created_at", { ascending: false })
        .limit(1);

      if (!error && data.length > 0) {
        setFederationLogo(data[0].logo_url);
      }
    };

    fetchLatestLogo();
  }, []);

  // Fetch members from Supabase
  const fetchMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching members:", error);
        setError(error);
      } else {
        setMembers(data || []);
      }
    } catch (err) {
      console.error("Exception in fetchMembers:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
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

  // Computed: filtered members based on search term
  const filteredMembers = members.filter((m) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (m.first_name && m.first_name.toLowerCase().includes(term)) ||
      (m.last_name && m.last_name.toLowerCase().includes(term)) ||
      (m.national_id_number && String(m.national_id_number).toLowerCase().includes(term)) ||
      (m.role && m.role.toLowerCase().includes(term)) ||
      (m.blood_type && m.blood_type.toLowerCase().includes(term)) ||
      (m.place_of_birth && m.place_of_birth.toLowerCase().includes(term)) ||
      (m.license_number && String(m.license_number).toLowerCase().includes(term)) ||
      (m.registration_date && String(m.registration_date).toLowerCase().includes(term)) ||
      (m.date_of_birth && String(m.date_of_birth).toLowerCase().includes(term))
    );
  });

  // Delete member
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this member?")) return;
    const { error } = await supabase.from("members").delete().eq("id", id);
    if (error) console.error("Error deleting member:", error);
    else setMembers(members.filter((m) => m.id !== id));
  };

  // Enable edit mode
  const handleEdit = (member) => {
    setEditingId(member.id);
    setEditedMember({ ...member });
  };

  // Save changes
  const handleSave = async (id) => {
    const { error } = await supabase
      .from("members")
      .update({
        last_name: editedMember.last_name,
        first_name: editedMember.first_name,
        date_of_birth: editedMember.date_of_birth,
        place_of_birth: editedMember.place_of_birth,
        role: editedMember.role,
        blood_type: editedMember.blood_type,
      })
      .eq("id", id);

    if (error) console.error("Error updating member:", error);
    else {
      setMembers(members.map((m) => (m.id === id ? editedMember : m)));
      setEditingId(null);
    }
  };

  // Handle input changes
  const handleChange = (e, field) => {
    setEditedMember({ ...editedMember, [field]: e.target.value });
  };

  const handlePrint = async () => {
    // Export from public.members table as requested
    const columns = [
      { header: 'Role', dataKey: 'role' },
      { header: 'Blood Type', dataKey: 'blood_type' },
      { header: 'Last Name', dataKey: 'last_name' },
      { header: 'First Name', dataKey: 'first_name' },
      { header: 'Date of Birth', dataKey: 'date_of_birth' },
      { header: 'Place of Birth', dataKey: 'place_of_birth' },
      { header: 'National ID', dataKey: 'national_id_number' },
      { header: 'License Number', dataKey: 'license_number' },
      { header: 'Registration Date', dataKey: 'registration_date' }
    ];

    const options = {
      includePhotos: false,
      federationName: federationName
    };

    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching members for PDF:', error);
        setError(error);
        return;
      }
      exportToPDF(data || [], 'Members List', columns, options);
    } catch (e) {
      console.error('Exception exporting members PDF:', e);
      setError(e);
    }
  };

  // Helper to normalize image orientation using EXIF, like TheLeagueListAddFed
  function normalizeImage(url) {
    return new Promise((resolve) => {
      loadImage(
        url,
        (canvas) => {
          if (canvas.type === "error") {
            console.warn("EXIF processing failed, using original image:", url);
            resolve(url);
          } else {
            try {
              const dataURL = canvas.toDataURL("image/png");
              resolve(dataURL);
            } catch (error) {
              console.warn("Canvas conversion failed, using original image:", error);
              resolve(url);
            }
          }
        },
        { orientation: true, canvas: true, crossOrigin: 'anonymous' }
      );
    });
  }

  // Match TheLeagueListAddFed single-member PDF export (with normalizeImage)
  const exportPDFWithAutoOrientation = async (data) => {
    if (!data || Object.keys(data).length === 0) {
      alert('No data available to export');
      return;
    }

    // Fetch club and league names if present on the row
    let fetchedClubName = null;
    let fetchedLeagueName = null;
    try {
      if (data.club_id) {
        const clubNames = await fetchClubNames();
        fetchedClubName = clubNames[data.club_id];
      }
      if (data.league_id) {
        const leagueNames = await fetchLeagueNames();
        fetchedLeagueName = leagueNames[data.league_id];
      }
    } catch (error) {
      console.error('Error fetching names:', error);
    }

    const doc = new jsPDF('portrait', 'mm', 'a4');
    // Header
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text('Algerian Judo Federation', 14, 15);

    // Title
    const title = `Member Information - ${data.first_name || ''} ${data.last_name || ''}`.trim();
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text(title, 14, 30);

    // Timestamp
    doc.setFontSize(10);
    const timestamp = new Date().toLocaleString();
    doc.text(`Generated: ${timestamp}`, 14, 37);

    // Logo
    if (federationLogo) {
      try {
        doc.addImage(federationLogo, 'PNG', 170, 10, 25, 25);
      } catch (error) {
        console.error('Error adding logo to PDF:', error);
      }
    }

    // Photo with normalization
    let startY = 70;
    if (data.photo_url) {
      try {
        const fixedPhoto = await normalizeImage(data.photo_url);
        const imageFormat = fixedPhoto.startsWith('data:') ? 'PNG' : 'JPEG';
        doc.addImage(fixedPhoto, imageFormat, 14, 45, 25, 20);
        startY = 70;
      } catch (error) {
        console.error('Error adding photo to PDF:', error);
        try {
          doc.addImage(data.photo_url, 'JPEG', 14, 45, 25, 20);
        } catch (fallbackError) {
          console.error('Fallback image addition also failed:', fallbackError);
        }
        startY = 70;
      }
    }

    // Confirmation badge
    doc.setFontSize(12);
    if (data.confirmation) {
      doc.setTextColor(0, 128, 0);
    } else {
      doc.setTextColor(255, 0, 0);
    }
    const confirmationText = data.confirmation ? 'CONFIRMED ✓' : 'NOT CONFIRMED ✗';
    doc.text(confirmationText, 160, 50);
    doc.setTextColor(0, 0, 0);

    // Member info table (Field / Value)
    const memberInfo = [
      ['First Name', data.first_name || ''],
      ['Last Name', data.last_name || ''],
      ['Date of Birth', data.date_of_birth || ''],
      ['Place of Birth', data.place_of_birth || ''],
      ['National ID', data.national_id_number || ''],
      ['Nationality', data.nationality || ''],
      ['Blood Type', data.blood_type || ''],
      ['Grade', data.grade || ''],
      ['Role', data.role || ''],
      ['Holder Of', data.holder_of || ''],
      ['License Number', data.license_number || ''],
      ['Registration Date', data.registration_date || ''],
      ['Year', data.year || ''],
      ['Renewal', data.renewal || '']
    ];

    autoTable(doc, {
      head: [['Field', 'Value']],
      body: memberInfo,
      startY: startY,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40] },
      styles: { overflow: 'linebreak' },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { cellWidth: 'auto' }
      }
    });

    const finalY = doc.lastAutoTable.finalY || 200;
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Medical certificate', 14, finalY + 20);

    // Signature line
    doc.setDrawColor(0);
    doc.line(14, finalY + 40, 80, finalY + 40);

  

    // Federation visa (replaces league visa)
    doc.text('Federation Visa: _________________', 120, finalY + 70);

    // QR code at the bottom
    try {
      const qrData = JSON.stringify({
        id: data.id,
        name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
        license: data.license_number || '',
        club_id: data.club_id || '',
        league_id: data.league_id || '',
        confirmation: data.confirmation || 'Unconfirmed'
      });
      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        width: 120,
        margin: 1,
        color: { dark: '#000000', light: '#FFFFFF' }
      });
      doc.addImage(qrCodeDataURL, 'PNG', 175, finalY + 75, 15, 15);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }

    doc.save(`member_${data.first_name || ''}_${data.last_name || ''}.pdf`);
  };

  // Wrapper to match TheLeagueListAddFed behavior
  const handleExportPDF = (member) => {
    if (!member || Object.keys(member).length === 0) {
      alert('No data available to export');
      return;
    }
    exportPDFWithAutoOrientation(member);
  };

  const handleGradeRoleExport = async () => {
    // Role-focused export from public.members (no league/club grouping fields available)
    const columns = [
      { header: 'Role', dataKey: 'role' },
      { header: 'Last Name', dataKey: 'last_name' },
      { header: 'First Name', dataKey: 'first_name' },
      { header: 'National ID', dataKey: 'national_id_number' }
    ];

    const options = {
      includePhotos: false,
      federationName: federationName
    };

    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('role', { ascending: true });
      if (error) {
        console.error('Error fetching members for role export:', error);
        setError(error);
        return;
      }
      exportToPDF(data || [], 'Role-focused Members Export', columns, options);
    } catch (e) {
      console.error('Exception exporting role-focused PDF:', e);
      setError(e);
    }
  };

  const toggleConfirmation = async (id, currentValue) => {
    try {
      const { data, error } = await supabase
        .from('members')
        .update({ confirmation: !currentValue })
        .eq('id', id)
        .select();
      if (error) {
        console.error('Error updating confirmation:', error);
        setError(error);
        return;
      }
      setMembers(prev => prev.map(m => m.id === id ? { ...m, confirmation: !currentValue } : m));
      setSuccess(!currentValue ? 'Confirmation set' : 'Confirmation unset');
    } catch (e) {
      console.error('Exception in toggleConfirmation:', e);
      setError(e);
    }
  };

  

  if (error) {
    return <p>Error fetching members: {error.message}</p>;
  }

  return (
    <div className="app-container">
      {loading && <BarLoading />}
       {/* HEADER */}
            <header className="bg-white text-gray-800 p-6 shadow-lg border-b-4 border-red-500">
            <div className="container mx-auto">
              <div className="federation-header">
                {federationLogo ? (
                  <img
                    src={federationLogo}
                    alt="Logo Fédération"
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


      {/* MAIN CONTENT */}
      <section className="content">
        <h2>Welcome to the Federation Account</h2>
            <p>This is the Federation Account page.</p>
<div className="sticky-button-bar">
  <BackHomeButton />
  <PhotosLogoPublication data-id="1" />
  <button className="primary-btn" data-id="2" onClick={(e) => { handlePrimaryButtonClick(e.currentTarget); navigate("/MemberListPageP"); }}>
    The Member List Add
  </button>
  <button
    className="primary-btn"
    data-id="3"
  onClick={(e) => { handlePrimaryButtonClick(e.currentTarget); navigate("/TheLeagueList-Add"); }}
>
  The League List Add
</button>
  <button className="primary-btn" data-id="4" onClick={(e) => { handlePrimaryButtonClick(e.currentTarget); navigate("/TheClubListAdd-Fed"); }}>
    The Club List Add
  </button>
  <button className="primary-btn" data-id="5" onClick={(e) => { handlePrimaryButtonClick(e.currentTarget); navigate("/TheAthleteList-Add"); }}>
    The Athlete List Add
  </button>
</div>

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
          <div className="btn-row">
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
          </div>

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
      <h2 className="form-title">Federation Member List</h2>
        <div className="form-grid">
        {/* Search Bar */}
        <div><h2 className="form-title">search Member</h2></div>
              <div className="search-bar">
                <input
                  type="text"
                  placeholder="Search by First Name, Last Name, or NID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
 </div>
        <div className="table-container" ref={tableRef}>
          <table className="athlete-table">
            <thead>
              <tr>
                <th>Last</th>
                <th>First</th>
                <th>DOB</th>
                <th>POB</th>
                <th>Role</th>
                <th>Blood</th>
                <th>Nationality</th>
                <th>Grade</th>
                <th>Holder Of</th>
                <th>NID</th>
                <th>Renewal</th>
                <th>Year</th>
                <th>License #</th>
                <th>Registration</th>
                <th>Photo</th>
                <th>Confirmation</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={17}>No members found.</td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id} onDoubleClick={() => handleExportPDF(member)} style={{ cursor: 'pointer' }}>
                    {/* Last */}
                    <td>
                      {editingId === member.id ? (
                        <input
                          value={editedMember.last_name || ""}
                          onChange={(e) => handleChange(e, "last_name")}
                        />
                      ) : (
                        member.last_name
                      )}
                    </td>
                    {/* First */}
                    <td>
                      {editingId === member.id ? (
                        <input
                          value={editedMember.first_name || ""}
                          onChange={(e) => handleChange(e, "first_name")}
                        />
                      ) : (
                        member.first_name
                      )}
                    </td>
                    {/* DOB */}
                    <td>
                      {editingId === member.id ? (
                        <input
                          type="date"
                          value={editedMember.date_of_birth || ""}
                          onChange={(e) => handleChange(e, "date_of_birth")}
                        />
                      ) : (
                        member.date_of_birth
                      )}
                    </td>
                    {/* POB */}
                    <td>
                      {editingId === member.id ? (
                        <input
                          value={editedMember.place_of_birth || ""}
                          onChange={(e) => handleChange(e, "place_of_birth")}
                        />
                      ) : (
                        member.place_of_birth
                      )}
                    </td>
                    {/* Role */}
                    <td>
                      {editingId === member.id ? (
                        <input
                          value={editedMember.role || ""}
                          onChange={(e) => handleChange(e, "role")}
                        />
                      ) : (
                        member.role
                      )}
                    </td>
                    {/* Blood */}
                    <td>
                      {editingId === member.id ? (
                        <input
                          value={editedMember.blood_type || ""}
                          onChange={(e) => handleChange(e, "blood_type")}
                        />
                      ) : (
                        member.blood_type
                      )}
                    </td>
                    {/* Nationality */}
                    <td>{member.nationality || ''}</td>
                    {/* Grade */}
                    <td>{member.grade || ''}</td>
                    {/* Holder Of */}
                    <td>{member.holder_of || ''}</td>
                    {/* NID */}
                    <td>{member.national_id_number}</td>
                    {/* Renewal */}
                    <td>{member.renewal || ''}</td>
                    {/* Year */}
                    <td>{member.year || ''}</td>
                    {/* License # */}
                    <td>{member.license_number}</td>
                    {/* Registration */}
                    <td>{member.registration_date}</td>
                    {/* Photo */}
                    <td>
                      {member.photo_url ? (
                        <img src={member.photo_url} alt="Member" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                      ) : (
                        '—'
                      )}
                    </td>
                    {/* Confirmation */}
                    <td>{member.confirmation ? 'Confirmed' : 'Pending'}</td>
                    {/* Actions */}
                    <td>
                      {editingId === member.id ? (
                        <button className="primary-b" onClick={() => handleSave(member.id)}>
                          Save
                        </button>
                      ) : (
                        <>
                          <button className="primary-b" onClick={() => handleEdit(member)}>
                            Modify
                          </button>
                          <button className="secondary-btn" onClick={() => handleDelete(member.id)}>
                            Delete
                          </button>
                          <button className="primary-b" onClick={() => toggleConfirmation(member.id, !!member.confirmation)}>
                            {member.confirmation ? 'Unset Confirm' : 'Set Confirm'}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Export Buttons under the table */}
        <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
          <button className="primary-btn" onClick={handlePrint}>Export General PDF</button>
          <button className="primary-btn" onClick={handleGradeRoleExport}>Export Grade/Role PDF</button>
        </div>
        <BackHomeButton />
       
      </section>

      {/* Error and Success Overlays */}
      {error && (
        <ErrorOverlay
          error={error.message || error}
          onClose={() => setError(null)}
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
