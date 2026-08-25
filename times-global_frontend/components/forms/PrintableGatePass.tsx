import React from 'react';

interface GatePassItemData {
  sno: string;
  itemName: string;
  description: string;
  quantity: string;
  remarks: string;
}

interface GatePassPrintData {
  recipient_name: string;
  recipient_address: string;
  items: GatePassItemData[];
  prepared_by: string;
  received_by: string;
  approved_by: string;
  pass_date: string; // Expecting an ISO date string or pre-formatted date
}

interface PrintableGatePassProps {
  gatePassData: GatePassPrintData;
}

const PrintableGatePass: React.FC<PrintableGatePassProps> = ({ gatePassData }) => {
  const {
    recipient_name,
    recipient_address,
    items,
    prepared_by,
    received_by,
    approved_by,
    pass_date,
  } = gatePassData;

  const displayDate = pass_date
    ? new Date(pass_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : ' '.repeat(20);

  const renderTableRows = () => {
    const rows = [];
    const minimumRowsToDisplay = 5;
    const actualItemCount = items.length;

    for (let i = 0; i < actualItemCount; i++) {
      const item = items[i];
      rows.push(
        <tr key={`item-${item.sno}-${i}`} className="h-[2em]">
          <td className="border border-black px-1.5 py-1 text-center align-top w-[8%]">{item.sno}</td>
          <td className="border border-black px-1.5 py-1 text-center align-top w-[22%]">{item.itemName}</td>
          <td className="border border-black px-1.5 py-1 text-center align-top w-[30%]">{item.description}</td>
          <td className="border border-black px-1.5 py-1 text-center align-top w-[15%]">{item.quantity}</td>
          <td className="border border-black px-1.5 py-1 text-center align-top w-[25%]">{item.remarks}</td>
        </tr>
      );
    }

    for (let i = actualItemCount; i < minimumRowsToDisplay; i++) {
      rows.push(
        <tr key={`empty-${i}`} className="h-[2em]">
          <td className="border border-black px-1.5 py-1 text-center align-top"> </td>
          <td className="border border-black px-1.5 py-1 text-center align-top"> </td>
          <td className="border border-black px-1.5 py-1 text-center align-top"> </td>
          <td className="border border-black px-1.5 py-1 text-center align-top"> </td>
          <td className="border border-black px-1.5 py-1 text-center align-top"> </td>
        </tr>
      );
    }
    return rows;
  };

  const lineStyleBase: React.CSSProperties = { // Renamed to avoid conflict with print styles
    display: 'inline-block',
    minHeight: '1.1em',
    lineHeight: '1.1em',
    paddingBottom: '1px', // Keep a minimal padding for visual space if needed
  };

  const signatureLineStyle: React.CSSProperties = { // Specific style for signature lines
    display: 'inline-block',
    borderTop: '1px solid black', // Changed from border-bottom
    width: '90%',
    marginTop:'1em',
    minHeight: 'auto', // Reset minHeight if borderTop provides enough visual
    paddingTop: '1px', // Space above text if needed
    lineHeight: '1.2em',
    height: '1.3em', // Match print CSS height
  };


  return (
    <div
        className="printable-area bg-white text-black p-5 font-sans w-[190mm] min-h-[125mm] mx-auto border border-black flex flex-col justify-between text-[9pt]" // Changed base font size to 9pt and padding to p-5
        style={{ fontFamily: 'Arial, sans-serif' }}
    >
      <div>
        <div className="relative mb-2">
          <div className="absolute top-0 left-0 flex items-center">
            <img
              src="/images/Times Global.png"
              alt="Times Global Logo"
              className="h-8 print-logo" 
            />
          </div>

          <div className="text-center">
            <h1 className="font-bold print-company-name text-[11pt]">TIMESGLOBAL Datacenter</h1> {/* Font size 11pt */}
            <h2 className="font-bold print-title mt-1 text-[13pt]">Gate Pass</h2> {/* Font size 13pt */}
          </div>

          <div className="absolute top-0 right-0 text-xs pt-1">
            <span className="print-date-label">Date: </span>
            <span style={{...lineStyleBase, borderBottom: '1px solid black', minWidth: '70px', textAlign: 'left'}} className="print-date-value pl-1">{displayDate}</span>
          </div>
        </div>

        <div className="mb-1 text-xs flex items-baseline">
          <span className="mr-1 print-mr-mrs-label">Mr/Mrs.:</span>
          <span style={{...lineStyleBase, borderBottom: '1px solid black', width: 'calc(100% - 50px)'}} className="print-recipient-name">{recipient_name}</span>
        </div>
        <div className="mb-3 text-xs flex items-baseline">
          <span className="mr-1 print-address-label">Address:</span>
          <span style={{...lineStyleBase, borderBottom: '1px solid black', width: 'calc(100% - 55px)'}} className="print-recipient-address">{recipient_address}</span>
        </div>

        {/* Table font size 8pt */}
        <table className="w-full border-collapse border border-black mb-3 print-table text-[8pt]">
          <thead>
            {/* Added bg-gray-100 for preview highlight */}
            <tr className="print-table-header bg-gray-100">
              <th className="border border-black p-1 font-semibold w-[8%] text-center">S.N no</th>
              <th className="border border-black p-1 font-semibold w-[22%] text-center">Item</th>
              <th className="border border-black p-1 font-semibold w-[30%] text-center">Description</th>
              <th className="border border-black p-1 font-semibold w-[15%] text-center">Quantity</th>
              <th className="border border-black p-1 font-semibold w-[25%] text-center">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {renderTableRows()}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-end pt-5 text-xs print-footer-signatures"> {/* Increased top padding to pt-5 */}
        <div className="text-left w-1/3">
          <p className="mb-1">Prepared by</p>
          <div style={signatureLineStyle} className="print-prepared-by">{prepared_by}</div>
        </div>
        <div className="text-left w-1/3 pl-2">
          <p className="mb-1">Received by</p>
          <div style={signatureLineStyle} className="print-received-by">{received_by || ''}</div>
        </div>
        <div className="text-left w-1/3 pl-2">
          <p className="mb-1">Approved by</p>
          <div style={signatureLineStyle} className="print-approved-by">{approved_by}</div>
        </div>
      </div>
    </div>
  );
};

export default PrintableGatePass;
