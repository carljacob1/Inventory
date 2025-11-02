export const downloadInvoiceAsCSV = (invoice: any, items: any[]) => {
  const itemsText = items.map(item => 
    `${item.description},${item.quantity},${item.unit_price},${item.gst_rate}%,${item.line_total}`
  ).join('\n');
  
  const csvContent = `Invoice Number: ${invoice.invoice_number}
Date: ${invoice.invoice_date}
Supplier: ${invoice.suppliers?.company_name || 'N/A'}

Description,Quantity,Unit Price,GST Rate,Line Total
${itemsText}

Subtotal: ${invoice.subtotal}
Tax: ${invoice.tax_amount}
Total: ${invoice.total_amount}`;

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoice-${invoice.invoice_number}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};

export const downloadReportAsCSV = (title: string, data: any[], columns: string[]) => {
  const headers = columns.join(',');
  const rows = data.map(row => 
    columns.map(col => row[col] || '').join(',')
  ).join('\n');
  
  const csvContent = `${title}\nGenerated: ${new Date().toLocaleString()}\n\n${headers}\n${rows}`;
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};