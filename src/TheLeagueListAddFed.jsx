import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";
import Navigation from "./Navigation";
import PhotosLogoPublication from "./PhotosLogoPublication";
import "./index.css";
import BackHomeButton from "./BackHomeButton";
import { Shield } from "lucide-react";
import logo from "./assets/logo.png"; 
// Removed ExportDataButton per request
import { useDragScroll } from './useDragScroll';
import { initializePrimaryButtons, handlePrimaryButtonClick } from './primaryButtonHandler';
import ErrorOverlay from './components/ErrorOverlay';
import SuccessOverlay from './components/SuccessOverlay';
import BarLoading from './components/BarLoading';
import CircleLoading from './components/CircleLoading';
import { exportToPDF, fetchClubNames, fetchLeagueNames } from './ExportUtils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { sanitizeText } from './ExportUtils';
import QRCode from 'qrcode';
import loadImage from 'blueimp-load-image';

export default function TheLeagueListAddFed() {
  // Initialize active state for primary buttons
  useEffect(() => {
    initializePrimaryButtons();
  }, []);
  const [members, setMembers] = useState([]);
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [dob, setDob] = useState("");
  const [pob, setPob] = useState("");
  const [roleId, setRoleId] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [nid, setNid] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [nationality, setNationality] = useState("");
  const [holderOf, setHolderOf] = useState("");
  const [grade, setGrade] = useState("");
 const [selectedLeagueId, setSelectedLeagueId] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editedMember, setEditedMember] = useState({});
  const [leagues, setLeagues] = useState([]);
  const [leagueLogo, setLeagueLogo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");

  const [federationLogo, setFederationLogo] = useState(null);
  const [federationName, setFederationName] = useState("Algerian Judo Federation");
  const [roles, setRoles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const navigate = useNavigate();
  const tableRef = useDragScroll();
  

  // fetch leagues
useEffect(() => {
  const fetchLeagues = async () => {
    const { data, error } = await supabase.from("nameleague").select("*");
    if (!error && data) setLeagues(data);
    setLoading(false);
  };
  fetchLeagues();
}, []);

// fetch roles
useEffect(() => {
  const fetchRoles = async () => {
    const { data, error } = await supabase.from("leaguerole").select("*");
    if (!error && data) setRoles(data);
  };
  fetchRoles();
}, []);

// fetch league members when league changes
useEffect(() => {
  const fetchMembers = async () => {
    if (!selectedLeagueId) {
      // When no league is selected, don't clear; let full-table loader handle it
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("league_members")
      .select("*")
      .eq("league_id", Number(selectedLeagueId));

    if (error) {
      setError(`Error fetching members: ${error.message}`);
    } else {
      setMembers(data || []);
    }
    setLoading(false);
  };

  
  // Export General PDF filtered for Year 1
  const exportGeneralPDFYear1 = async () => {
    const lid = Number(selectedLeagueId);

    try {
      let { data: allMembers, error: membersError } = await supabase
        .from("league_members")
        .select("*");

      if (membersError) throw membersError;
      allMembers = allMembers || [];

      // Filter by selected league if provided
      const leagueFiltered = (!lid || isNaN(lid))
        ? allMembers
        : allMembers.filter(m => Number(m.league_id) === lid);

      const year1Members = leagueFiltered.filter(m => coerceSeasonYear(m.year) === 1);
      if (year1Members.length === 0) {
        alert('No Year 1 members found');
        return;
      }

      const doc = new jsPDF('landscape');
      let yPosition = addGeneralPDFHeader(doc);

      // Title
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 0, 0);
      doc.text('League Members - Year 1', doc.internal.pageSize.getWidth() / 2, yPosition, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      yPosition += 20;

      const headersYear = ['Last', 'First', 'DOB', 'POB', 'Role', 'Blood', 'Nationality', 'Grade', 'Holder Of', 'NID', 'Renewal', 'License #', 'Registration', 'Confirmation', 'Password', 'League ID'];

      autoTable(doc, {
        head: [headersYear],
        body: year1Members.map(prepareYearFilteredGeneralData),
        startY: yPosition,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [0, 128, 0], textColor: [255, 255, 255] }
      });

      const currentYear = new Date().getFullYear();
      doc.save(`league_general_year1_${currentYear}.pdf`);
    } catch (error) {
      console.error('Error exporting Year 1 general PDF:', error);
      alert('Error exporting Year 1 PDF. Please try again.');
    }
  };

  // Export General PDF filtered for Years 2+
  const exportGeneralPDFYears2 = async () => {
    const lid = Number(selectedLeagueId);

    try {
      let { data: allMembers, error: membersError } = await supabase
        .from("league_members")
        .select("*");

      if (membersError) throw membersError;
      allMembers = allMembers || [];

      // Filter by selected league if provided
      const leagueFiltered = (!lid || isNaN(lid))
        ? allMembers
        : allMembers.filter(m => Number(m.league_id) === lid);

      const years2Members = leagueFiltered.filter(m => coerceSeasonYear(m.year) === 2);
      if (years2Members.length === 0) {
        alert('No Years 2+ members found');
        return;
      }

      const doc = new jsPDF('landscape');
      let yPosition = addGeneralPDFHeader(doc);

      // Title
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 0, 0);
      doc.text('League Members - Years 2+', doc.internal.pageSize.getWidth() / 2, yPosition, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      yPosition += 20;

      const headersYears2 = ['Last', 'First', 'DOB', 'POB', 'Role', 'Blood', 'Nationality', 'Grade', 'Holder Of', 'NID', 'Renewal', 'License #', 'Registration', 'Confirmation', 'Password', 'League ID'];

      autoTable(doc, {
        head: [headersYears2],
        body: years2Members.map(prepareYearFilteredGeneralData),
        startY: yPosition,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [0, 128, 0], textColor: [255, 255, 255] }
      });

      const currentYear = new Date().getFullYear();
      doc.save(`league_general_years2_${currentYear}.pdf`);
    } catch (error) {
      console.error('Error exporting Years 2+ general PDF:', error);
      alert('Error exporting Years 2+ PDF. Please try again.');
    }
  };
  fetchMembers();
}, [selectedLeagueId]);

// Load entire league_members table (on demand or initial view)
const fetchAllMembers = async () => {
  try {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("league_members")
      .select("*")
      .order("id", { ascending: false });
    if (error) {
      setError(error);
    } else {
      setMembers(data || []);
      setSuccess(`Loaded ${data?.length || 0} league members`);
    }
  } catch (err) {
    setError(err);
  } finally {
    setLoading(false);
  }
};

// Initial load: fetch full table so users see data immediately
useEffect(() => {
  fetchAllMembers();
}, []);

// fetch latest federation logo (same pattern as MemberListLeague)
useEffect(() => {
  const fetchLatestLogo = async () => {
    const { data, error } = await supabase
      .from("logo")
      .select("logo_url")
      .order("created_at", { ascending: false })
      .limit(1);
    if (!error && data && data.length > 0) {
      // Use helper to normalize storage path vs full URL
      setFederationLogo(getLogoUrl(data[0].logo_url) || data[0].logo_url);
    }
  };
  fetchLatestLogo();
}, []);

// export data function (only once!)
const prepareExportData = () => {
  return members.map((m) => ({
    ...m,
    confirmation: m.confirmation ? "Yes" : "No"
  }));
};


  const getLogoUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${supabase.storageUrl}/object/public/logos/${url}`;
  };

  // Unified filtering: by selected league and search term
  const filteredMembers = (Array.isArray(members) ? members : []).filter((m) => {
    // League filter (when a league is selected)
    if (selectedLeagueId && String(m.league_id) !== String(selectedLeagueId)) {
      return false;
    }
    // Text search filter (first name, last name, NID, club, role, grade)
    const term = (searchTerm || "").trim().toLowerCase();
    if (!term) return true;
    const fields = [
      m.first_name,
      m.last_name,
      m.national_id_number,
      m.club_name,
      m.role,
      m.grade,
    ];
    return fields
      .filter((v) => v != null)
      .some((v) => String(v).toLowerCase().includes(term));
  });

  const exportColumns = [
    { header: 'Last Name', field: 'last_name' },
    { header: 'First Name', field: 'first_name' },
    { header: 'Date of Birth', field: 'date_of_birth' },
    { header: 'Place of Birth', field: 'place_of_birth' },
    { header: 'Role', field: 'role' },
    { header: 'Blood Type', field: 'blood_type' },
    { header: 'Nationality', field: 'nationality' },
    { header: 'Grade', field: 'grade' },
    { header: 'Holder Of', field: 'holder_of' },
    { header: 'National ID', field: 'national_id_number' },
    { header: 'Renewal', field: 'renewal' },
    { header: 'Year', field: 'year' },
    { header: 'License Number', field: 'license_number' },
    { header: 'Registration Date', field: 'registration_date' },
    { header: 'Confirmation', field: 'confirmation' },
    { header: 'League ID', field: 'league_id' }
  ];

  // Helper: map general data for Year-filtered tables
  const prepareYearFilteredGeneralData = (member) => {
    const registrationVal = member.registration || member.registration_date || "";
    return [
      sanitizeText(member.last_name || ""),
      sanitizeText(member.first_name || ""),
      sanitizeText(member.date_of_birth || ""),
      sanitizeText(member.place_of_birth || ""),
      sanitizeText(member.role || ""),
      sanitizeText(member.blood_type || ""),
      sanitizeText(member.nationality || ""),
      sanitizeText(member.grade || ""),
      sanitizeText(member.holder_of || ""),
      sanitizeText(member.national_id_number || ""),
      sanitizeText(member.renewal || ""),
      sanitizeText(member.license_number || ""),
      sanitizeText(registrationVal),
      member.confirmation ? "Yes" : "No",
      sanitizeText(member.password || ""),
      String(member.league_id || "")
    ];
  };

  // Helper: normalize season year values to numeric seasons (1, 2, ...)
  const coerceSeasonYear = (val) => {
    if (val === null || val === undefined) return null;
    const s = String(val).trim().toLowerCase();
    if (s === '1' || s.includes('year 1')) return 1;
    if (s === '2' || s.includes('year 2')) return 2;
    const n = parseInt(s, 10);
    return Number.isNaN(n) ? null : n;
  };

  // Helper: determine season for a member, preferring explicit year, otherwise renewal
  const getSeasonForMember = (member) => {
    const byYear = coerceSeasonYear(member?.year);
    if (byYear !== null) return byYear;
    const r = Number(String(member?.renewal ?? '').trim());
    if (!Number.isNaN(r) && r > 0) return r;
    return null;
  };

  // PDF header helpers (aligned with MemberListLeagueL pattern)
  const addGeneralPDFHeader = (doc) => {
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Right-aligned logo (if available) with local fallback to avoid cross-origin issues
    try {
      if (federationLogo) {
        doc.addImage(federationLogo, 'PNG', pageWidth - 50, 10, 30, 30);
      } else if (logo) {
        doc.addImage(logo, 'PNG', pageWidth - 50, 10, 30, 30);
      }
    } catch (error) {
      console.warn('Could not add logo to PDF header:', error);
    }

    // Left-aligned print date
    const currentDate = new Date().toLocaleDateString();
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Print Date: ${currentDate}`, 14, 18);

    // Centered federation name
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Algerian Judo Federation', pageWidth / 2, 24, { align: 'center' });

    // Start content below header
    return 40;
  };

  const addFederationHeader = (doc, federationNameParam, leagueNameParam) => {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeText(federationNameParam || ''), 14, 15);
    doc.setFont('helvetica', 'normal');
    doc.text(`League: ${sanitizeText(leagueNameParam || '')}`, 14, 25);
    return 35;
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
    const lid = Number(selectedLeagueId);

    try {
      // Prefer already loaded state to avoid export failures due to policies or network
      let allMembers = Array.isArray(members) ? members.slice() : [];
      if (lid && !isNaN(lid)) {
        allMembers = allMembers.filter(m => String(m.league_id) === String(lid));
      }
      if (!allMembers || allMembers.length === 0) {
        alert('No members found');
        return;
      }

      const doc = new jsPDF('landscape');

      // Helper to resolve league name by id
      const leagueNameById = (id) => {
        const found = leagues.find(l => String(l.id) === String(id));
        return sanitizeText(found?.name_league || `League ${id}`);
      };

      const headersGeneral = ['Last', 'First', 'DOB', 'POB', 'Role', 'Blood', 'Nationality', 'Grade', 'Holder Of', 'NID', 'Renewal', 'License #', 'Registration', 'Confirmation', 'Password', 'League ID'];

      // Group by League only; render Years 1 and Years 2 tables per league
      const byLeague = {};
      allMembers.forEach(m => {
        const lg = m.league_id || 'Unknown League';
        if (!byLeague[lg]) byLeague[lg] = [];
        byLeague[lg].push(m);
      });

      const leagueIds = Object.keys(byLeague);
      leagueIds.forEach((leagueId, leagueIdx) => {
        let yPosition = addGeneralPDFHeader(doc);

        // Title centered
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 0, 0);
        doc.text('League Members - General Situation', doc.internal.pageSize.getWidth() / 2, yPosition, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        yPosition += 20;

        // League header (without "League :")
        const leagueTitle = leagueNameById(leagueId);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${leagueTitle}`, 14, yPosition);
        yPosition += 8;

        const membersInLeague = byLeague[leagueId];

        // Group dynamically by the exact season year string (e.g., "2025/2026")
        const membersByYear = {};
        membersInLeague.forEach(m => {
          const yr = m.year ? String(m.year) : 'Unknown Year';
          if (!membersByYear[yr]) membersByYear[yr] = [];
          membersByYear[yr].push(m);
        });

        const years = Object.keys(membersByYear).sort();
        years.forEach((yearLabel, idx) => {
          // Year section heading
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(`Year: ${yearLabel}`, 14, yPosition);
          yPosition += 8;

          const yearMembers = membersByYear[yearLabel];
          autoTable(doc, {
            head: [headersGeneral],
            body: yearMembers.map(prepareYearFilteredGeneralData),
            startY: yPosition,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [0, 128, 0], textColor: [255, 255, 255] },
            margin: { left: 14, right: 10 }
          });

          yPosition = doc.lastAutoTable.finalY + 10;
          if (yPosition > doc.internal.pageSize.getHeight() - 50 && idx < years.length - 1) {
            doc.addPage();
            yPosition = addGeneralPDFHeader(doc);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 0, 0);
            doc.text('League Members - General Situation', doc.internal.pageSize.getWidth() / 2, yPosition, { align: 'center' });
            doc.setTextColor(0, 0, 0);
            yPosition += 20;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`${leagueTitle}`, 14, yPosition);
            yPosition += 8;
          }
        });

        if (leagueIdx < leagueIds.length - 1) {
          doc.addPage();
        }
      });

      const currentDate = new Date().getFullYear();
      const filename = (!lid || isNaN(lid))
        ? `league_all_general_members_${currentDate}.pdf`
        : `league_general_members_${currentDate}.pdf`;
      doc.save(filename);
    } catch (error) {
      console.error("Error exporting general PDF:", error);
      alert("Error exporting PDF. Please try again.");
    }
  };

  const exportGradeRolePDF = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("league_members")
        .select("*");

      if (error) throw error;

      if (!data || data.length === 0) {
        alert("No league members found");
        setLoading(false);
        return;
      }

      // Group rows by league so we can render per-league sections
      const byLeague = {};
      data.forEach(m => {
        const lid = m.league_id || 'Unknown League';
        if (!byLeague[lid]) byLeague[lid] = [];
        byLeague[lid].push(m);
      });

      const doc = new jsPDF('landscape');

      // Helper to resolve league name by id
      const leagueNameById = (id) => {
        const found = leagues.find(l => String(l.id) === String(id));
        return sanitizeText(found?.name_league || `League ${id}`);
      };

      const renderSectionsForLeague = (leagueId, leagueMembers) => {
        const leagueName = leagueNameById(leagueId);
        let yPosition = addGeneralPDFHeader(doc);

        // Centered title
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 0, 0);
        doc.text('League Members - Grade and Role Situation', doc.internal.pageSize.getWidth() / 2, yPosition, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        yPosition += 20;

        // League heading (no "League :")
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${leagueName}`, 14, yPosition);
        yPosition += 12;

        // Group members by club then by year
        const membersByClub = {};
        leagueMembers.forEach(member => {
          const club = member.club_name || 'No Club';
          if (!membersByClub[club]) membersByClub[club] = [];
          membersByClub[club].push(member);
        });

        const clubNames = Object.keys(membersByClub).sort();
        clubNames.forEach((clubName, clubIdx) => {
          const clubMembers = membersByClub[clubName];
          const membersByYear = {};
          clubMembers.forEach(member => {
            const year = member.year || 'Unknown Year';
            if (!membersByYear[year]) membersByYear[year] = [];
            membersByYear[year].push(member);
          });

          const years = Object.keys(membersByYear).sort();
          years.forEach((yearLabel, yearIdx) => {
            // Club + Year heading
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`${sanitizeText(clubName)}   Year ${sanitizeText(yearLabel)}`, 14, yPosition);
            yPosition += 10;

            const membersInClubYear = membersByYear[yearLabel];

            // Roles grouping
            const byRole = {};
            membersInClubYear.forEach(m => {
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
                head: [['Last Name', 'First Name', 'DOB', 'POB', 'Blood Type', 'Nationality', 'Grade', 'Role', 'Holder Of', 'NID', 'Renewal', 'Confirmation', 'License #', 'Club']],
                body: roleMembers.map(prepareGradeRoleMemberData),
                startY: yPosition,
                styles: { fontSize: 5, cellPadding: 1 },
                headStyles: { fillColor: [34, 139, 34], textColor: 255, fontStyle: 'bold', fontSize: 5 },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                margin: { left: 14, right: 10 }
              });

              yPosition = doc.lastAutoTable.finalY + 12;
              if (yPosition > 160) {
                doc.addPage();
                yPosition = addGeneralPDFHeader(doc);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text(`${leagueName}`, 14, yPosition);
                yPosition += 12;
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text(`${sanitizeText(clubName)}   Year ${sanitizeText(yearLabel)}`, 14, yPosition);
                yPosition += 10;
              }
            });

            // Grades grouping (same structure)
            const byGrade = {};
            membersInClubYear.forEach(m => {
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
                head: [['Last Name', 'First Name', 'DOB', 'POB', 'Blood Type', 'Nationality', 'Grade', 'Role', 'Holder Of', 'NID', 'Renewal', 'Confirmation', 'License #', 'Club']],
                body: gradeMembers.map(prepareGradeRoleMemberData),
                startY: yPosition,
                styles: { fontSize: 5, cellPadding: 1 },
                headStyles: { fillColor: [34, 139, 34], textColor: 255, fontStyle: 'bold', fontSize: 5 },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                margin: { left: 14, right: 10 }
              });

              yPosition = doc.lastAutoTable.finalY + 12;
              if (yPosition > 160) {
                doc.addPage();
                yPosition = addGeneralPDFHeader(doc);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text(`${leagueName}`, 14, yPosition);
                yPosition += 12;
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text(`${sanitizeText(clubName)}   Year ${sanitizeText(yearLabel)}`, 14, yPosition);
                yPosition += 10;
              }
            });

            // Space between year blocks
            yPosition += 8;
          });

          // Space between clubs
          yPosition += 10;
          if (yPosition > 160 && clubIdx < clubNames.length - 1) {
            doc.addPage();
            yPosition = addGeneralPDFHeader(doc);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`${leagueName}`, 14, yPosition);
            yPosition += 12;
          }
        });
      };

      const leagueIds = Object.keys(byLeague);
      if (leagueIds.length === 0) {
        alert('No league members found');
        setLoading(false);
        return;
      }

      leagueIds.forEach((lid, idx) => {
        if (idx > 0) doc.addPage();
        renderSectionsForLeague(lid, byLeague[lid]);
      });

      const currentYear = new Date().getFullYear();
      doc.save(`league_grade_role_all_leagues_${currentYear}.pdf`);
    } catch (err) {
      setError(`Error exporting grade role PDF: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  

  // Handle PDF export for individual member (match MemberListLeagueL behavior)
  const handleExportPDF = (member) => {
    if (!member || Object.keys(member).length === 0) {
      alert('No data available to export');
      return;
    }
    exportPDFWithAutoOrientation(member);
  }; 
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

  
  // Minimal editing handlers
  const handleEdit = (member) => {
    setEditingId(member.id);
    setEditedMember({ ...member });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditedMember({});
  };

  const handleChange = (e, field) => {
    setEditedMember({ ...editedMember, [field]: e.target.value });
  };

  const handleSave = async (id) => {
    try {
      setSaveLoading(true);
      setMembers(members.map((m) => (m.id === id ? { ...m, ...editedMember } : m)));
      setSuccess("Member updated.");
      cancelEdit();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (member) => {
    try {
      setMembers(members.filter((m) => m.id !== member.id));
      setSuccess("Member removed.");
    } catch (err) {
      setError(err.message || String(err));
    }
  };

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
// filteredMembers is computed above (league + search filters)
  return (
    <div className="app-container">
      {loading && <BarLoading />}
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
              {federationName}
            </h1>
          </div>
        </div>
      </header>
        <div className="form-table-wrapper">
              <div className="sticky-button-bar">
                <BackHomeButton />
                <PhotosLogoPublication data-id="1" />
                <button
                  className="primary-btn"
                  data-id="2"
                  onClick={(e) => { handlePrimaryButtonClick(e.currentTarget); navigate("/MemberListPageP"); }}
                >
                  The Member List Add
                </button>
                <button
                  className="primary-btn"
                  data-id="3"
                  onClick={(e) => { handlePrimaryButtonClick(e.currentTarget); navigate("/TheLeagueList-Add"); }}
                >
                  The League List Add
                </button>
                <button
                  className="primary-btn"
                  data-id="4"
                  onClick={(e) => { handlePrimaryButtonClick(e.currentTarget); navigate("/TheClubListAdd-Fed"); }}
                >
                  The Club List Add
                </button>
                <button
                  className="primary-btn"
                  data-id="5"
                  onClick={(e) => { handlePrimaryButtonClick(e.currentTarget); navigate("/TheAthleteList-Add"); }}
                >
                  The Athlete List Add
                </button>
              </div>
      <h2 className="form-title">Add League Member</h2>
      <form onSubmit={handleSubmit} className="form-grid">
        <label>
          League Role *
          <select
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            required
          >
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
            onChange={(e) => setSelectedLeagueId(e.target.value)}
            required
          >
            <option value="">Select League</option>
            {leagues.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name_league}
              </option>
            ))}
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
                  <input
                    type="file"
                    onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                    required
                  />
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

      {/* MAIN CONTENT */}
      <section className="app-container">
        <h2 className="form-title">League Member List</h2>
        <div className="form-grid">
             <label>
          League 
          <select
            value={selectedLeagueId}
            onChange={(e) => setSelectedLeagueId(e.target.value)}
            
          >
            <option value="">Select League</option>
            {leagues.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name_league}
              </option>
            ))}
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
                  
                    <button
                    className={m.confirmation ? "cancel-btn" : "confirm-btn"}
                    onClick={() => toggleConfirmation(m.id, m.confirmation)}
                 >
                   {m.confirmation ? "Cancel Confirmation" : "Confirm"}
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
        <div className="flex items-center justify-between mb-4">
 
          <div className="btn-row">
            <BackHomeButton />
            <button className="primary-b" onClick={exportGeneralPDF}>
              Export General PDF
            </button>
            <button className="primary-b" onClick={exportGradeRolePDF}>
              Export Grade Role PDF
            </button>
            {/* ExportDataButton removed as requested */}
          </div>
        </div>
      
      </section>
      </div>

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
