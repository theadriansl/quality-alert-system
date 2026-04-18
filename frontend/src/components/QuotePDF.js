import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Estilos para el PDF siguiendo el formato del ejemplo
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: 'Helvetica',
    lineHeight: 1.4
  },
  // Header
  header: {
    textAlign: 'center',
    marginBottom: 20,
    borderBottom: '2px solid #000',
    paddingBottom: 10
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5
  },
  documentInfo: {
    fontSize: 8,
    color: '#666',
    marginBottom: 3
  },
  dateInfo: {
    fontSize: 9,
    textAlign: 'right',
    marginBottom: 10,
    fontWeight: 'bold'
  },

  // Sections
  section: {
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
    textDecoration: 'underline'
  },
  sectionText: {
    fontSize: 9,
    textAlign: 'justify',
    marginBottom: 3
  },

  // Table
  table: {
    marginTop: 8,
    marginBottom: 8
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderTop: '1px solid #000',
    borderBottom: '1px solid #000',
    padding: 4,
    fontWeight: 'bold',
    fontSize: 8
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #ccc',
    padding: 4,
    fontSize: 8
  },
  tableColPosition: {
    width: '35%'
  },
  tableColRate: {
    width: '10.83%',
    textAlign: 'center'
  },

  // Info boxes
  infoBox: {
    border: '1px solid #000',
    padding: 8,
    marginBottom: 8
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 3,
    fontSize: 9
  },
  infoLabel: {
    width: '35%',
    fontWeight: 'bold'
  },
  infoValue: {
    width: '65%'
  },

  // Signature section
  signatureSection: {
    marginTop: 20,
    fontSize: 9
  },
  signatureLine: {
    borderBottom: '1px solid #000',
    width: '45%',
    marginTop: 20,
    marginBottom: 5
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10
  },
  signatureColumn: {
    width: '48%'
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 7,
    borderTop: '1px solid #ccc',
    paddingTop: 5
  },

  bold: {
    fontWeight: 'bold'
  },
  italic: {
    fontStyle: 'italic'
  },
  underline: {
    textDecoration: 'underline'
  }
});

