import { useNavigate } from "react-router-dom";

export default function TheAthleteListAddButton() {
  const navigate = useNavigate();

  return (
    <button className="primary-btn" onClick={() => navigate("/TheAthleteList-Add")}>
      Photos, Logo & Publications
    </button>
  );
}
