import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";
import Navigation from "./Navigation";
import "./index.css";
import BackHomeButton from "./BackHomeButton";
import { Shield, FileDown, Download } from "lucide-react";
import logo from "./assets/logo.png"; 

import ExportRowButton from "./ExportRowButton";
import { useDragScroll } from './useDragScroll';
import ErrorOverlay from './components/ErrorOverlay';
import SuccessOverlay from './components/SuccessOverlay';
import BarLoading from './components/BarLoading';
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import loadImage from 'blueimp-load-image'
import { sanitizeText, sanitizeForPDF } from './ExportUtils'



export default function MemberListLeague() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");

  const [publications, setPublications] = useState([]);
  const [federationLogo, setFederationLogo] = useState(null);
  const [federationName, setFederationName] =
    useState("Algerian Judo Federation");
  const [roles, setRoles] = useState([]);

  const navigate = useNavigate();
  const tableRef = useDragScroll();

  // fetch publications
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

  // fetch latest logo
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

  // fetch league members and map league names (avoid ambiguous relationship embed)
  const fetchMembers = async () => {
    try {
      setLoading(true);

      // Fetch league members
      const { data: memberRows, error: memberErr } = await supabase
        .from('league_members')
        .select('*');
      if (memberErr) throw memberErr;

      // Fetch leagues once and build a map
      const { data: leagueRows, error: leagueErr } = await supabase
        .from('nameleague')
        .select('id, name_league');
      if (leagueErr) throw leagueErr;

      const leagueMap = Object.fromEntries(
        (leagueRows || []).map(l => [l.id, l.name_league])
      );

      const membersWithLeagueNames = (memberRows || []).map(m => ({
        ...m,
        league_name: leagueMap[m.league_id] || 'Unknown League'
      }));

      setMembers(membersWithLeagueNames);
    } catch (err) {
      console.error('fetchMembers error:', err);
      setMembers([]);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // fetch roles
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const { data, error } = await supabase.from("leaguerole").select("*");
        if (error) {
          console.error("Error fetching roles:", error);
        } else {
          setRoles(data || []);
        }
      } catch (err) {
        console.error("Error fetching roles:", err);
      }
    };
    fetchRoles();
  }, []);



  // Public storage base for logos
  const STORAGE_URL = 'https://aolsbxfulbvpiobqqsao.supabase.co/storage/v1/object/public/logos/';

  // Get logo URL helper function
  const getLogoUrl = (url) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `${STORAGE_URL}${url}`;
  };

  // Filter members (for search functionality if needed)
  const filteredMembers = members;

  // Define columns for export
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

  // Prepare data for export
  const prepareExportData = () => {
    return members.map(member => ({
      ...member,
      confirmation: member.confirmation ? 'Yes' : 'No'
    }));
  };

  // EXIF-aware image normalization (canvas-based)
  function normalizeImage(url) {
    return new Promise((resolve, reject) => {
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

  // Build 40x40 rounded cover thumbnail for PDF embedding (matches MemberListPage)
  const buildPhotoThumb = (url, size = 40, radius = 4) => {
    return new Promise((resolve) => {
      try {
        loadImage(
          url,
          (img) => {
            try {
              const w = img.naturalWidth || img.width || size;
              const h = img.naturalHeight || img.height || size;
              const scale = Math.max(size / w, size / h);
              const sW = w * scale;
              const sH = h * scale;
              const dx = (size - sW) / 2;
              const dy = (size - sH) / 2;

              const canvas = document.createElement('canvas');
              canvas.width = size;
              canvas.height = size;
              const ctx = canvas.getContext('2d');

              ctx.clearRect(0, 0, size, size);
              ctx.save();
              // Rounded-rect clip using quadratic curves (same as MemberListPage)
              const r = radius;
              ctx.beginPath();
              ctx.moveTo(r, 0);
              ctx.lineTo(size - r, 0);
              ctx.quadraticCurveTo(size, 0, size, r);
              ctx.lineTo(size, size - r);
              ctx.quadraticCurveTo(size, size, size - r, size);
              ctx.lineTo(r, size);
              ctx.quadraticCurveTo(0, size, 0, size - r);
              ctx.lineTo(0, r);
              ctx.quadraticCurveTo(0, 0, r, 0);
              ctx.closePath();
              ctx.clip();

              ctx.drawImage(img, dx, dy, sW, sH);
              ctx.restore();

              const out = canvas.toDataURL('image/jpeg', 0.92);
              resolve(out);
            } catch (e) {
              resolve(null);
            }
          },
          { orientation: true, canvas: true, crossOrigin: 'anonymous' }
        );
      } catch (e) {
        resolve(null);
      }
    });
  };

  // Helper: Add general PDF header (match MemberListPage style)
  const addGeneralPDFHeader = (doc) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    // Logo on the right
    if (federationLogo) {
      try {
        doc.addImage(federationLogo, 'PNG', pageWidth - 40, 15, 25, 25);
      } catch (e) {
        console.warn('Could not add federation logo:', e);
      }
    }
    // Print date on the left
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const currentDate = new Date().toLocaleDateString();
    doc.text(`Print Date: ${currentDate}`, 15, 20);
    // Federation name centered
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeText(federationName || 'Algerian Judo Federation'), pageWidth / 2, 25, { align: 'center' });
    return 40; // baseline Y for content below header
  };

  // Export League Members PDF with photo thumbnails (1.5 cm)
  const exportLeagueMembersPDF = async () => {
    try {
      const list = filteredMembers || [];
      if (!list.length) {
        alert('No members to export');
        return;
      }
  
      const doc = new jsPDF('landscape', 'mm', 'a4');
  
      // Header (match MemberListPage style)
      const startY = addGeneralPDFHeader(doc);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 0, 0);
      doc.text('League Members - General Report', doc.internal.pageSize.getWidth() / 2, startY + 10, { align: 'center' });
      doc.setTextColor(0, 0, 0);
  
      // Prepare rows with photo thumbnails placed before Confirmation
      const rows = await Promise.all(
        list.map(async (m) => {
          const photoUrl = getLogoUrl(m.photo_url);
          const thumb = photoUrl ? await buildPhotoThumb(photoUrl) : null;
          return [
            sanitizeText(m.last_name) || '',
            sanitizeText(m.first_name) || '',
            sanitizeText(m.date_of_birth) || '',
            sanitizeText(m.place_of_birth) || '',
            sanitizeText(m.role) || 'No Role',
            sanitizeText(m.blood_type) || '',
            sanitizeText(m.nationality) || '',
            sanitizeText(m.grade) || '',
            sanitizeText(m.holder_of) || '',
            sanitizeText(m.national_id_number) || '',
            sanitizeText(m.renewal) || '',
            sanitizeText(m.year) || '',
            sanitizeText(m.license_number) || '',
            sanitizeText(m.registration_date) || '',
            sanitizeText(m.league_name) || 'Unknown League',
            thumb,
            m.confirmation ? 'Yes' : 'No'
          ];
        })
      );
  
      const imgSizeMm = 8; // ~0.8 cm, matching MemberListPage
      const cellSizeMm = imgSizeMm + 4;
      const photoColIndex = 15; // PHOTO column placed before Confirmation
  
      autoTable(doc, {
        head: [['Last Name', 'First Name', 'DOB', 'POB', 'Role', 'Blood', 'Nationality', 'Grade', 'Holder Of', 'NID', 'Renewal', 'Year', 'License #', 'Registration', 'League', 'PHOTO', 'Confirmation']],
        body: rows,
        startY: startY + 20,
        styles: {
          fontSize: 7,
          cellPadding: 1,
        },
        headStyles: {
          fillColor: [0, 128, 0],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          [photoColIndex]: { cellWidth: cellSizeMm, minCellHeight: cellSizeMm }
        },
        didParseCell: (data) => {
          if (data.column.index === photoColIndex && data.section === 'body') {
            data.cell.text = [];
          }
        },
        didDrawCell: (data) => {
          if (data.column.index === photoColIndex && data.section === 'body') {
            const imgData = data.cell.raw;
            if (!imgData) return;
            const imgW = imgSizeMm;
            const imgH = imgSizeMm;
            const x = data.cell.x + (data.cell.width - imgW) / 2;
            const y = data.cell.y + (data.cell.height - imgH) / 2;
            try {
              const isPng = typeof imgData === 'string' && imgData.startsWith('data:image/png');
              const format = isPng ? 'PNG' : 'JPEG';
              doc.addImage(imgData, format, x, y, imgW, imgH);
            } catch (e) {
              console.warn('Failed to draw photo thumbnail:', e);
            }
          }
        },
        didDrawPage: (data) => {
          if (data.pageNumber > 1) {
            addGeneralPDFHeader(doc);
          }
        }
      });
  
      const filename = `league_members_with_photos_${new Date().getFullYear()}.pdf`;
      doc.save(filename);
    } catch (error) {
      console.error('Error exporting league members PDF:', error);
      alert(`Error exporting PDF: ${error.message}`);
    }
  };

  // Handle PDF export for individual member
  const handleExportPDF = (member) => {
    if (!member || Object.keys(member).length === 0) {
      setError('No member data available to export');
      return;
    }
    // This would typically call an export function
    console.log('Exporting PDF for member:', member);
    setSuccess(`PDF export initiated for ${member.first_name} ${member.last_name}`);
  };

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
      <section className="app-container">
        <h2>League Member List</h2>
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
        <th>PHOTO</th>
        <th>League Name</th>
        <th>Confirmation</th>
      </tr>
    </thead>

    <tbody>
      {filteredMembers.length === 0 ? (
        <tr>
          <td colSpan={17}>No members found.</td>
        </tr>
      ) : (
        filteredMembers.map((m) => (
          <tr 
            key={m.id}
            onDoubleClick={() => handleExportPDF(m)}
            style={{ cursor: 'pointer' }}
          >
            <td>{m.last_name}</td>
            <td>{m.first_name}</td>
            <td>{m.date_of_birth}</td>
            <td>{m.place_of_birth}</td>
            <td>{m.role || 'No Role'}
            </td>

            <td>{m.blood_type}</td>
            <td>{m.nationality}</td>
            <td>{m.grade}</td>
            <td>{m.holder_of}</td>

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

            <td>{m.league_name || 'Unknown League'}</td>
             <td>{m.confirmation ? "✅" : "❌"}</td>
          </tr>
        ))
      )}
    </tbody>
  </table>
        </div>
        <div className="flex items-center justify-between mb-4">
 
           <div className="btn-row">
            <BackHomeButton />

            <button className="primary-b" onClick={exportLeagueMembersPDF}>
              Export PDF 
            </button>
          </div>
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
