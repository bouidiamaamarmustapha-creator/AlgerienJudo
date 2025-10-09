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


export default function MemberListClub() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");
  const [roles, setRoles] = useState([]);

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
	    <th>NID</th>
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
  <td colSpan={18}>No members found.</td>
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
		   <td>{m.national_id_number}</td>
	       <td>{m.renewal}</td>
		   <td>{m.year}</td>
		   <td>{m.license_number}</td>
		   <td>{m.registration_date}</td>
            <td>{m.photo_url ? <img src={m.photo_url} alt="Photo" style={{width: '50px', height: '50px'}} /> : 'No Photo'}</td>
            <td>{m.confirmation ? "✅" : "❌"}</td>
	        <td>{m.club_id}</td>
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
            <ExportDataButton  className="primary-b"
              data={prepareExportData()}
              title={`${federationName} - Club Members List`}
              columns={exportColumns}
              filename="club_members"
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

      <Navigation />

      <footer className="footer" style={{ backgroundColor: "red" }}>
        <p>&copy; 2025 Algerian Judo Federation. All rights reserved.</p>
      </footer>
    </div>
  );
}
