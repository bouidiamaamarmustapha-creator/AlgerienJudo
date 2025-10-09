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

  // fetch league members with league names
  const fetchMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("league_members")
        .select(`
          *,
          nameleague!league_id(
            name_league
          )
        `);
      
      if (error) {
        setError(error);
      } else {
        // Flatten the data to include league_name directly
        const membersWithLeagueNames = (data || []).map(member => ({
          ...member,
          league_name: member.nameleague?.name_league || 'Unknown League'
        }));
        setMembers(membersWithLeagueNames);
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



  // Get logo URL helper function
  const getLogoUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${supabase.storageUrl}/object/public/logos/${url}`;
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
        <th>Photo</th>
        <th>Confirmation</th>
        <th>League Name</th>
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

            <td>{m.confirmation ? "✅" : "❌"}</td>
            <td>{m.league_name || 'Unknown League'}</td>
          </tr>
        ))
      )}
    </tbody>
  </table>
        </div>
        <div className="flex items-center justify-between mb-4">
 
           <div className="btn-row">
            <BackHomeButton />
            <ExportDataButton  className="primary-b" 
              data={prepareExportData()}
              title={`${federationName} - League Members List`}
              columns={exportColumns}
              filename="league_members"
              buttonText="Export Data"
              pdfOptions={{
                orientation: 'landscape',
                logoUrl: federationLogo || logo
              }}
            />
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
