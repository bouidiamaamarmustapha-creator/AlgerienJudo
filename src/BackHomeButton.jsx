import { useNavigate } from "react-router-dom";

export default function BackHomeButton({ disabled = false }) {
  const navigate = useNavigate();

  return (
    <button
      className="secondary-btn"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        navigate("/");
      }}
    >
      Back to Home
    </button>
  );
}
