import { useNavigate } from "react-router-dom";
import { handlePrimaryButtonClick } from './primaryButtonHandler';

export default function PhotosLogoPublication({ onLoadingStart, ...props }) {
  const navigate = useNavigate();

  const handleClick = (e) => {
    // set active state for primary buttons
    if (e && e.currentTarget) {
      handlePrimaryButtonClick(e.currentTarget);
    }
    if (onLoadingStart) {
      onLoadingStart();
    }
    
    // Add delay to show loading bar before navigation
    setTimeout(() => {
      navigate("/photos-logo-publication");
    }, 1000); // 1 second delay to show loading
  };

  return (
    <button className="primary-btn" {...props} onClick={handleClick}>
      Photos, Logo & Publications
    </button>
  );
}
