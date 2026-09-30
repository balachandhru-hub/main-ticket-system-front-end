import { useState, useEffect } from "react";
import "./AribaCompare.css";

interface InvoiceComparisonTableProps {
  data: any;
  setInvoiceData: (value: any) => void;
}

const fieldKeyMap: Record<string, { extracted: string; original: string }> = {
  "Item Code": { extracted: "Item Code", original: "PO Material Code" },
  QTY: { extracted: "QTY", original: "RCT Quantity" },
  Unit: { extracted: "Unit", original: "PO Unit Of Measure (Unit of Measure)" },
  Amount: { extracted: "Amount Incl VAT", original: "Amount_Accepted" },
  Description: { extracted: "Item Description", original: "RCT Description" },
  Status: { extracted: "Status", original: "Status" },
};

const InvoiceComparisonTable: React.FC<InvoiceComparisonTableProps> = ({
  data,
  setInvoiceData,
}) => {
  if (!data) return null;

  const [selectedComparison] = useState(0);
  const [editedData, setEditedData] = useState<any>(() =>
    JSON.parse(JSON.stringify(data))
  );

  useEffect(() => {
    setEditedData(JSON.parse(JSON.stringify(data)));
  }, [data]);

  const currentComparison =
    editedData?.comparison?.[selectedComparison] || { "Comparison Table": [], "Header Issues": [] };

  const formatValue = (value: unknown) =>
    value === null || value === undefined ? "" : String(value);

  const handleEdit = (
    section: "header" | "line" | "lineIssue",
    field: string,
    value: string,
    lineIndex?: number,
    issueIndex?: number,
    isExtracted: boolean = true
  ) => {
    setEditedData((prev: any) => {
      const updated = JSON.parse(JSON.stringify(prev));
      const comp = updated.comparison[selectedComparison];

      if (section === "header" && lineIndex !== undefined) {
        comp["Header Issues"][lineIndex][field] = value;
      }

      if (section === "line" && lineIndex !== undefined) {
        const lineItem = comp["Comparison Table"][lineIndex];
        if (field === "Status") {
          lineItem.Status = value;
        } else if (isExtracted) {
          lineItem["Extracted Data"] = {
            ...lineItem["Extracted Data"],
            [fieldKeyMap[field]?.extracted || field]: value,
          };
        } else {
          lineItem["Original Data"] = {
            ...lineItem["Original Data"],
            [fieldKeyMap[field]?.original || field]: value,
          };
        }
      }

      if (section === "lineIssue" && lineIndex !== undefined && issueIndex !== undefined) {
        comp["Comparison Table"][lineIndex].Issues[issueIndex][field] = value;
      }

      return updated;
    });
  };

  const totalIssues = (currentComparison["Header Issues"]?.length || 0) +
    (currentComparison["Comparison Table"]?.reduce((acc: number, item: any) => acc + (item?.Issues?.length || 0), 0) || 0);
  return (
    <div className="modal-backdrop-compare">
      <div className="modal-container-compare">
        <div className="modal-inner-compare">
          {/* Document Summary */}
          <div className="summary-card-compare">
            <h2>Document Summary</h2>
            <div className="summary-grid-compare">
              <div>
                <span>Invoice Number:</span>
                <p>{currentComparison["Invoice Number"]}</p>
              </div>
              <div>
                <span>PO Number:</span>
                <p>{currentComparison["PO Number"]}</p>
              </div>
              <div>
                <span>Supplier:</span>
                <p>{currentComparison["Supplier Name"]}</p>
              </div>
              <div>
                <span>Total Issues:</span>
                <p className="text-red-compare">{totalIssues}</p>
              </div>
            </div>
          </div>

          {/* Header Issues Table */}
          <div className="table-container-compare">
            <table className="table-compare">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Extracted Value</th>
                  <th>Original Value</th>
                  <th>Issue</th>
                  <th>Comment</th>
                </tr>
              </thead>
              <tbody>
                {currentComparison["Header Issues"]?.map((issue: any, index: number) => (
                  <tr key={index}>
                    <td>{issue.Field}</td>
                    <td>
                      <input
                        value={formatValue(issue["Extracted Value"])}
                        onChange={(e) => handleEdit("header", "Extracted Value", e.target.value, index)}
                      />
                    </td>
                    <td>
                      <input
                        value={formatValue(issue["Original Value"])}
                        onChange={(e) => handleEdit("header", "Original Value", e.target.value, index)}
                      />
                    </td>
                    <td>
                      <input
                        value={formatValue(issue.Issue)}
                        onChange={(e) => handleEdit("header", "Issue", e.target.value, index)}
                      />
                    </td>
                    <td>
                      <input
                        value={formatValue(issue.Comment)}
                        onChange={(e) => handleEdit("header", "Comment", e.target.value, index)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Line Items */}
          {currentComparison["Comparison Table"]?.map((item: any, idx: number) => (
            <div key={idx} className="line-item-compare">
              <div className="line-item-header-compare">
                <h3>{item["Item Description"]}</h3>
              </div>

              <div className="table-container-compare">
                <table className="table-compare">
                  <thead>
                    <tr>
                      <th>Field</th>
                      <th>Extracted</th>
                      <th>Original</th>
                    </tr>
                  </thead>
                  <tbody>
                    {["Item Code", "QTY", "Unit", "Amount", "Description", "Status"].map((field) => {
                      const extractedValue = field === "Status" ? item.Status : item["Extracted Data"]?.[fieldKeyMap[field]?.extracted];
                      const originalValue = field === "Status" ? item.Status : item["Original Data"]?.[fieldKeyMap[field]?.original];
                      return (
                        <tr key={field}>
                          <td>{field}</td>
                          <td>
                            <input
                              value={formatValue(extractedValue)}
                              onChange={(e) => handleEdit("line", field, e.target.value, idx, undefined, true)}
                            />
                          </td>
                          <td>
                            <input
                              value={formatValue(originalValue)}
                              onChange={(e) => handleEdit("line", field, e.target.value, idx, undefined, false)}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Line Item Issues */}
              {item.Issues?.map((issue: any, i: number) => (
                <div key={i} className="issue-card-compare">
                  <input
                    value={formatValue(issue.Issue)}
                    onChange={(e) => handleEdit("lineIssue", "Issue", e.target.value, idx, i)}
                  />
                  <input
                    value={formatValue(issue.Comment)}
                    onChange={(e) => handleEdit("lineIssue", "Comment", e.target.value, idx, i)}
                  />
                </div>
              ))}
            </div>
          ))}

          {/* Footer */}
          <div className="ariba-modal-footer-compare">
            <button className="submit-button-compare" onClick={() => setInvoiceData(editedData)}>
              Submit Changes
            </button>
            <button className="cancel-button-compare" onClick={() => setEditedData(data)}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceComparisonTable;
