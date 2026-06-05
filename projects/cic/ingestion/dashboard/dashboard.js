// import pipeline
import { renderHeadroomPanel } from "./panels/headroom.js";
import { renderHeadroomPolicyPanel } from "./panels/headroomPolicy.js";
import { renderRoutingPanel, renderCommandBarPanel } from "./panels/routingIntelligence.js";

console.log("Initializing dashboard...");

function renderSystemPanel() {
  renderHeadroomPanel(document.getElementById("panel-headroom"));
  renderHeadroomPolicyPanel(document.getElementById("panel-headroom-policy"));
  renderRoutingPanel(document.getElementById("panel-routing-intelligence"));
  renderCommandBarPanel(document.getElementById("panel-command-bar"));
  console.log("System panel rendered.");
}

renderSystemPanel();
