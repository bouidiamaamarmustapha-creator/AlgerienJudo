import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate, useLocation } from "react-router-dom";
import Navigation from "./Navigation";
import "./index.css";
import BackHomeButton from "./BackHomeButton";
import logo from "./assets/logo.png";
import { useDragScroll } from './useDragScroll';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { fetchClubNames, fetchLeagueNames } from './ExportUtils';
import loadImage from 'blueimp-load-image';
import ErrorOverlay from "./components/ErrorOverlay";
import SuccessOverlay from "./components/SuccessOverlay";
import BarLoading from './components/BarLoading';
import CircleLoading from './components/CircleLoading';
import { initializePrimaryButtons, handlePrimaryButtonClick } from './primaryButtonHandler';


export default function MemberListLeagueL() {

  
  const [members, setMembers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editedMember, setEditedMember] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");

  const [publications, setPublications] = useState([]);
  const [federationLogo, setFederationLogo] = useState(null);
  const [federationName] = useState("Algerian Judo Federation");

  const [leagueName, setLeagueName] = useState("");
  const [leagueLogo, setLeagueLogo] = useState(null);

  // form fields
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
  const [photoFile, setPhotoFile] = useState(null);
  const [nationality, setNationality] = useState("");
  const [holderOf, setHolderOf] = useState("");
  const [grade, setGrade] = useState("");

  // selection / lists
  const [selectedLeagueId, setSelectedLeagueId] = useState("");
  const [leagues, setLeagues] = useState([]);
  const [logoFile, setLogoFile] = useState(null);
  const [selectedLeague, setSelectedLeague] = useState(""); // mirrors selectedLeagueId when UI changes
  const [searchTerm, setSearchTerm] = useState("");

 
  const tableRef = useDragScroll();

  // clubs
  const [clubs, setClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState(""); // store id (string) for selected club
  const [selectedClubId, setSelectedClubId] = useState("");

  const [league, setLeague] = useState(null);
  const [member, setMember] = useState(null);



  const navigate = useNavigate();
  const { state } = useLocation();

  const federationLogoPlaceholder = logo;

  // ------------------ small helper functions ------------------
  function getLogoUrl(url) {
    // If you store full publicUrl in DB, return it directly
    // Otherwise adapt construction if you store path only.
    return url ?? "";
  }

  // Function to normalize image orientation using EXIF data with fallback
  function normalizeImage(url) {
    return new Promise((resolve, reject) => {
      // First try to load with EXIF orientation correction
      loadImage(
        url,
        (canvas) => {
          if (canvas.type === "error") {
            console.warn("EXIF processing failed, using original image:", url);
            // Fallback: return the original URL if EXIF processing fails
            resolve(url);
          } else {
            try {
              const dataURL = canvas.toDataURL("image/png");
              resolve(dataURL); // returns normalized base64
            } catch (error) {
              console.warn("Canvas conversion failed, using original image:", error);
              resolve(url); // Fallback to original URL
            }
          }
        },
        { 
          orientation: true, 
          canvas: true,
          crossOrigin: 'anonymous' // Try to handle CORS
        }
      );
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditedMember({});
  }
 useEffect(() => {
    const fetchRoles = async () => {
      const { data, error } = await supabase.from("leaguerole").select("*");
      if (error) console.error(error);
      else setRoles(data);
    };
    fetchRoles();
  }, []);
  //Initialize in useEffect button: 
useEffect(() => {
  initializePrimaryButtons();
}, []);
  // fetch latest logo
  useEffect(() => {
    const fetchLeagues = async () => {
      const { data, error } = await supabase.from("nameleague").select("id, name_league");
      if (error) console.error("Error fetching leagues:", error);
      else setLeagues(data || []);
    };
    fetchLeagues();
  }, []);

  // Initialize selectedLeagueId from state if available
  useEffect(() => {
    if (state?.league_id) {
      setSelectedLeagueId(state.league_id.toString());
      setSelectedLeague(state.league_id.toString());
    }
  }, [state?.league_id]);
  // toggles confirmation boolean
  async function toggleConfirmation(id, currentValue) {
    try {
      const { error } = await supabase
        .from("league_members")
        .update({ confirmation: !currentValue })
        .eq("id", id);

      if (error) {
        console.error("toggleConfirmation error:", error);
        return;
      }
      setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, confirmation: !currentValue } : m)));
    } catch (err) {
      console.error(err);
    }
  }

  // handleDelete accepts either id or whole member object
  const handleDelete = async (itemOrId) => {
    const id = typeof itemOrId === "object" ? itemOrId.id : itemOrId;
    if (!window.confirm("Are you sure you want to delete this member?")) return;
    const { error } = await supabase.from("league_members").delete().eq("id", id);
    if (!error) setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  // Fetch all data: federation logo, league, club, members
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // federation logo
      const { data: fedData } = await supabase
        .from("logo")
        .select("logo_url")
        .order("created_at", { ascending: false })
        .limit(1);
      if (fedData?.length) setFederationLogo(getLogoUrl(fedData[0].logo_url));

      // league info
      if (state?.league_id) {
        const { data: lData } = await supabase
          .from("nameleague")
          .select("*")
          .eq("id", state.league_id)
          .single();
        if (lData) {
          setLeague(lData);
          setLeagueName(lData.name_league);
        }

        const { data: llogoRows } = await supabase
          .from("league_members")
          .select("logo_url")
          .eq("league_id", state.league_id)
          .order("id", { ascending: false })
          .limit(1);
        if (llogoRows?.length) setLeagueLogo(getLogoUrl(llogoRows[0].logo_url));
      }



      // logged in member
      if (state?.member_id) {
        const { data: m } = await supabase
          .from("league_members")
          .select("*")
          .eq("id", state.member_id)
          .single();
        if (m) setMember(m);
      }

      // all members of the league
      if (state?.league_id) {
        const { data: leagueMembers } = await supabase
          .from("league_members")
          .select("*")
          .eq("league_id", state.league_id);
        setMembers(leagueMembers || []);
      }
    } catch (err) {
      setError(err.message);
      console.error("Error fetching data:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // run fetchData when page loads or club/league changes
  useEffect(() => {
    fetchData();
  }, [selectedClubId, selectedLeagueId]);

	useEffect(() => {
  if (state?.league_id) {
    setSelectedLeagueId(state.league_id.toString());
  }
}, [state?.league_id]);
	useEffect(() => {
  const fetchClubs = async () => {
    const leagueToUse = state?.league_id || selectedLeagueId;
    if (!leagueToUse) return; // no league selected

    const { data, error } = await supabase
      .from("nameclub")
      .select("id, name_club, league_i")
      .eq("league_i", leagueToUse);

    if (error) {
      console.error("Error fetching clubs:", error);
    } else {
      setClubs(data || []);
    }
  };

  fetchClubs();
}, [state?.league_id, selectedLeagueId]);


// load when the page opens
useEffect(() => {
  fetchData();
}, [state?.league_id]);

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

    if (!firstName || !lastName || !dob || !pob || !roleId || !selectedLeagueId || !password || !confirmPassword || !photoFile) {
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
        logo_url: state.logo_url || "",
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

  // ------------------ edit/save ------------------
  const handleEdit = (memberObj) => {
    setEditingId(memberObj.id);
    setEditedMember({ ...memberObj });
  };

const handleSave = async (id) => {
  setSaveLoading(true);
  setError("");
  setSuccess("");
  
  // Validation checks similar to handleSubmit
  if (!editedMember.first_name || !editedMember.last_name || !editedMember.date_of_birth || !editedMember.place_of_birth) {
    const missingFields = [];
    if (!editedMember.first_name) missingFields.push("First Name");
    if (!editedMember.last_name) missingFields.push("Last Name");
    if (!editedMember.date_of_birth) missingFields.push("Date of Birth");
    if (!editedMember.place_of_birth) missingFields.push("Place of Birth");
    
    setError(`Please fill in the following required fields: ${missingFields.join(", ")}`);
    setSaveLoading(false);
    return;
  }

  // National ID validation
  if (editedMember.national_id_number && editedMember.national_id_number.length !== 18) {
    setError("National ID must be exactly 18 digits.");
    setSaveLoading(false);
    return;
  }

  // Age validation - member must be more than 21 years old
  if (editedMember.date_of_birth) {
    const birthDate = new Date(editedMember.date_of_birth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();
    
    // Adjust age if birthday hasn't occurred this year
    const actualAge = (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) ? age - 1 : age;
    
    if (actualAge <= 21) {
      setError("Member must be more than 21 years old.");
      setSaveLoading(false);
      return;
    }
  }
  
  try {
    // Calculate renewal if role or other relevant fields have changed
    const currentYear = new Date().getFullYear();
    const seasonYear = `${currentYear}/${currentYear + 1}`;
    
    // Calculate renewal number
    const renewal = await getNextRenewal(
      editedMember.national_id_number, 
      editedMember.league_id || selectedLeagueId,
      editedMember.role, 
      seasonYear
    );
    
    // Update editedMember with renewal and year
    const { role_id, ...memberWithoutRoleId } = editedMember;
    const updatedMember = {
      ...memberWithoutRoleId,
      renewal: renewal,
      year: seasonYear
    };

    const { error } = await supabase
      .from("league_members")           // <- FIXED
      .update(updatedMember)
      .eq("id", id);

    if (error) {
      setError(`Failed to save member: ${error.message}`);
      setSaveLoading(false);
      return;
    }

    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updatedMember } : m))
    );
    setEditingId(null);
    setSuccess(`Member "${updatedMember.first_name} ${updatedMember.last_name}" has been successfully updated!`);
    setSaveLoading(false);
  } catch (err) {
    setError(`Unexpected error: ${err.message}`);
    setSaveLoading(false);
  }
};
 
  const handleChange = (e, field) => {
    setEditedMember({ ...editedMember, [field]: e.target.value });
  };

  const handleClubSelect = (e) => {
    setSelectedClub(e.target.value);
    setSelectedClubId(e.target.value);
  };

  const handlePrint = () => window.print();

  // ------------------ filtered members (search) ------------------
  const filteredMembers = members.filter((m) => {
    const term = (searchTerm || "").toLowerCase();
    if (!term) return true;
    return (
      (m.first_name || "").toLowerCase().includes(term) ||
      (m.last_name || "").toLowerCase().includes(term) ||
      (m.national_id_number || "").includes(term)
    );
  });

  // ------------------ PDF Export Functions ------------------
  const addGeneralPDFHeader = (doc, federationName, leagueName) => {
    const pageWidth = doc.internal.pageSize.width;
    
    // Add federation logo if available (right aligned)
    if (federationLogo) {
      try {
        doc.addImage(federationLogo, 'PNG', pageWidth - 50, 10, 30, 30);
      } catch (error) {
        console.warn('Could not add federation logo to PDF:', error);
      }
    }

    // Add print date (left aligned)
    const currentDate = new Date().toLocaleDateString();
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Print Date: ${currentDate}`, 20, 20);
    
    // Add federation name (center top)
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Algerian Judo Federation", pageWidth / 2, 20, { align: "center" });
    
    // Add league name (center, below federation name)
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(`League: ${leagueName || "League Name"}`, pageWidth / 2, 35, { align: "center" });
    
    // Add page number (center bottom)
    const pageNumber = doc.internal.getNumberOfPages();
    doc.text(`Page ${pageNumber}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
    
    return 50; // Return Y position for content to start
  };

  const addFederationHeader = (doc, federationName, leagueName, clubName = null) => {
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Add federation logo if available (right aligned)
    if (federationLogo) {
      try {
        doc.addImage(federationLogo, 'PNG', pageWidth - 50, 10, 30, 30);
      } catch (error) {
        console.warn('Could not add federation logo to PDF:', error);
      }
    }

    // Add print date (left aligned)
    const currentDate = new Date().toLocaleDateString();
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Print Date: ${currentDate}`, 20, 20);
    
    // Add federation name
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(federationName || "Federation Name", pageWidth / 2, 20, { align: "center" });
    
    // Add league name
    doc.setFontSize(14);
    doc.text(leagueName || "League Name", pageWidth / 2, 30, { align: "center" });
    
    // Add club name if provided
    if (clubName) {
      doc.setFontSize(12);
      doc.text(clubName, pageWidth / 2, 40, { align: "center" });
    }
    
    // Add page number
    const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Page ${pageNumber}`, pageWidth - 20, pageHeight - 10, { align: "right" });
    
    // Return Y position for content start
    return clubName ? 50 : 40;
  };

  const sanitizeText = (text) => {
    if (!text) return "";
    return String(text)
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
      .replace(/[^\x20-\x7E\u00A0-\u024F\u1E00-\u1EFF]/g, "") // Keep basic Latin and extended Latin
      .trim();
  };

  const prepareGeneralMemberData = (member) => [
    sanitizeText(member.first_name || ""),
    sanitizeText(member.last_name || ""),
    sanitizeText(member.date_of_birth || ""),
    sanitizeText(member.national_id_number || ""),
    sanitizeText(member.club_name || ""),
    sanitizeText(member.grade || ""),
    sanitizeText(member.role || "")
  ];

  const prepareGradeRoleMemberData = (member) => [
    sanitizeText(member.last_name || ""),
    sanitizeText(member.first_name || ""),
    sanitizeText(member.date_of_birth || ""),
    sanitizeText(member.place_of_birth || ""),
    sanitizeText(member.blood_type || ""),
    sanitizeText(member.nationality || ""),
    sanitizeText(member.grade || ""),
    sanitizeText(member.role || ""),
    sanitizeText(member.holder_of || ""),
    sanitizeText(member.national_id_number || ""),
    sanitizeText(member.renewal || ""),
    member.confirmation ? 'Yes' : 'No',
    sanitizeText(member.license_number || ""),
    sanitizeText(member.club_name || "")
  ];

  const exportGeneralPDF = async () => {
    if (!state?.league_id) {
      alert('No league selected');
      return;
    }

    try {
      // Fetch all members for the league
      const { data: allMembers, error: membersError } = await supabase
        .from("league_members")
        .select("*")
        .eq("league_id", state.league_id);

      if (membersError) throw membersError;

      if (!allMembers || allMembers.length === 0) {
        alert('No members found in this league');
        return;
      }

      const doc = new jsPDF('landscape');
      let yPosition = addGeneralPDFHeader(doc, federationName, leagueName);

      // Add centered title
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 0, 0); // Red color
      doc.text('League Members - General Situation', doc.internal.pageSize.getWidth() / 2, yPosition, { align: 'center' });
      doc.setTextColor(0, 0, 0); // Reset to black
      yPosition += 20;

      // Group members by year
      const membersByYear = {};
      allMembers.forEach(member => {
        const year = member.year || 'Unknown Year';
        if (!membersByYear[year]) {
          membersByYear[year] = [];
        }
        membersByYear[year].push(member);
      });

      // Sort years
      const sortedYears = Object.keys(membersByYear).sort();

      // Process each year
      for (const year of sortedYears) {
        const yearMembers = membersByYear[year];
        
        // Sort members within year by registration_date
        const sortedMembers = yearMembers.sort((a, b) => {
          const dateA = new Date(a.registration_date || '1900-01-01');
          const dateB = new Date(b.registration_date || '1900-01-01');
          return dateA - dateB;
        });

        // Add year header
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0); // Black color
        doc.text(`Year: ${year}`, 20, yPosition);
        yPosition += 15;

        // Prepare table data for this year
        const tableData = sortedMembers.map(member => [
          sanitizeText(member.last_name || ""),
          sanitizeText(member.first_name || ""),
          sanitizeText(member.date_of_birth || ""),
          sanitizeText(member.place_of_birth || ""),
          sanitizeText(member.blood_type || ""),
          sanitizeText(member.nationality || ""),
          sanitizeText(member.grade || ""),
          sanitizeText(member.holder_of || ""),
          sanitizeText(member.national_id_number || ""),
          sanitizeText(member.password || ""),
          sanitizeText(member.renewal || ""),
          member.confirmation ? 'Yes' : 'No',
          sanitizeText(member.license_number || "")
        ]);

        autoTable(doc, {
          head: [['Last Name', 'First Name', 'DOB', 'POB', 'Blood Type', 'Nationality', 'Grade', 'Holder Of', 'NID', 'Password', 'Renewal', 'Confirmation', 'License #']],
          body: tableData,
          startY: yPosition,
          styles: {
            fontSize: 5,
            cellPadding: 1,
          },
          headStyles: {
            fillColor: [34, 139, 34], // Green color
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 5
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245]
          },
          margin: { left: 10, right: 10 },
          didDrawPage: function (data) {
            // Add header to each new page
            if (data.pageNumber > 1) {
              addGeneralPDFHeader(doc, federationName, leagueName);
            }
          }
        });

        // Update yPosition for next year
        yPosition = doc.lastAutoTable.finalY + 20;

        // Check if we need a new page
        if (yPosition > doc.internal.pageSize.getHeight() - 50) {
          doc.addPage();
          yPosition = addGeneralPDFHeader(doc, federationName, leagueName);
        }
      }

      const currentDate = new Date().getFullYear();
      doc.save(`league_${sanitizeText(leagueName)}_general_members_${currentDate}.pdf`);
    } catch (error) {
      console.error("Error exporting general PDF:", error);
      alert("Error exporting PDF. Please try again.");
    }
  };

  const exportGradeRolePDF = async () => {
    if (!state?.league_id) {
      alert('No league selected');
      return;
    }

    try {
      // Fetch all members for the league
      const { data: allMembers, error: membersError } = await supabase
        .from("league_members")
        .select("*")
        .eq("league_id", state.league_id);

      if (membersError) throw membersError;

      if (!allMembers || allMembers.length === 0) {
        alert('No members found in this league');
        return;
      }

      const doc = new jsPDF('landscape');
      let currentY = addFederationHeader(doc, federationName, leagueName);
      let yPosition = currentY;

      // Add centered title
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 0, 0); // Red color
      doc.text('League Members - Grade and Role Situation', doc.internal.pageSize.getWidth() / 2, yPosition, { align: 'center' });
      doc.setTextColor(0, 0, 0); // Reset to black
      yPosition += 20;

      // Group members by year and club (needed for sections)
      const membersByYear = {};
      allMembers.forEach(member => {
        const year = member.year || 'Unknown Year';
        const club = member.club_name || 'No Club';
        
        if (!membersByYear[year]) {
          membersByYear[year] = {};
        }
        if (!membersByYear[year][club]) {
          membersByYear[year][club] = [];
        }
        membersByYear[year][club].push(member);
      });

      // Add roles section
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0); // Black color
      doc.text('SECTION ROLE', 20, yPosition);
      yPosition += 25;

      // Group members by year first, then by role
      for (const [year, clubsInYear] of Object.entries(membersByYear)) {
        if (Object.keys(clubsInYear).length === 0) continue;

        // Year header for roles section
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0); // Black color for year
        doc.text(`Year: ${year}`, 20, yPosition);
        yPosition += 15;

        // Collect all members for this year and group by role
        const allMembersInYear = [];
        for (const [club, members] of Object.entries(clubsInYear)) {
          allMembersInYear.push(...members);
        }

        // Group by role within this year
        const membersByRole = {};
        allMembersInYear.forEach(member => {
          const role = member.role || 'No Role';
          if (!membersByRole[role]) {
            membersByRole[role] = [];
          }
          membersByRole[role].push(member);
        });

        // Process each role within this year
        for (const [role, roleMembers] of Object.entries(membersByRole)) {
          if (roleMembers.length === 0) continue;

          // Role header
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(`Role: ${sanitizeText(role)}`, 30, yPosition);
          yPosition += 8;

            // Prepare table data for this role
            const roleTableData = roleMembers.map(member => prepareGradeRoleMemberData(member));

            autoTable(doc, {
              head: [['Last Name', 'First Name', 'DOB', 'POB', 'Blood Type', 'Nationality', 'Grade', 'Role', 'Holder Of', 'NID', 'Renewal', 'Confirmation', 'License #' ]],
              body: roleTableData,
              startY: yPosition,
              styles: {
                fontSize: 5,
                cellPadding: 1,
              },
              headStyles: {
                fillColor: [34, 139, 34], // Green color
                textColor: 255,
                fontStyle: 'bold',
                fontSize: 5
              },
              alternateRowStyles: {
                fillColor: [245, 245, 245]
              },
              margin: { left: 20, right: 10 }
            });

            yPosition = doc.lastAutoTable.finalY + 15;

            // Check if we need a new page for the next role
            if (yPosition > 160) {
              doc.addPage();
              yPosition = addFederationHeader(doc, federationName, leagueName) + 5;
            }
          }

          // Add space between years
          yPosition += 10;
        }

      // Add grades section
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0); // Black color
      doc.text('SECTION GRADE', 20, yPosition);
      yPosition += 25;

      // Group members by year first, then by grade
      for (const [year, clubsInYear] of Object.entries(membersByYear)) {
        if (Object.keys(clubsInYear).length === 0) continue;

        // Year header for grades section
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0); // Black color for year
        doc.text(`Year: ${year}`, 20, yPosition);
        yPosition += 15;

        // Collect all members for this year and group by grade
        const allMembersInYear = [];
        for (const [club, members] of Object.entries(clubsInYear)) {
          allMembersInYear.push(...members);
        }

        // Group by grade within this year
        const membersByGrade = {};
        allMembersInYear.forEach(member => {
          const grade = member.grade || 'No Grade';
          if (!membersByGrade[grade]) {
            membersByGrade[grade] = [];
          }
          membersByGrade[grade].push(member);
        });

        // Process each grade within this year
        for (const [grade, gradeMembers] of Object.entries(membersByGrade)) {
          if (gradeMembers.length === 0) continue;

          // Grade header
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(`Grade: ${sanitizeText(grade)}`, 30, yPosition);
          yPosition += 8;

            // Prepare table data for this grade
            const gradeTableData = gradeMembers.map(member => prepareGradeRoleMemberData(member));

            autoTable(doc, {
              head: [['Last Name', 'First Name', 'DOB', 'POB', 'Blood Type', 'Nationality', 'Grade', 'Role', 'Holder Of', 'NID', 'Renewal', 'Confirmation', 'License #']],
              body: gradeTableData,
              startY: yPosition,
              styles: {
                fontSize: 5,
                cellPadding: 1,
              },
              headStyles: {
                fillColor: [34, 139, 34], // Green color
                textColor: 255,
                fontStyle: 'bold',
                fontSize: 5
              },
              alternateRowStyles: {
                fillColor: [245, 245, 245]
              },
              margin: { left: 20, right: 10 }
            });

            yPosition = doc.lastAutoTable.finalY + 15;

            // Check if we need a new page for the next grade
            if (yPosition > 160) {
              doc.addPage();
              yPosition = addFederationHeader(doc, federationName, leagueName) + 5;
            }
          }

          // Add space between years
          yPosition += 10;
        }

      const currentDate = new Date().getFullYear();
      doc.save(`league_${sanitizeText(leagueName)}_grade_role_members_${currentDate}.pdf`);
    } catch (error) {
      console.error("Error exporting grade role PDF:", error);
      alert("Error exporting PDF. Please try again.");
    }
  };

  // Show rotation selection modal
  const handleExportPDF = (data) => {
    if (!data || Object.keys(data).length === 0) {
      alert('No data available to export');
      return;
    }
    exportPDFWithAutoOrientation(data);
  };

  // Individual member PDF export function with automatic orientation
  const exportPDFWithAutoOrientation = async (data) => {
    
    // Fetch club and league names
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
    
    // Create a new PDF document
    const doc = new jsPDF('portrait', 'mm', 'a4');
    
    // Add federation header
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text('Algerian Judo Federation', 14, 15);
    
    // Add title
    const title = `Member Information - ${data.first_name} ${data.last_name}`;
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text(title, 14, 30);
    
    // Add timestamp
    doc.setFontSize(10);
    const timestamp = new Date().toLocaleString();
    doc.text(`Generated: ${timestamp}`, 14, 37);

    // Add logo if provided
    if (federationLogo) {
      try {
        doc.addImage(federationLogo, 'PNG', 170, 10, 25, 25);
      } catch (error) {
        console.error('Error adding logo to PDF:', error);
      }
    }

    // Add member photo if available
    let startY = 70;
    if (data.photo_url) {
      try {
        const fixedPhoto = await normalizeImage(data.photo_url);
        // Determine image format based on whether it's a data URL or regular URL
        const imageFormat = fixedPhoto.startsWith('data:') ? "PNG" : "JPEG";
        doc.addImage(fixedPhoto, imageFormat, 14, 45, 25, 20);
        startY = 70;
      } catch (error) {
        console.error("Error adding photo to PDF:", error);
        // If all else fails, try to add the original image directly
        try {
          doc.addImage(data.photo_url, "JPEG", 14, 45, 25, 20);
        } catch (fallbackError) {
          console.error("Fallback image addition also failed:", fallbackError);
        }
        startY = 70;
      }
    }

    // Add confirmation status
    doc.setFontSize(12);
    if (data.confirmation) {
      doc.setTextColor(0, 128, 0); // Green for confirmed
    } else {
      doc.setTextColor(255, 0, 0); // Red for not confirmed
    }
    const confirmationText = data.confirmation ? "CONFIRMED ✓" : "NOT CONFIRMED ✗";
    doc.text(confirmationText, 160, 50);
    
    // Prepare member data for table
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
      ['License Number', data.license_number || ''],
      ['Registration Date', data.registration_date || ''],
      ['Year', data.year || ''],
      ['Renewal', data.renewal || '']
    ];
    
    // Add member information table
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

    // Add medical certificate text under the table
    const finalY = doc.lastAutoTable.finalY || 200;
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("Medical certificate", 14, finalY + 20);

    // Add space for signature
    doc.setDrawColor(0);
    doc.line(14, finalY + 40, 80, finalY + 40); // Signature line

    // Add club and league information if available
    doc.setFontSize(10);

   

    // Display league information
    if (data.league_id || fetchedLeagueName) {
      const displayLeagueName = fetchedLeagueName || `ID: ${data.league_id}`;
      doc.text(`League: ${displayLeagueName}`, 120, finalY + 60);
      doc.text("League Visa: _________________", 120, finalY + 70);
    }

    // Add QR code at the bottom of the page
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
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      // Add QR code aligned with League Visa line (very small size: 15x15)
      doc.addImage(qrCodeDataURL, 'PNG', 175, finalY + 75, 15, 15);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }

    // Save the PDF
    doc.save(`member_${data.first_name}_${data.last_name}.pdf`);
  };

  // ------------------ UI state guards ------------------
  if (!state) return <p>No account data found.</p>;

  return (
    <div className="app-container">
      {loading && <BarLoading />}
      {/* HEADER Fédération + League */}
      <header>
        <div className="federation-header">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <img src={federationLogo || logo} alt="Federation Logo" className="federation-logo" />
            <h1 className="federation-title">{federationName}</h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {state.logo_url ? (
              <img src={state.logo_url} alt="League Logo" className="member-logo" />
            ) : null}
            <h2 className="federation-title" style={{ fontSize: "1.5rem" }}>
              {leagueName || "League Name"}
            </h2>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <section className="app-container">
        <h2>
          Welcome {state.first_name} {state.last_name}
        </h2>
        <p>
          <strong>Role:</strong> {state.role}
        </p>

        <div className="form-table-wrapper">
          <div className="sticky-button-bar">
            <BackHomeButton />
            <button
  className="primary-btn"
  data-id="1"
  onClick={async (e) => {
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
  data-id="2"
  onClick={async (e) => {
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
  data-id="3"
  onClick={async (e) => {
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

          </div>

          {/* Add member form */}
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
              League Logo
              <input type="text" value={state.logo_url || ""} disabled />
            </label>
            <div className="btn-row">
              <button type="submit" className="primary-b" disabled={submitLoading}>
                {submitLoading ? "Adding..." : "Add Member"}
              </button>
              {submitLoading && <CircleLoading message="Adding member..." />}
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

          {/* Filters */}
          <h2 className="form-title">List Of League Members</h2>
          <div className="form-grid">
            <label>
              League
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

        {/* Table */}
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
        <th>League ID</th>
        <th>Actions</th>
      </tr>
    </thead>

    <tbody>
      {filteredMembers.length === 0 ? (
        <tr>
          <td colSpan={18}>No members found.</td>
        </tr>
      ) : (
        filteredMembers.map((m) => (
          <tr 
            key={m.id}
            onDoubleClick={() => handleExportPDF(m)}
            style={{ cursor: 'pointer' }}
          >
            <td>
              {editingId === m.id ? (
                <input
                  value={editedMember.last_name || ""}
                  onChange={(e) => handleChange(e, "last_name")}
                />
              ) : (
                m.last_name
              )}
            </td>

            <td>
              {editingId === m.id ? (
                <input
                  value={editedMember.first_name || ""}
                  onChange={(e) => handleChange(e, "first_name")}
                />
              ) : (
                m.first_name
              )}
            </td>

            <td>
              {editingId === m.id ? (
                <input
                  type="date"
                  value={editedMember.date_of_birth || ""}
                  onChange={(e) => handleChange(e, "date_of_birth")}
                />
              ) : (
                m.date_of_birth
              )}
            </td>

            <td>
              {editingId === m.id ? (
                <input
                  value={editedMember.place_of_birth || ""}
                  onChange={(e) => handleChange(e, "place_of_birth")}
                />
              ) : (
                m.place_of_birth
              )}
            </td>

            <td>
              {editingId === m.id ? (
                <select
                  value={editedMember.role || ""}
                  onChange={(e) => handleChange(e, "role")}
                >
                  <option value="">-- Select --</option>
                  {roles.map((r) => (
                    <option
                      key={r.id}
                      value={r.league_role ?? r.name ?? ""}
                    >
                      {r.league_role ?? r.name ?? ""}
                    </option>
                  ))}
                </select>
              ) : (
                m.role || 'No Role'
              )}
            </td>

            <td>
              {editingId === m.id ? (
                <select
                  value={editedMember.blood_type || ""}
                  onChange={(e) => handleChange(e, "blood_type")}
                >
                  <option value="">--</option>
                  <option>A+</option>
                  <option>A-</option>
                  <option>B+</option>
                  <option>B-</option>
                  <option>AB+</option>
                  <option>AB-</option>
                  <option>O+</option>
                  <option>O-</option>
                </select>
              ) : (
                m.blood_type
              )}
            </td>

            <td>
              {editingId === m.id ? (
                <select
                  value={editedMember.nationality || ""}
                  onChange={(e) => handleChange(e, "nationality")}
                >
                  <option value="">-- Select --</option>
                  <option>Algerian</option>
                  <option>Tunisian</option>
                </select>
              ) : (
                m.nationality
              )}
            </td>

            <td>
              {editingId === m.id ? (
                <select
                  value={editedMember.grade || ""}
                  onChange={(e) => handleChange(e, "grade")}
                >
                  <option value="">-- Select --</option>
                  <option>Brown Belt</option>
                  <option>Black Belt</option>
                </select>
              ) : (
                m.grade
              )}
            </td>

            <td>
              {editingId === m.id ? (
                <input
                  value={editedMember.holder_of || ""}
                  onChange={(e) => handleChange(e, "holder_of")}
                />
              ) : (
                m.holder_of
              )}
            </td>

            <td>{m.national_id_number}</td>
            <td>{m.renewal}</td>
            <td>{m.year}</td>
            <td>{m.license_number}</td>
            <td>{m.registration_date}</td>

            <td>
              {m.photo_url ? (
                <img
                  src={getLogoUrl(m.photo_url)}
                  alt="Member"
                  style={{
                    width: 50,
                    height: 50,
                    objectFit: "cover",
                    borderRadius: "50%",
                  }}
                />
              ) : (
                "No Photo"
              )}
            </td>

            <td>{m.confirmation ? "✅" : "❌"}</td>
            <td>{m.league_id}</td>

            <td>
              {editingId === m.id ? (
                <>
                  <button
                    className="primary-S"
                    onClick={() => handleSave(m.id)}
                    disabled={saveLoading}
                  >
                    {saveLoading ? "Saving..." : "Save"}
                  </button>
                  <button
                    className="secondary-btn"
                    onClick={cancelEdit}
                    disabled={saveLoading}
                  >
                    Cancel
                  </button>
                  {saveLoading && <CircleLoading message="Saving changes..." />}
                </>
              ) : (
                <>
                  <button
                    className="primary-M"
                    onClick={() => handleEdit(m)}
                  >
                    Modify
                  </button>
                  <button
                    className="secondary-btn"
                    onClick={() => handleDelete(m)}
                  >
                    Delete
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
          <BackHomeButton />
           <button className="primary-b"
              onClick={exportGeneralPDF}
            >
              Export General PDF
            </button>
            <button className="primary-b"
              onClick={exportGradeRolePDF}
            >
              Export Grade Role PDF
            </button>
        </div>
         
      </section>

      {/* NAVIGATION */}
      <Navigation />

      <footer className="footer" style={{ backgroundColor: "red" }}>
        <p>&copy; 2025 Algerian Judo Federation. All rights reserved.</p>
      </footer>
    </div>
  );
}


