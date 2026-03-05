import { Document, Page, Text, View, StyleSheet, Image, Font } from "@react-pdf/renderer";
import { type Estimate, type EstimateLineItem, type Client } from "@shared/schema";

// Register fonts if needed, but standard fonts are usually fine.
// We'll use Helvetica as it's standard.

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#333",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 40,
    borderBottomWidth: 2,
    borderBottomColor: "#e11d48", // M5 Red
    paddingBottom: 20,
  },
  logo: {
    width: 120,
  },
  companyInfo: {
    textAlign: "right",
  },
  companyName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#e11d48",
    marginBottom: 4,
  },
  titleContainer: {
    marginBottom: 30,
  },
  proposalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  infoGrid: {
    flexDirection: "row",
    marginBottom: 30,
    gap: 40,
  },
  infoSection: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 8,
    textTransform: "uppercase",
    color: "#666",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 11,
    marginBottom: 2,
  },
  bodySection: {
    marginBottom: 30,
  },
  bodyText: {
    lineHeight: 1.5,
  },
  table: {
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 8,
    paddingHorizontal: 4,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  colDesc: { flex: 4 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 1.5, textAlign: "right" },
  colTotal: { flex: 1.5, textAlign: "right" },
  totalsContainer: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  totalsList: {
    width: 200,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    marginTop: 4,
  },
  grandTotalText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#e11d48",
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 10,
    textAlign: "center",
    color: "#999",
    fontSize: 8,
  },
});

interface ProposalPdfProps {
  title: string;
  body: string | null;
  estimate: Estimate;
  lineItems: EstimateLineItem[];
  client: Client;
}

export function ProposalPdf({ title, body, estimate, lineItems, client }: ProposalPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            {/* Logo placeholder - in real app would use import or URL */}
            <Text style={styles.companyName}>M5 SERVICES</Text>
            <Text>Facility Maintenance & Operations</Text>
          </View>
          <View style={styles.companyInfo}>
            <Text>123 Service Way</Text>
            <Text>Houston, TX 77001</Text>
            <Text>(555) 123-4567</Text>
            <Text>m5services.com</Text>
          </View>
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.proposalTitle}>{title}</Text>
          <Text style={styles.infoText}>Proposal Date: {new Date().toLocaleDateString()}</Text>
          <Text style={styles.infoText}>Proposal ID: PROP-{Math.floor(Math.random() * 10000)}</Text>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>Client</Text>
            <Text style={[styles.infoText, { fontWeight: "bold" }]}>{client.name}</Text>
            <Text style={styles.infoText}>{client.address}</Text>
            <Text style={styles.infoText}>{client.email}</Text>
            <Text style={styles.infoText}>{client.phone}</Text>
          </View>
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>Related Estimate</Text>
            <Text style={styles.infoText}>{estimate.title}</Text>
            <Text style={styles.infoText}>Estimate #{estimate.id}</Text>
          </View>
        </View>

        {body && (
          <View style={styles.bodySection}>
            <Text style={styles.infoLabel}>Scope of Work</Text>
            <Text style={styles.bodyText}>{body}</Text>
          </View>
        )}

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDesc}>Description</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colPrice}>Unit Price</Text>
            <Text style={styles.colTotal}>Total</Text>
          </View>
          {lineItems.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colQty}>{Number(item.quantity)}</Text>
              <Text style={styles.colPrice}>${Number(item.unitPrice).toFixed(2)}</Text>
              <Text style={styles.colTotal}>${Number(item.total).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsContainer}>
          <View style={styles.totalsList}>
            <View style={styles.totalRow}>
              <Text>Subtotal</Text>
              <Text>${Number(estimate.subtotal).toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>Tax ({estimate.tax}%)</Text>
              <Text>${(Number(estimate.subtotal) * Number(estimate.tax) / 100).toFixed(2)}</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalText}>Total</Text>
              <Text style={styles.grandTotalText}>${Number(estimate.total).toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>M5 Services - Excellence in Facility Maintenance</Text>
          <Text>This proposal is valid for 30 days from the date of issue.</Text>
        </View>
      </Page>
    </Document>
  );
}
