import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { formatIndianCurrency } from '@/utils/indianBusiness';

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  line_total: number;
}

interface Invoice {
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes: string | null;
  suppliers?: {
    company_name: string;
    address?: string;
    phone?: string;
    email?: string;
    gstin?: string;
  };
}

interface InvoicePDFProps {
  invoice: Invoice;
  items: InvoiceItem[];
  companyInfo?: {
    name: string;
    address: string;
    phone: string;
    email: string;
    gstin: string;
  };
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 12,
    paddingTop: 35,
    paddingBottom: 65,
    paddingHorizontal: 35,
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  invoiceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  companyInfo: {
    width: '45%',
  },
  supplierInfo: {
    width: '45%',
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  text: {
    marginBottom: 3,
  },
  table: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    paddingBottom: 5,
    marginBottom: 5,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
  },
  col1: { width: '40%', textAlign: 'left' },
  col2: { width: '10%', textAlign: 'center' },
  col3: { width: '15%', textAlign: 'right' },
  col4: { width: '10%', textAlign: 'center' },
  col5: { width: '25%', textAlign: 'right' },
  totalsSection: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '40%',
    marginBottom: 5,
  },
  totalLabel: {
    fontWeight: 'bold',
  },
  grandTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    borderTopWidth: 2,
    borderTopColor: '#000000',
    paddingTop: 5,
  },
  notes: {
    marginTop: 30,
  },
  footer: {
    position: 'absolute',
    fontSize: 10,
    bottom: 30,
    left: 35,
    right: 35,
    textAlign: 'center',
    color: 'grey',
  },
});

export const InvoicePDF: React.FC<InvoicePDFProps> = ({ 
  invoice, 
  items, 
  companyInfo = {
    name: "Your Company Name",
    address: "Your Company Address",
    phone: "Your Phone",
    email: "your@email.com",
    gstin: "Your GSTIN"
  }
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>INVOICE</Text>
        <Text>Invoice #{invoice.invoice_number}</Text>
      </View>

      {/* Company and Supplier Info */}
      <View style={styles.invoiceInfo}>
        <View style={styles.companyInfo}>
          <Text style={styles.label}>From:</Text>
          <Text style={styles.text}>{companyInfo.name}</Text>
          <Text style={styles.text}>{companyInfo.address}</Text>
          <Text style={styles.text}>Phone: {companyInfo.phone}</Text>
          <Text style={styles.text}>Email: {companyInfo.email}</Text>
          <Text style={styles.text}>GSTIN: {companyInfo.gstin}</Text>
        </View>
        
        <View style={styles.supplierInfo}>
          <Text style={styles.label}>To:</Text>
          <Text style={styles.text}>{invoice.suppliers?.company_name || 'N/A'}</Text>
          {invoice.suppliers?.address && <Text style={styles.text}>{invoice.suppliers.address}</Text>}
          {invoice.suppliers?.phone && <Text style={styles.text}>Phone: {invoice.suppliers.phone}</Text>}
          {invoice.suppliers?.email && <Text style={styles.text}>Email: {invoice.suppliers.email}</Text>}
          {invoice.suppliers?.gstin && <Text style={styles.text}>GSTIN: {invoice.suppliers.gstin}</Text>}
          
          <Text style={[styles.text, { marginTop: 10 }]}>
            <Text style={styles.label}>Invoice Date: </Text>
            {new Date(invoice.invoice_date).toLocaleDateString('en-IN')}
          </Text>
          {invoice.due_date && (
            <Text style={styles.text}>
              <Text style={styles.label}>Due Date: </Text>
              {new Date(invoice.due_date).toLocaleDateString('en-IN')}
            </Text>
          )}
        </View>
      </View>

      {/* Items Table */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.col1}>Description</Text>
          <Text style={styles.col2}>Qty</Text>
          <Text style={styles.col3}>Rate</Text>
          <Text style={styles.col4}>GST%</Text>
          <Text style={styles.col5}>Amount</Text>
        </View>
        
        {items.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.col1}>{item.description}</Text>
            <Text style={styles.col2}>{item.quantity}</Text>
            <Text style={styles.col3}>{formatIndianCurrency(item.unit_price, false)}</Text>
            <Text style={styles.col4}>{item.gst_rate}%</Text>
            <Text style={styles.col5}>{formatIndianCurrency(item.line_total, false)}</Text>
          </View>
        ))}
      </View>

      {/* Totals */}
      <View style={styles.totalsSection}>
        <View style={styles.totalRow}>
          <Text>Subtotal:</Text>
          <Text>{formatIndianCurrency(invoice.subtotal, false)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text>Tax Amount:</Text>
          <Text>{formatIndianCurrency(invoice.tax_amount, false)}</Text>
        </View>
        <View style={[styles.totalRow, styles.grandTotal]}>
          <Text style={styles.totalLabel}>Total Amount:</Text>
          <Text style={styles.totalLabel}>{formatIndianCurrency(invoice.total_amount, false)}</Text>
        </View>
      </View>

      {/* Notes */}
      {invoice.notes && (
        <View style={styles.notes}>
          <Text style={styles.label}>Notes:</Text>
          <Text>{invoice.notes}</Text>
        </View>
      )}

      {/* Footer */}
      <Text style={styles.footer}>
        Thank you for your business!
      </Text>
    </Page>
  </Document>
);