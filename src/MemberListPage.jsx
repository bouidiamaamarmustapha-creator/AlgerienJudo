import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";
import Navigation from "./Navigation";
import "./index.css";
import BackHomeButton from "./BackHomeButton";
import logo from "./assets/logo.png"; 
import { Shield, FileDown, Download } from "lucide-react";
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import ExportRowButton from "./ExportRowButton";
import { useDragScroll } from './useDragScroll';
import ErrorOverlay from './components/ErrorOverlay';
import SuccessOverlay from './components/SuccessOverlay';
import BarLoading from './components/BarLoading';
import loadImage from 'blueimp-load-image';


export default function MemberListPage() {
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editedMember, setEditedMember] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);   // ✅ keep only this one

  const [showLogin, setShowLogin] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [publications, setPublications] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [federationLogo, setFederationLogo] = useState(null);
  const [federationName, setFederationName] =
    useState("Algerian Judo Federation");
  const [isGreen, setIsGreen] = useState(true); // State to toggle border color

  const navigate = useNavigate();
  const tableRef = useDragScroll();

  const federationLogoPlaceholder = logo; // reuse your logo import

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
      const { data, error } = await supabase.from("members").select("*");
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

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const { data, error } = await supabase.from("federationrole").select("*");
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
          role_id: editedMember.role_id,
          blood_type: editedMember.blood_type,
          national_id_number: editedMember.national_id_number,
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
    { header: 'National ID Number', field: 'national_id_number' },
    { header: 'License Number', field: 'license_number' },
    { header: 'Registration Date', field: 'registration_date' }
  ];

  const prepareExportData = () => {
    return members.map(member => {
      const role = roles.find(r => r.id === member.role_id);
      return {
        ...member,
        role_name: role ? role.federation_role : member.role_id || 'N/A'
      };
    });
  };

  // Normalize image with EXIF orientation and canvas for better quality
  const normalizeImage = (url) => {
    return new Promise((resolve) => {
      try {
        loadImage(
          url,
          (canvasOrImg) => {
            try {
              if (canvasOrImg && canvasOrImg.toDataURL) {
                const dataUrl = canvasOrImg.toDataURL('image/jpeg', 0.92);
                resolve(dataUrl);
              } else if (canvasOrImg && canvasOrImg.src) {
                resolve(canvasOrImg.src);
              } else {
                resolve(url);
              }
            } catch (e) {
              resolve(url);
            }
          },
          { orientation: true, canvas: true, crossOrigin: 'anonymous' }
        );
      } catch (e) {
        resolve(url);
      }
    });
  };

  // Export PDF with auto orientation and normalized photos (similar to MemberListPageP)
  const exportPDFWithAutoOrientation = async () => {
    try {
      const columns = [
        { header: 'Last', dataKey: 'last_name' },
        { header: 'First', dataKey: 'first_name' },
        { header: 'DOB', dataKey: 'date_of_birth' },
        { header: 'POB', dataKey: 'place_of_birth' },
        { header: 'Role', dataKey: 'role_name' },
        { header: 'Blood', dataKey: 'blood_type' },
        { header: 'Nationality', dataKey: 'nationality' },
        { header: 'Grade', dataKey: 'grade' },
        { header: 'Holder Of', dataKey: 'holder_of' },
        { header: 'Renewal', dataKey: 'renewal' },
        { header: 'Year', dataKey: 'year' },
        { header: 'License #', dataKey: 'license_number' },
        { header: 'Registration', dataKey: 'registration_date' },
        { header: 'PHOTO', dataKey: 'photoDataURL' },
        { header: 'Confirmation', dataKey: 'confirmationText' },
      ];

      const orientation = columns.length > 10 ? 'landscape' : 'portrait';
      const doc = new jsPDF(orientation, 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const currentDate = new Date().toLocaleDateString();

      if (federationLogo) {
        try {
          doc.addImage(federationLogo, 'PNG', pageWidth - 40, 15, 25, 25);
        } catch (e) {
          console.warn('Could not add federation logo:', e);
        }
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Print Date: ${currentDate}`, 15, 20);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text((federationName || 'Algerian Judo Federation'), pageWidth / 2, 25, { align: 'center' });

      doc.setFontSize(14);
      doc.setTextColor(220, 53, 69);
      doc.text('Member List', pageWidth / 2, 40, { align: 'center' });
      doc.setTextColor(0, 0, 0);

      const startY = 55;
      const imgSizeMm = 8; // 1.5 cm
       const cellSizeMm = imgSizeMm + 4; // small padding

      // Prepare rows with role name and normalized photo
      const rows = await Promise.all(
        members.map(async (member) => {
          const role = roles.find(r => r.id === member.role_id);
          let photoDataURL = null;
          if (member.photo_url) {
            try {
              photoDataURL = await buildPhotoThumb(member.photo_url, 70, 4);
            } catch (e) {
              photoDataURL = null;
            }
          }
          return {
            last_name: member.last_name || '',
            first_name: member.first_name || '',
            date_of_birth: member.date_of_birth || '',
            place_of_birth: member.place_of_birth || '',
            role_name: role ? role.federation_role : (member.role || member.role_id || 'N/A'),
            blood_type: member.blood_type || '',
            nationality: member.nationality || '',
            grade: member.grade || '',
            holder_of: member.holder_of || '',
            renewal: member.renewal || '',
            year: member.year || '',
            license_number: member.license_number || '',
            registration_date: member.registration_date || '',
            photoDataURL,
            confirmationText: member.confirmation ? 'Confirmed' : 'Pending',
          };
        })
      );

      autoTable(doc, {
        startY,
        styles: { fontSize: 7, cellPadding: 1 },
        headStyles: { fillColor: [0, 128, 0], textColor: 255, fontStyle: 'bold' },
        columns,
        body: rows,
        columnStyles: {
          photoDataURL: { cellWidth: cellSizeMm, minCellHeight: cellSizeMm, halign: 'center' },
        },
        didParseCell: (data) => {
          if (data.column.dataKey === 'photoDataURL' && data.section === 'body') {
            data.cell.text = [];
          }
        },
        didDrawCell: (data) => {
          if (data.column.dataKey === 'photoDataURL' && data.section === 'body') {
            const imgData = data.cell.raw;
            if (!imgData) return;
            const x = data.cell.x + (data.cell.width - imgSizeMm) / 2;
            const y = data.cell.y + (data.cell.height - imgSizeMm) / 2;
            try {
              const isPng = typeof imgData === 'string' && imgData.startsWith('data:image/png');
              const format = isPng ? 'PNG' : 'JPEG';
              doc.addImage(imgData, format, x, y, imgSizeMm, imgSizeMm);
            } catch (e) {
              console.warn('Failed to draw member photo:', e);
            }
          }
        },
        didDrawPage: (data) => {
          if (data.pageNumber > 1) {
            const pageWidth2 = doc.internal.pageSize.getWidth();
            if (federationLogo) {
              try { doc.addImage(federationLogo, 'PNG', pageWidth2 - 40, 15, 25, 25); } catch (e) {}
            }
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Print Date: ${currentDate}`, 15, 20);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text((federationName || 'Algerian Judo Federation'), pageWidth2 / 2, 25, { align: 'center' });
            doc.setFontSize(14);
            doc.setTextColor(220, 53, 69);
            doc.text('Member List', pageWidth2 / 2, 40, { align: 'center' });
            doc.setTextColor(0, 0, 0);
          }
        }
      });

      const year = new Date().getFullYear();
      doc.save(`member_list_${year}.pdf`);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert('Error exporting PDF. Please try again.');
    }
  };

  // Keep existing button handler name but delegate to the new export
  const handleGeneralPDFExport = async () => {
    await exportPDFWithAutoOrientation();
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
      <section className="app-container">
        <h2>Member List</h2>
        <div className="table-container" ref={tableRef}>
          <table id="member-table" className="athlete-table">
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
              <th>Renewal</th>
              <th>Year</th>
              <th>License #</th>
              <th>Registration</th>
              <th>Photo</th>
              <th>Confirmation</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
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
                    <select
                      value={editedMember.role_id || ""}
                      onChange={(e) =>
                        setEditedMember({ ...editedMember, role_id: e.target.value })
                      }
                    >
                      <option value="">Select Role</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.federation_role}
                        </option>
                      ))}
                    </select>
                  ) : (
                    (() => {
                      const role = roles.find(r => r.id === member.role_id);
                      return role ? role.federation_role : (member.role || member.role_id || 'N/A');
                    })()
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
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <BackHomeButton />
          <button className="primary-b" onClick={handleGeneralPDFExport}>Export PDF</button>
        </div>
      </section>

      {/* Error Overlay */}
      {error && (
        <ErrorOverlay
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {loading && (
        <div>Loading...</div>
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
            // Rounded-rect clip
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
