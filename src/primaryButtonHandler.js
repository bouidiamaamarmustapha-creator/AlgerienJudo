// Primary Button Handler - Manages active state for buttons with primary-btn class
// Usage: Import this file in any component that needs primary button functionality

export const initializePrimaryButtons = () => {
  // Load saved active button from localStorage
  const savedId = localStorage.getItem("activeButton");
  if (savedId) {
    const activeBtn = document.querySelector(`.primary-btn[data-id="${savedId}"]`);
    if (activeBtn) activeBtn.classList.add("active");
  }
};

// Function to handle button click - call this from React onClick handlers
export const handlePrimaryButtonClick = (buttonElement) => {
  // Remove active class from all buttons
  const buttons = document.querySelectorAll(".primary-btn");
  buttons.forEach(b => b.classList.remove("active"));

  // Add active class to clicked button
  buttonElement.classList.add("active");

  // Save to localStorage
  const buttonId = buttonElement.dataset.id;
  if (buttonId) {
    localStorage.setItem("activeButton", buttonId);
  }
};

// Auto-initialize when DOM is loaded (for direct script inclusion)
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePrimaryButtons);
  } else {
    initializePrimaryButtons();
  }
}

export default initializePrimaryButtons;