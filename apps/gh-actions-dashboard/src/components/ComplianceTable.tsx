import { useState } from "react";
import "../styles/ComplianceTable.css";

interface RepoReport {
  name: string;
  issues: string[];
}

interface Props {
  reports: RepoReport[];
  loading: boolean;
}

export default function ComplianceTable({ reports, loading }: Props) {
  const [expandedRepo, setExpandedRepo] = useState<string | null>(null);

  if (loading && reports.length === 0) {
    return (
      <div className="table-container">
        <p className="loading">Loading compliance data...</p>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="table-container">
        <p className="empty">No repositories found.</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="compliance-table">
        <thead>
          <tr>
            <th>Repository</th>
            <th>Status</th>
            <th>Issues</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((repo) => (
            <tr key={repo.name} className="table-row">
              <td className="repo-name">{repo.name}</td>
              <td className="status">
                <span
                  className={`badge ${
                    repo.issues.length === 0 ? "clean" : "issues"
                  }`}
                >
                  {repo.issues.length === 0 ? "✓ Clean" : "⚠ Issues"}
                </span>
              </td>
              <td className="issue-count">
                {repo.issues.length === 0 ? "—" : repo.issues.length}
              </td>
              <td className="details-cell">
                {repo.issues.length > 0 && (
                  <button
                    className="expand-btn"
                    onClick={() =>
                      setExpandedRepo(
                        expandedRepo === repo.name ? null : repo.name
                      )
                    }
                  >
                    {expandedRepo === repo.name ? "−" : "+"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {expandedRepo && (
        <div className="details-panel">
          {reports
            .filter((r) => r.name === expandedRepo)
            .map((repo) => (
              <div key={repo.name} className="repo-details">
                <h3>{repo.name}</h3>
                {repo.issues.length > 0 ? (
                  <ul className="issues-list">
                    {repo.issues.map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="no-issues">No issues found.</p>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
