import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";
import Navigation from "./Navigation";
import "./index.css";
import BackHomeButton from "./BackHomeButton";
import { Shield, FileDown, Download } from "lucide-react";
import logo from "./assets/logo.png"; 
import ExportDataButton from "./ExportDataButton";
import ExportRowButton from "./ExportRowButton";
import { useDragScroll } from './useDragScroll';
import ErrorOverlay from './components/ErrorOverlay';
import SuccessOverlay from './components/SuccessOverlay';
import BarLoading from './components/BarLoading';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import loadImage from 'blueimp-load-image';
import { sanitizeText } from './ExportUtils';


export default function MemberListClub() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");
  const [roles, setRoles] = useState([]);
  const [clubMap, setClubMap] = useState({});

  const [federationLogo, setFederationLogo] = useState(null);
  const [federationName, setFederationName] =
    useState("Algerian Judo Federation");

  const navigate = useNavigate();
  const tableRef = useDragScroll();

  // ✅ fetch club members
  const fetchMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("club_members")
        .select(`
          *,
          nameleague!league_id(name_league)
        `);
      if (error) {
        setError(error);
      } else {
        setMembers(data || []);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ fetch latest federation logo
  const fetchLatestLogo = async () => {
    const { data, error } = await supabase
      .from("logo") // ✅ using the "logo" table we created
      .select("logo_url")
      .order("id", { ascending: false })
      .limit(1);
    if (error) console.error("Error fetching logo:", error.message);
    if (data?.length) {
      setFederationLogo(data[0].logo_url);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchLatestLogo();
  }, []);

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



  const handlePrint = () => {
    window.print();
  };
  
  // Define columns for export
  const exportColumns = [
    { header: 'Role', field: 'role_name' },
    { header: 'Blood Type', field: 'blood_type' },
    { header: 'Last Name', field: 'last_name' },
    { header: 'First Name', field: 'first_name' },
    { header: 'Date of Birth', field: 'date_of_birth' },
    { header: 'Place of Birth', field: 'place_of_birth' },
    { header: 'League Name', field: 'league_name' }
  ];

  // Prepare data with role names and league names for export
  const prepareExportData = () => {
    return members.map(member => {
      const foundRole = roles.find(r => r.id === member.role_id);
      return {
        ...member,
        role_name: foundRole?.club_role || 'No Role',
        league_name: member.nameleague?.name_league || member.league_id || 'No League'
      };
    });
  };

  // Helper: resolve URL or empty
  function getLogoUrl(url) {
    return url ?? '';
  }

  // Build 40x40 rounded cover thumbnail for PDF embedding
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

  // Helper: Add PDF header
  const addGeneralPDFHeader = (doc) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    if (federationLogo) {
      try {
        doc.addImage(federationLogo, 'PNG', pageWidth - 40, 15, 25, 25);
      } catch (e) {
        console.warn('Could not add federation logo:', e);
      }
    }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const currentDate = new Date().toLocaleDateString();
    doc.text(`Print Date: ${currentDate}`, 15, 20);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeText(federationName || 'Algerian Judo Federation'), pageWidth / 2, 25, { align: 'center' });
    return 40;
  };

  // Export Club Members PDF (without NID column, with PHOTO before Confirmation)
  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const { data, error } = await supabase
          .from('nameclub')
          .select('id, name_club');
        if (error) {
          console.error('Error fetching clubs:', error.message);
          return;
        }
        const map = Object.fromEntries((data || []).map(c => [c.id, c.name_club]));
        setClubMap(map);
      } catch (err) {
        console.error('Unexpected error fetching clubs:', err);
      }
    };
    fetchClubs();
  }, []);

  const exportClubMembersPDF = async () => {
    try {
      const list = members || [];
      if (!list.length) {
        alert('No members to export');
        return;
      }

      const doc = new jsPDF('landscape', 'mm', 'a4');
      const startY = addGeneralPDFHeader(doc);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 0, 0);
      doc.text('Club Members - General Report', doc.internal.pageSize.getWidth() / 2, startY + 10, { align: 'center' });
      doc.setTextColor(0, 0, 0);

      const rows = await Promise.all(
        list.map(async (m) => {
          const photoUrl = getLogoUrl(m.photo_url);
          const thumb = photoUrl ? await buildPhotoThumb(photoUrl) : null;
          const clubName = clubMap[m.club_id] || m.club_id || '';
          const leagueName = m.nameleague?.name_league || m.league_id || '';
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
            sanitizeText(m.renewal) || '',
            sanitizeText(m.year) || '',
            sanitizeText(m.license_number) || '',
            sanitizeText(m.registration_date) || '',
            sanitizeText(clubName) || '',
            sanitizeText(leagueName) || '',
            thumb,
            m.confirmation ? 'Yes' : 'No'
          ];
        })
      );

      const imgSizeMm = 8;
      const cellSizeMm = imgSizeMm + 4;
      const photoColIndex = 15;

      autoTable(doc, {
        head: [['Last Name', 'First Name', 'DOB', 'POB', 'Role', 'Blood', 'Nationality', 'Grade', 'Holder Of', 'Renewal', 'Year', 'License #', 'Registration', 'Club ID', 'League', 'PHOTO', 'Confirmation']],
        body: rows,
        startY: startY + 20,
        styles: { fontSize: 7, cellPadding: 1 },
        headStyles: { fillColor: [0, 128, 0], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: { [photoColIndex]: { cellWidth: cellSizeMm, minCellHeight: cellSizeMm } },
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

      const filename = `club_members_with_photos_${new Date().getFullYear()}.pdf`;
      doc.save(filename);
    } catch (error) {
      console.error('Error exporting club members PDF:', error);
      alert(`Error exporting PDF: ${error.message}`);
    }
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
        <h2>Club Member List</h2>
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
	    <th>holder_of</th>
	    {/* NID column removed */}
	    <th>Renewal</th>
	    <th>Year</th>
	    <th>License #</th>
        <th>Registration</th>
	    <th>Photos</th>
	    <th>Confirmation</th>
	    <th>Club ID</th>
        <th>League ID</th>
    </tr>
  </thead>
								
	  <tbody>
	    {members.length === 0 ? (
  <tr>
  <td colSpan={17}>No members found.</td>
  </tr>
  ) : (
	 members.map((m) => (
	 <tr 
	     key={m.id}
	  >																				
  {/* Last */}
 <td>{m.last_name}</td>
																				
    {/* First */}
  <td>{m.first_name}</td>
																				
  {/* DOB */}
   <td>{m.date_of_birth}</td>
																				
  {/* POB */}
    <td>{m.place_of_birth}</td>
																				
	    {/* Role */}
    <td>{m.role || 'No Role'}</td>
																				
	   {/* Blood */}
	   <td>{m.blood_type}</td>
																				
 {/* Nationality */}
    <td>{m.nationality}</td>
																				
  {/* Grade */}
  <td>{m.grade}</td>
																				
   {/* holder_of */}
   <td>{m.holder_of}</td>
																				
		 {/* --- Non-editable columns --- */}
	       {/* NID removed */}
	       <td>{m.renewal}</td>
		   <td>{m.year}</td>
		   <td>{m.license_number}</td>
		   <td>{m.registration_date}</td>
            <td>{m.photo_url ? <img src={m.photo_url} alt="Photo" style={{width: '50px', height: '50px'}} /> : 'No Photo'}</td>
            <td>{m.confirmation ? "✅" : "❌"}</td>
            <td>{clubMap[m.club_id] || m.club_id}</td>
            <td>{m.nameleague?.name_league || m.league_id}</td>
			  </tr>
                                ))
			    )}
				  </tbody>
			 </table>	
																	 
        </div>
        <div className="flex items-center justify-between mb-4">

         <div className="btn-row">
            <BackHomeButton />
            <button className="primary-b" onClick={exportClubMembersPDF}>Export PDF</button>
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

      <Navigation />

      <footer className="footer" style={{ backgroundColor: "red" }}>
        <p>&copy; 2025 Algerian Judo Federation. All rights reserved.</p>
      </footer>
    </div>
  );
}
