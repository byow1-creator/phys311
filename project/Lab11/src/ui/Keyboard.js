
/**
 * Attaches global window listeners to wire keyboard shortcuts to simulation states.
 * @param {Object} state - Object containing references to variables controlling execution
 * @param {Function} initSceneCallback - Function to call when simulation needs to reset
 */
export function setupKeyboardControls(state, initSceneCallback) {
  window.addEventListener("keydown", (event) => {
    // Avoid triggering keys if the user is typing into form inputs or select fields
    if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "SELECT") {
      return;
    }

    const key = event.key;

    switch (key) {
      case " ": // Pause / Resume
        event.preventDefault(); // Stop spacebar from scrolling the page
        state.isPaused = !state.isPaused;
        
        // Update DOM button label if a reference is passed
        if (state.pauseBtn) {
          state.pauseBtn.textContent = state.isPaused ? "Play" : "Pause";
        }
        break;

      case ".": // Single Step
        if (state.isPaused) {
          state.stepOnce = true;
        }
        break;

      case "r":
      case "R": // Reset Scene
        state.isProfiling = false;
        initSceneCallback();
        break;

      case "+":
      case "=": // Increase Speed
        state.speed = Math.min(state.speed + 0.25, 2.0);
        console.log(`Simulation Speed: ${state.speed}x`);
        break;

      case "-":
      case "_": // Decrease Speed
        state.speed = Math.max(state.speed - 0.25, 0.25);
        console.log(`Simulation Speed: ${state.speed}x`);
        break;

      default:
        break;
    }
  });
}
