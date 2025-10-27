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
import CircleLoading from './components/CircleLoading';

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
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  // Fetch federation roles for the Role select
  useEffect(() => {
    const fetchFederationRoles = async () => {
      try {
        const { data, error } = await supabase
          .from('federationrole')
          .select('federation_role')
          .order('federation_role', { ascending: true });
        if (error) {
          console.warn('Failed to fetch federation roles, using fallback:', error);
          setFederationRoles([
            { federation_role: 'President' },
            { federation_role: 'Vice President' },
            { federation_role: 'Secretary' },
            { federation_role: 'Treasurer' },
            { federation_role: 'Coach' },
            { federation_role: 'Referee' },
          ]);
          return;
        }
        const roles = (data || []).map(r => ({ federation_role: r.federation_role }));
        setFederationRoles(roles);
      } catch (err) {
        console.warn('Exception fetching federation roles, using fallback:', err);
        setFederationRoles([
          { federation_role: 'President' },
          { federation_role: 'Vice President' },
          { federation_role: 'Secretary' },
          { federation_role: 'Treasurer' },
          { federation_role: 'Coach' },
          { federation_role: 'Referee' },
        ]);
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

  // ------------------ renewal helper (federation members) ------------------
  const getNextRenewal = async (nidVal, roleVal, currentSeasonYear, excludeMemberId = null) => {
    // Check if member already exists in current year, excluding the current row if editing
    let existingQuery = supabase
      .from("members")
      .select("id")
      .eq("national_id_number", nidVal)
      .eq("role", roleVal)
      .eq("year", currentSeasonYear);

    if (excludeMemberId) {
      existingQuery = existingQuery.neq("id", excludeMemberId);
    }

    const { data: existingInCurrentYear, error: existingErr } = await existingQuery;
    if (existingErr) throw existingErr;
    if (existingInCurrentYear && existingInCurrentYear.length > 0) {
      throw new Error("This member is already registered for the current season with the same role.");
    }

    // Count total registrations across all years for this combination, excluding current row if editing
    let countQuery = supabase
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("national_id_number", nidVal)
      .eq("role", roleVal);

    if (excludeMemberId) {
      countQuery = countQuery.neq("id", excludeMemberId);
    }

    const { count, error: countErr } = await countQuery;
    if (countErr) throw countErr;
    return (count || 0) + 1;
  };

  // ------------------ form submit ------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitLoading(true);

    // Validate required fields similar to League
    if (!firstName || !lastName || !dob || !pob || !selectedFederationRole || !password || !confirmPassword || !photoFile) {
      const missingFields = [];
      if (!firstName) missingFields.push("First Name");
      if (!lastName) missingFields.push("Last Name");
      if (!dob) missingFields.push("Date of Birth");
      if (!pob) missingFields.push("Place of Birth");
      if (!selectedFederationRole) missingFields.push("Federation Role");
      if (!password) missingFields.push("Password");
      if (!confirmPassword) missingFields.push("Confirm Password");
      if (!photoFile) missingFields.push("Member Photo");
      setError(`Please fill in the following required fields: ${missingFields.join(", ")}`);
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
    const actualAge = (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) ? age - 1 : age;
    if (actualAge <= 21) {
      setError("Member must be more than 21 years old to register.");
      setSubmitLoading(false);
      return;
    }

    // Check if a member with the same last name and password already exists
    try {
      const { data: existingMembers, error: checkError } = await supabase
        .from("members")
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
      const currentYear = new Date().getFullYear();
      const seasonYear = `${currentYear}/${currentYear + 1}`;

      const renewal = await getNextRenewal(nid, selectedFederationRole, seasonYear);

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
        renewal: renewal,
      };

      const { error: insertError } = await supabase.from("members").insert([newMember]);
      if (insertError) {
        const errMsg = insertError.message || '';
        if (errMsg.includes('members_national_id_number_key')) {
          setError('National ID already exists. Duplicates are currently blocked by the database.');
        } else {
          setError(`❌ Failed to add member: ${errMsg}`);
        }
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
        await fetchMembers();
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
    setDeleteLoading(true);
    setError("");
    setSuccess("");
    try {
      const member = members.find((m) => m.id === id);
      const { error } = await supabase.from("members").delete().eq("id", id);
      if (error) {
        setError(`Error deleting member: ${error.message}`);
      } else {
        setMembers((prev) => prev.filter((m) => m.id !== id));
        const nameLabel = member ? `${member.first_name || ''} ${member.last_name || ''}`.trim() : `ID ${id}`;
        setSuccess(`Member "${nameLabel}" deleted successfully.`);
      }
    } catch (err) {
      setError(`Unexpected error during delete: ${err.message}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Enable edit mode
  const handleEdit = (member) => {
    setEditingId(member.id);
    setEditedMember({ ...member });
  };

  // Cancel edit mode
  const cancelEdit = () => {
    setEditingId(null);
    setEditedMember({});
  };

  // Save changes (refactored to mirror League logic)
  const [saveLoading, setSaveLoading] = useState(false);
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
      const actualAge = (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) ? age - 1 : age;
      if (actualAge <= 21) {
        setError("Member must be more than 21 years old.");
        setSaveLoading(false);
        return;
      }
    }

    try {
      const currentYear = new Date().getFullYear();
      const seasonYear = `${currentYear}/${currentYear + 1}`;

      // Determine if key fields unchanged to avoid duplicate checks on the same row
      const targetId = (id ?? editedMember.id ?? editingId) ?? null; // use UUID string
      const originalMember = members.find((m) => String(m.id) === String(targetId));
      const isKeyFieldsUnchanged = !!originalMember &&
        (originalMember.national_id_number === editedMember.national_id_number) &&
        (originalMember.role === editedMember.role) &&
        (originalMember.year === seasonYear);

      const renewal = isKeyFieldsUnchanged
        ? originalMember.renewal
        : await getNextRenewal(
            editedMember.national_id_number,
            editedMember.role,
            seasonYear,
            targetId
          );

      const updatedMember = {
        ...editedMember,
        renewal,
        year: isKeyFieldsUnchanged ? originalMember.year : seasonYear,
      };

      if (!targetId) {
        setError("Invalid member id.");
        setSaveLoading(false);
        return;
      }

      const { error } = await supabase
        .from("members")
        .update(updatedMember)
        .eq("id", targetId); // use UUID string for id equality

      if (error) {
        const errMsg = error.message || '';
        if (errMsg.includes('members_national_id_number_key')) {
          setError('National ID already exists. Duplicates are currently blocked by the database.');
        } else {
          setError(`Error updating member: ${errMsg}`);
        }
        setSaveLoading(false);
        return;
      }

      setMembers((prev) => prev.map((m) => (String(m.id) === String(targetId) ? { ...m, ...updatedMember } : m)));
      setEditingId(null);
      setSuccess(`Member "${updatedMember.first_name} ${updatedMember.last_name}" has been successfully updated!`);
      setSaveLoading(false);
    } catch (err) {
      setError(`Unexpected error: ${err.message}`);
      setSaveLoading(false);
    }
  };

  // Handle input changes
  const handleChange = (e, field) => {
    setEditedMember({ ...editedMember, [field]: e.target.value });
  };

  const handlePrint = async () => {
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

      const allMembers = Array.isArray(data) ? data : [];
      if (!allMembers.length) {
        alert('No members found');
        return;
      }

      const doc = new jsPDF('landscape');

      // Local header helper (mirrors TheLeagueListAddFed)
      const addGeneralPDFHeaderLocal = (doc) => {
        const pageWidth = doc.internal.pageSize.width;
        try {
          const hasFedLogo = typeof federationLogo !== 'undefined' && federationLogo;
          const hasLogo = typeof logo !== 'undefined' && logo;
          if (hasFedLogo) {
            doc.addImage(hasFedLogo, 'PNG', pageWidth - 50, 10, 30, 30);
          } else if (hasLogo) {
            doc.addImage(hasLogo, 'PNG', pageWidth - 50, 10, 30, 30);
          }
        } catch (err) {
          console.warn('Could not add logo to PDF header:', err);
        }
        const currentDate = new Date().toLocaleDateString();
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Print Date: ${currentDate}`, 14, 18);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Algerian Judo Federation', pageWidth / 2, 24, { align: 'center' });
        return 40;
      };

      const prepareGeneralRow = (member) => {
        const registrationVal = member.registration || member.registration_date || '';
        return [
          sanitizeText(member.last_name || ''),
          sanitizeText(member.first_name || ''),
          sanitizeText(member.date_of_birth || ''),
          sanitizeText(member.place_of_birth || ''),
          sanitizeText(member.role || ''),
          sanitizeText(member.blood_type || ''),
          sanitizeText(member.nationality || ''),
          sanitizeText(member.grade || ''),
          sanitizeText(member.holder_of || ''),
          sanitizeText(member.national_id_number || ''),
          sanitizeText(member.renewal || ''),
          sanitizeText(member.license_number || ''),
          sanitizeText(registrationVal),
          member.confirmation ? 'Yes' : 'No',
          sanitizeText(member.password || ''),
          String(member.league_id || '')
        ];
      };

      const headersGeneral = ['Last', 'First', 'DOB', 'POB', 'Role', 'Blood', 'Nationality', 'Grade', 'Holder Of', 'NID', 'Renewal', 'License #', 'Registration', 'Confirmation', 'Password', 'League ID'];

      let yPosition = addGeneralPDFHeaderLocal(doc);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 0, 0);
      doc.text('Federation Members - General Situation', doc.internal.pageSize.getWidth() / 2, yPosition, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      yPosition += 20;

      // Group by Year
      const membersByYear = {};
      allMembers.forEach(m => {
        const yr = m.year ? String(m.year) : 'Unknown Year';
        if (!membersByYear[yr]) membersByYear[yr] = [];
        membersByYear[yr].push(m);
      });

      const years = Object.keys(membersByYear).sort();
      years.forEach((yearLabel, idx) => {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`Year: ${yearLabel}`, 14, yPosition);
        yPosition += 8;

        autoTable(doc, {
          head: [headersGeneral],
          body: membersByYear[yearLabel].map(prepareGeneralRow),
          startY: yPosition,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [0, 128, 0], textColor: [255, 255, 255] },
          margin: { left: 14, right: 10 }
        });

        yPosition = doc.lastAutoTable.finalY + 10;
        if (yPosition > doc.internal.pageSize.getHeight() - 50 && idx < years.length - 1) {
          doc.addPage();
          yPosition = addGeneralPDFHeaderLocal(doc);
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 0, 0);
          doc.text('Federation Members - General Situation', doc.internal.pageSize.getWidth() / 2, yPosition, { align: 'center' });
          doc.setTextColor(0, 0, 0);
          yPosition += 20;
        }
      });

      const currentYear = new Date().getFullYear();
      doc.save(`federation_members_general_${currentYear}.pdf`);
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
    const title = `Federation Member Information - ${data.first_name || ''} ${data.last_name || ''}`.trim();
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
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('members')
        .select('*');
      if (error) throw error;

      const membersData = Array.isArray(data) ? data : [];
      if (!membersData.length) {
        alert('No members found');
        setLoading(false);
        return;
      }

      const doc = new jsPDF('landscape');

      // Local header helper (mirrors TheLeagueListAddFed)
      const addGeneralPDFHeaderLocal = (doc) => {
        const pageWidth = doc.internal.pageSize.width;
        try {
          if (federationLogo) {
            doc.addImage(federationLogo, 'PNG', pageWidth - 50, 10, 30, 30);
          } else if (logo) {
            doc.addImage(logo, 'PNG', pageWidth - 50, 10, 30, 30);
          }
        } catch (err) {
          console.warn('Could not add logo to PDF header:', err);
        }
        const currentDate = new Date().toLocaleDateString();
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Print Date: ${currentDate}`, 14, 18);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Algerian Judo Federation', pageWidth / 2, 24, { align: 'center' });
        return 40;
      };

      const prepareGradeRoleRow = (member) => [
        sanitizeText(member.last_name || ''),
        sanitizeText(member.first_name || ''),
        sanitizeText(member.date_of_birth || ''),
        sanitizeText(member.place_of_birth || ''),
        sanitizeText(member.blood_type || ''),
        sanitizeText(member.nationality || ''),
        sanitizeText(member.grade || ''),
        sanitizeText(member.role || ''),
        sanitizeText(member.holder_of || ''),
        sanitizeText(member.national_id_number || ''),
        sanitizeText(member.renewal || ''),
        member.confirmation ? 'Yes' : 'No',
        sanitizeText(member.license_number || '')
      ];

      let yPosition = addGeneralPDFHeaderLocal(doc);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 0, 0);
      doc.text('Federation Members - Grade and Role Situation', doc.internal.pageSize.getWidth() / 2, yPosition, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      yPosition += 20;

      // Group by Year only (no Club references)
      const membersByYear = {};
      membersData.forEach(member => {
        const year = member.year || 'Unknown Year';
        if (!membersByYear[year]) membersByYear[year] = [];
        membersByYear[year].push(member);
      });

      const years = Object.keys(membersByYear).sort();
      years.forEach((yearLabel, yearIdx) => {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Year ${sanitizeText(yearLabel)}`, 14, yPosition);
        yPosition += 10;

        const membersInYear = membersByYear[yearLabel];

        // Roles grouping
        const byRole = {};
        membersInYear.forEach(m => {
          const role = m.role || 'No Role';
          if (!byRole[role]) byRole[role] = [];
          byRole[role].push(m);
        });

        Object.entries(byRole).forEach(([role, roleMembers]) => {
          if (!roleMembers.length) return;
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(`Role: ${sanitizeText(role)}`, 18, yPosition);
          yPosition += 6;

          autoTable(doc, {
            head: [['Last Name', 'First Name', 'DOB', 'POB', 'Blood Type', 'Nationality', 'Grade', 'Role', 'Holder Of', 'NID', 'Renewal', 'Confirmation', 'License #']],
            body: roleMembers.map(prepareGradeRoleRow),
            startY: yPosition,
            styles: { fontSize: 5, cellPadding: 1 },
            headStyles: { fillColor: [34, 139, 34], textColor: 255, fontStyle: 'bold', fontSize: 5 },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            margin: { left: 14, right: 10 }
          });

          yPosition = doc.lastAutoTable.finalY + 12;
          if (yPosition > 160) {
            doc.addPage();
            yPosition = addGeneralPDFHeaderLocal(doc);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`Year ${sanitizeText(yearLabel)}`, 14, yPosition);
            yPosition += 10;
          }
        });

        // Grades grouping
        const byGrade = {};
        membersInYear.forEach(m => {
          const grade = m.grade || 'No Grade';
          if (!byGrade[grade]) byGrade[grade] = [];
          byGrade[grade].push(m);
        });

        Object.entries(byGrade).forEach(([grade, gradeMembers]) => {
          if (!gradeMembers.length) return;
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(`Grade: ${sanitizeText(grade)}`, 18, yPosition);
          yPosition += 6;

          autoTable(doc, {
            head: [['Last Name', 'First Name', 'DOB', 'POB', 'Blood Type', 'Nationality', 'Grade', 'Role', 'Holder Of', 'NID', 'Renewal', 'Confirmation', 'License #']],
            body: gradeMembers.map(prepareGradeRoleRow),
            startY: yPosition,
            styles: { fontSize: 5, cellPadding: 1 },
            headStyles: { fillColor: [34, 139, 34], textColor: 255, fontStyle: 'bold', fontSize: 5 },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            margin: { left: 14, right: 10 }
          });

          yPosition = doc.lastAutoTable.finalY + 12;
          if (yPosition > 160) {
            doc.addPage();
            yPosition = addGeneralPDFHeaderLocal(doc);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`Year ${sanitizeText(yearLabel)}`, 14, yPosition);
            yPosition += 10;
          }
        });

        yPosition += 8;
      });

      const currentYear = new Date().getFullYear();
      doc.save(`federation_members_grade_role_${currentYear}.pdf`);
      setLoading(false);
    } catch (e) {
      console.error('Exception exporting role-focused PDF:', e);
      setError(e);
      setLoading(false);
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

  

  // Keep rendering and show overlays instead of short-circuiting on errors

  return (
    <div className="app-container">
      {loading && <BarLoading />}
      {(submitLoading || saveLoading || deleteLoading) && (
        <CircleLoading message={submitLoading ? "Adding member..." : saveLoading ? "Saving changes..." : "Deleting member..."} />
      )}
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
              <input type="text" value={nid} onChange={(e) => setNid(e.target.value)} maxLength="18" minLength="18" required />
               <small>18 digits required — must be unique. </small>
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
              <select value={nationality} onChange={(e) => setNationality(e.target.value)} required>
                <option value="">-- Select --</option>
                <option>Algerian</option>
                <option>Tunisian</option>
                <option>Moroccan</option>
              </select>
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
                        <label>
                        
                          <select
                            value={editedMember.role || ""}
                            onChange={(e) => handleChange(e, "role")}
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
                        <>
                          <button className="primary-S" onClick={() => handleSave(member.id)}>
                            Save
                          </button>
                          <button className="secondary-btn" onClick={cancelEdit} disabled={saveLoading}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="primary-M" onClick={() => handleEdit(member)}>
                            Modify
                          </button>
                          <button className="secondary-btn" onClick={() => handleDelete(member.id)}>
                            Delete
                          </button>
                          <button className={member.confirmation ? "cancel-btn" : "confirm-btn"} onClick={() => toggleConfirmation(member.id, !!member.confirmation)}>
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
          <BackHomeButton />
          <button className="primary-b" onClick={handlePrint}>Export General PDF</button>
          <button className="primary-b" onClick={handleGradeRoleExport}>Export Grade/Role PDF</button>
           
        </div>
       
       
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
