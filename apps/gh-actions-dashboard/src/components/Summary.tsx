import "../styles/Summary.css";

interface RepoReport {
  name: string;
  issues: string[];
}

interface Props {
  reports: RepoReport[];
  loading: boolean;
}

export default function Summary({ reports, loading }: Props) {
  const compliant = reports.filter((r) => r.issues.length === 0).length;
  const nonCompliant = reports.filter((r) => r.issues.length > 0).length;
  const total = reports.length;
  const complianceRate =
    total === 0 ? 0 : Math.round((compliant / total) * 100);

  return (
    <div className="summary-cards">
      <div className="summary-card">
        <h3>Total Repos</h3>
        <p className="metric">{loading ? "—" : total}</p>
      </div>
      <div className="summary-card clean">
        <h3>Compliant</h3>
        <p className="metric">{loading ? "—" : compliant}</p>
      </div>
      <div className="summary-card warning">
        <h3>Issues</h3>
        <p className="metric">{loading ? "—" : nonCompliant}</p>
      </div>
      <div className="summary-card">
        <h3>Compliance Rate</h3>
        <p className="metric">{loading ? "—" : complianceRate}%</p>
      </div>
    </div>
  );
}
