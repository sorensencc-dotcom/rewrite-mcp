// import pipeline
import { renderHeadroomPanel } from "./panels/headroom.js";
import { renderHeadroomPolicyPanel } from "./panels/headroomPolicy.js";
console.log("Initializing dashboard...");

function renderSystemPanel() {
  renderHeadroomPanel(document.getElementById("panel-headroom"));
  renderHeadroomPolicyPanel(document.getElementById("panel-headroom-policy"));
  console.log("System panel rendered.");
}

renderSystemPanel();