const QuotePDF = ({ quote, job }) => {
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  return (
    <Document>
      {/* PAGE 1 - Terms and Conditions */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={{ fontSize: 11, marginBottom: 10 }}>
            [COMPANY LOGO/NAME]
          </Text>
          <Text style={styles.title}>Quote and Authorization</Text>
        </View>

        <View style={styles.documentInfo}>
          <Text>QAS-001     As of Date: {formatDate(new Date())}     Revision: 01</Text>
        </View>

        <Text style={styles.dateInfo}>Date: {formatDate(quote.date)}</Text>

        {/* Your Quote Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Quote Information:</Text>
          <Text style={styles.sectionText}>
            By signing this proposal quote the Client expressly agrees: (1) that this agreement shall apply to all services performed by <Text style={styles.bold}>[COMPANY NAME]</Text> for the benefit of the Client, its subsidiaries, divisions, affiliates or parent regardless of where those services are performed; (2) that you agree to pay for all services performed for the benefit of the Client, its subsidiaries, divisions, affiliates or parent; (3) that the undersigned representative of Client has authority to order the work described herein on behalf of the Client; (4) the Client has read, understands and fully agrees to <Text style={styles.bold}>[COMPANY NAME]</Text> Disclaimer and Limitation of Liability.
          </Text>
        </View>

        {/* Project Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project Pricing:</Text>
          <Text style={styles.sectionText}>
            <Text style={styles.bold}>[COMPANY NAME]</Text> established a flexible pricing system that will meet your requirements. The following pricing matrix provides a fixed price per hour for resources required for sorting and containment activities.
          </Text>
        </View>

        {/* Project-Specific Materials */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project-Specific Materials</Text>
          <Text style={styles.sectionText}>
            Will be invoiced if applicable with a {quote.materialMarkup}% markup
          </Text>
        </View>

        {/* Service Rates Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableColPosition}>Service Rates *All Rates are in U.S. Dollars</Text>
            <Text style={styles.tableColRate}>Shift 1</Text>
            <Text style={styles.tableColRate}>Shift 2/3</Text>
            <Text style={styles.tableColRate}>Overtime</Text>
            <Text style={styles.tableColRate}>Saturday</Text>
            <Text style={styles.tableColRate}>Sunday</Text>
            <Text style={styles.tableColRate}>Holiday</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableColPosition}>Working Supervisor</Text>
            <Text style={styles.tableColRate}>${quote.serviceRates.workingSupervisor.shift1.toFixed(2)}</Text>
            <Text style={styles.tableColRate}>${quote.serviceRates.workingSupervisor.shift2_3.toFixed(2)}</Text>
            <Text style={styles.tableColRate}>${quote.serviceRates.workingSupervisor.overtime.toFixed(2)}</Text>
            <Text style={styles.tableColRate}>${quote.serviceRates.workingSupervisor.saturday.toFixed(2)}</Text>
            <Text style={styles.tableColRate}>${quote.serviceRates.workingSupervisor.sunday.toFixed(2)}</Text>
            <Text style={styles.tableColRate}>${quote.serviceRates.workingSupervisor.holiday.toFixed(2)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableColPosition}>Rework Team Member / Inspector</Text>
            <Text style={styles.tableColRate}>${quote.serviceRates.inspector.shift1.toFixed(2)}</Text>
            <Text style={styles.tableColRate}>${quote.serviceRates.inspector.shift2_3.toFixed(2)}</Text>
            <Text style={styles.tableColRate}>${quote.serviceRates.inspector.overtime.toFixed(2)}</Text>
            <Text style={styles.tableColRate}>${quote.serviceRates.inspector.saturday.toFixed(2)}</Text>
            <Text style={styles.tableColRate}>${quote.serviceRates.inspector.sunday.toFixed(2)}</Text>
            <Text style={styles.tableColRate}>${quote.serviceRates.inspector.holiday.toFixed(2)}</Text>
          </View>
        </View>

        <Text style={{ fontSize: 8, fontWeight: 'bold', marginBottom: 8 }}>
          *[COMPANY NAME] will bill a {quote.minimumHours} Hour Minimum per Team Member *Overtime will be billed after {quote.overtimeThreshold} Hours*
        </Text>

        {/* Payment Terms and Conditions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Terms and Conditions:</Text>
          <Text style={styles.sectionText}>
            Once a project has been initiated, <Text style={styles.bold}>[COMPANY NAME]</Text> must receive a signed quote and Purchase Order within 24 hours of initiation of project activities. If the Purchase Order is not received within 24 hours, [COMPANY NAME] reserves the right to cease operations and invoice the Client for work performed. [COMPANY NAME] will send out weekly invoices, unless a differing invoicing cycle is required by the Client and agreed upon prior to services, all payments for services therein are due no longer than 30 calendar days from date of the invoice. The Client has 14 calendar days after the invoice date to dispute an invoice. In the unlikely event that the specified payments are not met, an interest penalty will be charged at 1½ % per month on the unpaid balance. Late payments shall constitute a material breach of this agreement. If the Client believes that an invoice is incorrect, the Client agrees to pay what it believes to be the correct amount within the stated payment terms while the disputed amount is being investigated. After the investigation any remaining balance will be paid within 7 calendar days. The Client is responsible for all attorney, court and credit service fees that apply to the collection of all funds due to [COMPANY NAME] for work and services performed. [COMPANY NAME] cannot be held responsible for damages resulting from inspected parts whose eventual use causes property damages or bodily injury. [COMPANY NAME] is not financially responsible for loss of containment. In the event of a proven loss of containment, that has been investigated and agreed upon by both [COMPANY NAME] and the paying Client; [COMPANY NAME] will reinspect the parts in question at our cost to provide a clean point in-house. In the case that defects are subjective or not well defined, [COMPANY NAME] will not be held accountable unless we have been provided boundary samples and/or a clear measuring matrix for defects from the paying Client.
          </Text>
        </View>

        {/* Nexus Digital Management Platform */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nexus Digital Management Platform:</Text>
          <Text style={styles.sectionText}>
            <Text style={styles.bold}>[COMPANY NAME]</Text> will provide management work performed by location Managers, Operations Support, and Accounts Receivable for the administration time incurred by [COMPANY NAME] to ensure the correct set up of the project, follow-ups regarding approvals and financials, invoicing and collections, communication with Clients through email, collect, analyze and report data. This fee is billed per project per shift per day. This is done through our digital management platform.
          </Text>
        </View>

        {/* Storage, Data and Billing Clause */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage, Data and Billing Clause:</Text>
          <Text style={styles.sectionText}>
            Right to use <Text style={styles.bold}>[COMPANY NAME]</Text> grants you the right to access and use our management platform (Nexus). We reserve all other rights for Acceptable use; you may use the software only in accordance with this agreement. You may not reverse engineer, decompile, disassemble or work around technical limitations in the software. After 180 calendar days of inactivity related to projects, [COMPANY NAME] will truncate Nexus with an option of a 1 time back up of this data. (fees may apply)
          </Text>
          <Text style={styles.sectionText}>
            **Exceptions: If the Client contract states specific data terms and conditions**
          </Text>
        </View>

        {/* Non-Solicitation Clause */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Non-Solicitation Clause:</Text>
          <Text style={styles.sectionText}>
            Client and/or their Suppliers/Vendors shall not for any reason directly or indirectly, hire or attempt to hire or utilize the services of anyone who is an employee, consultant or subcontractor of <Text style={styles.bold}>[COMPANY NAME]</Text> without prior express written consent. If done so, [COMPANY NAME] will charge $1,200 (per incident/per employee).
          </Text>
        </View>

        {/* Project Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project Information:</Text>
          <Text style={styles.sectionText}>
            Individual projects will be quoted and sent via our Digital Management Platform Nexus.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>QAS-001     As of Date: {formatDate(new Date())}     Revision: 01</Text>
        </View>
      </Page>

      {/* PAGE 2 - Project Details */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={{ fontSize: 11, marginBottom: 10 }}>
            [COMPANY LOGO/NAME]
          </Text>
          <Text style={styles.title}>Quote and Authorization</Text>
        </View>

        {/* Nexus Project # and Purchase Order */}
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nexus Project #:</Text>
            <Text style={styles.infoValue}>{quote.quoteNumber}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Purchase Order #</Text>
            <Text style={styles.infoValue}>{quote.purchaseOrderNumber || ''}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Purchase Order Amount:</Text>
            <Text style={styles.infoValue}>{quote.purchaseOrderAmount || ''}</Text>
          </View>
        </View>

        {/* Project Description */}
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Project Description for Quality Services</Text>
            <Text style={styles.infoValue}>{quote.projectDescription}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Part Descriptions for Quality Services</Text>
            <Text style={styles.infoValue}>{quote.partDescriptions || 'N/A'}</Text>
          </View>
        </View>

        {/* Agreed Upon Billed Services */}
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Agreed Upon Billed Services</Text>
            <Text style={styles.infoValue}>{quote.agreedServices || 'N/A'}</Text>
          </View>
        </View>

        {/* Client/Bill-To Information */}
        <View style={styles.infoBox}>
          <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 5, textDecoration: 'underline' }}>
            Client/Bill-To Information
          </Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Company</Text>
            <Text style={styles.infoValue}>{quote.clientCompany}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Contact Name</Text>
            <Text style={styles.infoValue}>{quote.clientContact}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Billing Address Street</Text>
            <Text style={styles.infoValue}>{quote.clientBillingAddress}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>City, State/Province, Country, Zip Code</Text>
            <Text style={styles.infoValue}>{quote.clientCity}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Desk</Text>
            <Text style={styles.infoValue}></Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mobile</Text>
            <Text style={styles.infoValue}>{quote.clientPhone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Fax</Text>
            <Text style={styles.infoValue}></Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{quote.clientEmail}</Text>
          </View>
        </View>

        {/* Service Location */}
        <View style={styles.infoBox}>
          <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 5, textDecoration: 'underline' }}>
            Service Location
          </Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Company</Text>
            <Text style={styles.infoValue}>{quote.serviceCompany}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Contact Name</Text>
            <Text style={styles.infoValue}>{quote.serviceContact}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Billing Address Street</Text>
            <Text style={styles.infoValue}>{quote.serviceAddress}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>City, State/Province, Country, Zip Code</Text>
            <Text style={styles.infoValue}>{quote.serviceCity}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Desk</Text>
            <Text style={styles.infoValue}></Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mobile</Text>
            <Text style={styles.infoValue}>{quote.servicePhone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Fax</Text>
            <Text style={styles.infoValue}></Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{quote.serviceEmail}</Text>
          </View>
        </View>

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <Text style={{ marginBottom: 10 }}>
            I hereby agree with the pricing terms and conditions in the above quote:
          </Text>

          <View style={styles.signatureRow}>
            <View style={styles.signatureColumn}>
              <Text>Signature: _________________________________</Text>
              <Text style={{ marginTop: 15 }}>Date: _____________________________________</Text>
            </View>
            <View style={styles.signatureColumn}>
              <Text>Title: _____________________________________</Text>
              <Text style={{ marginTop: 15 }}>[COMPANY NAME] Authorized Signature: _________</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>QAS-001     As of Date: {formatDate(new Date())}     Revision: 01</Text>
        </View>
      </Page>
    </Document>
  );
};

export default QuotePDF;
