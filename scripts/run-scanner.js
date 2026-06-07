const fs = require('fs');
const path = require('path');

const QUARANTINE_DIR = path.join(__dirname, '../quarantine');
const LOG_FILE = path.join(QUARANTINE_DIR, 'scan-results.log');

// Simulated malware signatures
const SIGNATURES = [
  'THREAT_CONFIRMED_001',
  'MALWARE_SIGNATURE_01',
  'SECRET_KEY_EXPOSURE_DETECTED'
];

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const sig of SIGNATURES) {
      if (content.includes(sig)) {
        return sig;
      }
    }
  } catch (err) {
    console.error(`Error reading file ${filePath}: ${err.message}`);
    return 'READ_ERROR';
  }
  return null;
}

async function run() {
  console.log(`Starting malware scan in: ${QUARANTINE_DIR}`);
  
  if (!fs.existsSync(QUARANTINE_DIR)) {
    console.error('Error: Quarantine directory does not exist.');
    process.exit(1);
  }

  const files = fs.readdirSync(QUARANTINE_DIR).filter(f => f !== 'scan-results.log');
  let threatsFound = 0;
  let results = `Scan started at ${new Date().toISOString()}\n`;

  for (const file of files) {
    const filePath = path.join(QUARANTINE_DIR, file);
    if (fs.statSync(filePath).isDirectory()) continue;

    console.log(`Scanning: ${file}...`);
    const threat = scanFile(filePath);
    
    if (threat) {
      console.warn(`[THREAT DETECTED] ${file}: Matches signature ${threat}`);
      results += `[THREAT] ${file}: ${threat}\n`;
      threatsFound++;
    } else {
      results += `[CLEAN] ${file}\n`;
    }
  }

  results += `Scan finished. Total files: ${files.length}, Threats found: ${threatsFound}\n`;
  fs.writeFileSync(LOG_FILE, results, { flag: 'a' });
  
  console.log(`Scan complete. ${threatsFound} threats found. Results logged to ${LOG_FILE}`);
  process.exit(threatsFound > 0 ? 1 : 0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
