import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
    lineHeight: 1.4
  },
  header: {
    borderBottom: '2px solid #1a365d',
    paddingBottom: 10,
    marginBottom: 15
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  logo: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a365d'
  },
  reportId: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2c5282'
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1a365d',
    marginBottom: 5
  },
  subtitle: {
    fontSize: 10,
    textAlign: 'center',
    color: '#4a5568'
  },
  section: {
    marginBottom: 12,
    border: '1px solid #e2e8f0',
    borderRadius: 4
  },
  sectionHeader: {
    backgroundColor: '#2c5282',
    padding: '6px 10px',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: 'white'
  },
  sectionContent: {
    padding: 10
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4
  },
  infoLabel: {
    width: '30%',
    fontWeight: 'bold',
    color: '#4a5568',
    fontSize: 8
  },
  infoValue: {
    width: '70%',
    fontSize: 9
  },
  twoCol: {
    flexDirection: 'row',
    gap: 15
  },
  col: {
    flex: 1
  },
  table: {
    marginTop: 5
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2c5282',
    padding: 5,
    fontWeight: 'bold',
    fontSize: 7,
    color: 'white'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #e2e8f0',
    padding: 4,
    fontSize: 8
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottom: '1px solid #e2e8f0',
    padding: 4,
    fontSize: 8,
    backgroundColor: '#f7fafc'
  },
  tableRowNG: {
    flexDirection: 'row',
    borderBottom: '1px solid #e2e8f0',
    padding: 4,
    fontSize: 8,
    backgroundColor: '#fed7d7'
  },
  tableRowApproved: {
    flexDirection: 'row',
    borderBottom: '1px solid #e2e8f0',
    padding: 4,
    fontSize: 8,
    backgroundColor: '#c6f6d5'
  },
  small: {
    fontSize: 7,
    color: '#718096'
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    borderTop: '1px solid #e2e8f0',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: '#718096'
  },
  pageNumber: {
    position: 'absolute',
    bottom: 20,
    right: 30,
    fontSize: 8,
    color: '#718096'
  },
  subsection: {
    marginTop: 8,
    paddingTop: 8,
    borderTop: '1px solid #e2e8f0'
  },
  subsectionTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 5
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 2,
    paddingLeft: 10
  },
  bullet: {
    width: 10,
    fontSize: 8
  },
  listText: {
    flex: 1,
    fontSize: 8
  },
  imageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 10
  },
  imageBox: {
    width: '48%',
    border: '1px solid #e2e8f0',
    borderRadius: 4,
    padding: 5
  },
  imageTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center'
  },
  image: {
    width: '100%',
    maxHeight: 150,
    objectFit: 'contain'
  },
  whyRow: {
    flexDirection: 'row',
    marginBottom: 3,
    paddingLeft: 5
  },
  whyLabel: {
    width: 60,
    fontWeight: 'bold',
    fontSize: 8,
    color: '#2c5282'
  },
  whyText: {
    flex: 1,
    fontSize: 8
  },
  mBox: {
    border: '1px solid #e2e8f0',
    padding: 6,
    marginBottom: 5,
    borderRadius: 3
  },
  mTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#2c5282',
    marginBottom: 3
  },
  approvalBox: {
    border: '1px solid #cbd5e0',
    padding: 8,
    marginTop: 8,
    backgroundColor: '#f7fafc',
    borderRadius: 3
  },
  approvalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3
  },
  statusApproved: {
    color: '#22543d',
    fontWeight: 'bold'
  },
  statusPending: {
    color: '#92400e'
  },
  statusDraft: {
    color: '#718096'
  }
});

const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch {
    return '-';
  }
};

const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '-';
  }
};

const getStatusText = (status) => {
  if (status === 'approved') return 'APROBADO';
  if (status === 'under_review' || status?.includes('pending')) return 'EN REVISIÓN';
  if (status === 'rejected' || status?.includes('rejected')) return 'RECHAZADO';
  return 'BORRADOR';
};

const getStatusStyle = (status) => {
  if (status === 'approved') return styles.statusApproved;
  if (status === 'under_review' || status?.includes('pending')) return styles.statusPending;
  return styles.statusDraft;
};

const getUserName = (user, users = []) => {
  if (!user) return '-';
  if (typeof user === 'object') {
    return user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || '-';
  }
  const found = users.find(u => u.id === user);
  return found ? `${found.firstName || ''} ${found.lastName || ''}`.trim() || found.email : '-';
};

// eslint-disable-next-line no-unused-vars
const EightDPDF = ({ data, users = [], attachments = [], images = {} }) => {
  if (!data) return null;

  // Helper to find user by ID
  const findUserById = (userId) => {
    if (!userId) return null;
    if (typeof userId === 'object') return userId;
    return users.find(u => u.id === userId || u.id === parseInt(userId));
  };

  // Get escalation data - check both backend and frontend formats
  const escalationPath = data.escalationPath || data.escalation_path || {};

  // Try to get users from escalationPath (backend format - array of IDs)
  let issueUsers = [];
  let countermeasureUsers = [];
  let confirmationUsers = [];

  // Check if escalationPath has user arrays (IDs)
  const epIssue = escalationPath.issue_users || escalationPath.issueUsers || [];
  const epCounter = escalationPath.countermeasure_users || escalationPath.countermeasureUsers || [];
  const epConfirm = escalationPath.confirmation_users || escalationPath.confirmationUsers || [];

  // Convert IDs to user objects
  if (epIssue.length > 0) {
    issueUsers = epIssue.map(u => typeof u === 'object' ? u : findUserById(u)).filter(Boolean);
  }
  if (epCounter.length > 0) {
    countermeasureUsers = epCounter.map(u => typeof u === 'object' ? u : findUserById(u)).filter(Boolean);
  }
  if (epConfirm.length > 0) {
    confirmationUsers = epConfirm.map(u => typeof u === 'object' ? u : findUserById(u)).filter(Boolean);
  }

  // Also check for issueSection/countermeasureSection/confirmationSection format (frontend state)
  if (issueUsers.length === 0 && data.issueSection) {
    const section = data.issueSection;
    if (section.primary) issueUsers.push(typeof section.primary === 'object' ? section.primary : findUserById(section.primary));
    if (section.approvers) {
      section.approvers.forEach(a => {
        if (a) issueUsers.push(typeof a === 'object' ? a : findUserById(a));
      });
    }
    issueUsers = issueUsers.filter(Boolean);
  }

  if (countermeasureUsers.length === 0 && data.countermeasureSection) {
    const section = data.countermeasureSection;
    if (section.primary) countermeasureUsers.push(typeof section.primary === 'object' ? section.primary : findUserById(section.primary));
    if (section.approvers) {
      section.approvers.forEach(a => {
        if (a) countermeasureUsers.push(typeof a === 'object' ? a : findUserById(a));
      });
    }
    countermeasureUsers = countermeasureUsers.filter(Boolean);
  }

  if (confirmationUsers.length === 0 && data.confirmationSection) {
    const section = data.confirmationSection;
    if (section.primary) confirmationUsers.push(typeof section.primary === 'object' ? section.primary : findUserById(section.primary));
    if (section.approvers) {
      section.approvers.forEach(a => {
        if (a) confirmationUsers.push(typeof a === 'object' ? a : findUserById(a));
      });
    }
    confirmationUsers = confirmationUsers.filter(Boolean);
  }

  // Images are now passed as base64 to avoid CORS issues
  const hasPhotos = images.photo_no_good || images.photo_ok;

  // Get 4M and 5Whys data
  const fourMData = data.d44mEvaluation || data.d4_4mEvaluation || [];
  const fiveWhysData = data.d45whysAnalysis || data.d4_5whysAnalysis || [];

  // Parts data
  const partsData = data.parts || data.selectedParts || [];

  return (
    <Document>
      {/* PAGE 1 - Info General, D1, D2 */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.logo}>QUALITY ALERT SYSTEM</Text>
            <Text style={styles.reportId}>{data.reportId || 'NUEVO'}</Text>
          </View>
          <Text style={styles.title}>REPORTE 8D - SOLUCIÓN DE PROBLEMAS</Text>
          <Text style={styles.subtitle}>
            Generado: {formatDateTime(new Date())} | Estado General: {data.status?.toUpperCase() || 'EN PROCESO'}
          </Text>
        </View>

        {/* Info General */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>INFORMACIÓN GENERAL</Text>
          </View>
          <View style={styles.sectionContent}>
            <View style={styles.twoCol}>
              <View style={styles.col}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Título:</Text>
                  <Text style={styles.infoValue}>{data.title || '-'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Cliente:</Text>
                  <Text style={styles.infoValue}>{data.selectedClient?.name || data.clientName || '-'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Proyecto:</Text>
                  <Text style={styles.infoValue}>{data.selectedProject?.projectName || data.projectName || '-'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Proveedor:</Text>
                  <Text style={styles.infoValue}>{data.supplierName || '-'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Severidad:</Text>
                  <Text style={[styles.infoValue, { color: data.severity === 'High' ? '#c53030' : data.severity === 'Medium' ? '#d69e2e' : '#38a169' }]}>
                    {data.severity || '-'}
                  </Text>
                </View>
              </View>
              <View style={styles.col}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Fecha Emisión:</Text>
                  <Text style={styles.infoValue}>{formatDate(data.issueDate || data.createdAt)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Fecha Objetivo:</Text>
                  <Text style={styles.infoValue}>{formatDate(data.targetCloseDate || data.targetClosureDate)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Tipo Issue:</Text>
                  <Text style={styles.infoValue}>{data.tipoIssue || '-'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Tipo Responsable:</Text>
                  <Text style={styles.infoValue}>{data.tipoResp || '-'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Costo Estimado:</Text>
                  <Text style={styles.infoValue}>${Number(data.estimatedCost || 0).toLocaleString()}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* D1 - Equipo */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>D1 - ESTABLECER EQUIPO</Text>
          </View>
          <View style={styles.sectionContent}>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={{ width: '25%' }}>Sección</Text>
                <Text style={{ width: '20%' }}>Rol</Text>
                <Text style={{ width: '35%' }}>Nombre</Text>
                <Text style={{ width: '20%' }}>Email/Depto</Text>
              </View>
              {issueUsers.map((user, idx) => (
                <View key={`issue-${idx}`} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={{ width: '25%' }}>{idx === 0 ? 'Issue (D1-D3)' : ''}</Text>
                  <Text style={{ width: '20%' }}>{idx === 0 ? 'Responsable' : `Aprobador ${idx}`}</Text>
                  <Text style={{ width: '35%' }}>{getUserName(user, users)}</Text>
                  <Text style={{ width: '20%', fontSize: 6 }}>{typeof user === 'object' ? (user.department || user.email || '') : ''}</Text>
                </View>
              ))}
              {countermeasureUsers.map((user, idx) => (
                <View key={`counter-${idx}`} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={{ width: '25%' }}>{idx === 0 ? 'Contramedidas (D4-D7)' : ''}</Text>
                  <Text style={{ width: '20%' }}>{idx === 0 ? 'Responsable' : `Aprobador ${idx}`}</Text>
                  <Text style={{ width: '35%' }}>{getUserName(user, users)}</Text>
                  <Text style={{ width: '20%', fontSize: 6 }}>{typeof user === 'object' ? (user.department || user.email || '') : ''}</Text>
                </View>
              ))}
              {confirmationUsers.map((user, idx) => (
                <View key={`confirm-${idx}`} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={{ width: '25%' }}>{idx === 0 ? 'Confirmación (D8)' : ''}</Text>
                  <Text style={{ width: '20%' }}>{idx === 0 ? 'Responsable' : `Aprobador ${idx}`}</Text>
                  <Text style={{ width: '35%' }}>{getUserName(user, users)}</Text>
                  <Text style={{ width: '20%', fontSize: 6 }}>{typeof user === 'object' ? (user.department || user.email || '') : ''}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* D2 - Descripción */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>D2 - DESCRIPCIÓN DEL PROBLEMA</Text>
          </View>
          <View style={styles.sectionContent}>
            <Text style={{ fontSize: 9, marginBottom: 8 }}>{data.description || 'Sin descripción'}</Text>

            {/* Images as base64 */}
            {hasPhotos && (
              <View style={styles.imageContainer}>
                {images.photo_no_good && (
                  <View style={styles.imageBox}>
                    <Text style={[styles.imageTitle, { color: '#c53030' }]}>NO GOOD</Text>
                    <Image style={styles.image} src={images.photo_no_good} />
                  </View>
                )}
                {images.photo_ok && (
                  <View style={styles.imageBox}>
                    <Text style={[styles.imageTitle, { color: '#2f855a' }]}>OK (Referencia)</Text>
                    <Image style={styles.image} src={images.photo_ok} />
                  </View>
                )}
              </View>
            )}

            {partsData.length > 0 && (
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>Partes Afectadas ({partsData.length})</Text>
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={{ width: '15%' }}>Número</Text>
                    <Text style={{ width: '20%' }}>Nombre</Text>
                    <Text style={{ width: '10%', textAlign: 'center' }}>Almacén</Text>
                    <Text style={{ width: '10%', textAlign: 'center' }}>Proceso</Text>
                    <Text style={{ width: '10%', textAlign: 'center' }}>Tránsito</Text>
                    <Text style={{ width: '10%', textAlign: 'center' }}>Cliente</Text>
                    <Text style={{ width: '10%', textAlign: 'right' }}>Total</Text>
                    <Text style={{ width: '15%', textAlign: 'right' }}>Impacto</Text>
                  </View>
                  {partsData.slice(0, 8).map((part, idx) => (
                    <View key={idx} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                      <Text style={{ width: '15%', fontSize: 7 }}>{part.partNumber || '-'}</Text>
                      <Text style={{ width: '20%', fontSize: 7 }}>{part.partName || '-'}</Text>
                      <Text style={{ width: '10%', textAlign: 'center', fontSize: 7 }}>{Number(part.qtyWarehouse || part.qty_warehouse || 0).toLocaleString()}</Text>
                      <Text style={{ width: '10%', textAlign: 'center', fontSize: 7 }}>{Number(part.qtyInProcess || part.qty_in_process || 0).toLocaleString()}</Text>
                      <Text style={{ width: '10%', textAlign: 'center', fontSize: 7 }}>{Number(part.qtyInTransit || part.qty_in_transit || 0).toLocaleString()}</Text>
                      <Text style={{ width: '10%', textAlign: 'center', fontSize: 7 }}>{Number(part.qtyWithCustomer || part.qty_with_customer || 0).toLocaleString()}</Text>
                      <Text style={{ width: '10%', textAlign: 'right', fontSize: 7, fontWeight: 'bold' }}>{Number(part.totalAffectedQty || 0).toLocaleString()}</Text>
                      <Text style={{ width: '15%', textAlign: 'right', fontSize: 7 }}>${Number(part.totalCostImpact || 0).toLocaleString()}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Quality Alert System - {data.reportId}</Text>
          <Text>Generado: {formatDateTime(new Date())}</Text>
        </View>
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} fixed />
      </Page>

      {/* PAGE 2 - D3, D3-MFG */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>D3 - ACCIONES DE CONTENCIÓN INMEDIATA</Text>
          </View>
          <View style={styles.sectionContent}>
            {data.d3DetectionPoints ? (
              <>
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={{ width: '60%' }}>Punto de Detección</Text>
                    <Text style={{ width: '20%', textAlign: 'center' }}>SÍ</Text>
                    <Text style={{ width: '20%', textAlign: 'center' }}>NO</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={{ width: '60%' }}>Durante el Proceso</Text>
                    <Text style={{ width: '20%', textAlign: 'center' }}>{data.d3DetectionPoints?.duringProcess?.yes ? '✓' : ''}</Text>
                    <Text style={{ width: '20%', textAlign: 'center' }}>{data.d3DetectionPoints?.duringProcess?.no ? '✓' : ''}</Text>
                  </View>
                  <View style={styles.tableRowAlt}>
                    <Text style={{ width: '60%' }}>Después de Manufactura</Text>
                    <Text style={{ width: '20%', textAlign: 'center' }}>{data.d3DetectionPoints?.afterManufacture?.yes ? '✓' : ''}</Text>
                    <Text style={{ width: '20%', textAlign: 'center' }}>{data.d3DetectionPoints?.afterManufacture?.no ? '✓' : ''}</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={{ width: '60%' }}>Antes del Despacho</Text>
                    <Text style={{ width: '20%', textAlign: 'center' }}>{data.d3DetectionPoints?.priorDespatch?.yes ? '✓' : ''}</Text>
                    <Text style={{ width: '20%', textAlign: 'center' }}>{data.d3DetectionPoints?.priorDespatch?.no ? '✓' : ''}</Text>
                  </View>
                </View>

                {data.d3NonDetectionReasons?.filter(r => r).length > 0 && (
                  <View style={styles.subsection}>
                    <Text style={styles.subsectionTitle}>5 Por Qué No Detectado</Text>
                    {data.d3NonDetectionReasons.filter(r => r).map((reason, idx) => (
                      <View key={idx} style={styles.whyRow}>
                        <Text style={styles.whyLabel}>¿Por qué {idx + 1}?</Text>
                        <Text style={styles.whyText}>{String(reason)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.subsection}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Disposición Material:</Text>
                    <Text style={styles.infoValue}>{data.d3SuspectMaterialDisposal || '-'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Garantía Conformidad:</Text>
                    <Text style={styles.infoValue}>{data.d3ConformanceGuarantee || '-'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Requiere Retrabajo:</Text>
                    <Text style={styles.infoValue}>{data.d3RequiresRework ? `Sí - $${data.d3ReworkUnitCost}/unidad` : 'No'}</Text>
                  </View>
                </View>
              </>
            ) : (
              <Text style={styles.small}>Sin datos de contención</Text>
            )}

            <View style={styles.approvalBox}>
              <View style={styles.approvalRow}>
                <Text style={{ fontSize: 8, fontWeight: 'bold' }}>Estado D1-D2-D3:</Text>
                <Text style={getStatusStyle(data.d1D2D3ApprovalStatus)}>{getStatusText(data.d1D2D3ApprovalStatus)}</Text>
              </View>
              <View style={styles.approvalRow}>
                <Text style={styles.small}>Paso de aprobación:</Text>
                <Text style={styles.small}>{data.currentApprovalStep || 0} de 4</Text>
              </View>
            </View>
          </View>
        </View>

        {/* D3-MFG */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>D3-MFG - ACCIONES DE MANUFACTURA</Text>
          </View>
          <View style={styles.sectionContent}>
            {data.d3MfgTemporaryControls?.length > 0 && (
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>Controles Temporales</Text>
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={{ width: '50%' }}>Descripción</Text>
                    <Text style={{ width: '50%' }}>Comentarios</Text>
                  </View>
                  {data.d3MfgTemporaryControls.map((item, idx) => (
                    <View key={idx} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                      <Text style={{ width: '50%' }}>{typeof item === 'string' ? item : (item.description || '-')}</Text>
                      <Text style={{ width: '50%' }}>{typeof item === 'object' ? (item.comments || '-') : '-'}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {data.d3MfgPokaYokeDevices?.length > 0 && (
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>Dispositivos Poka-Yoke</Text>
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={{ width: '25%' }}>Dispositivo</Text>
                    <Text style={{ width: '25%' }}>Propósito</Text>
                    <Text style={{ width: '20%' }}>Ubicación</Text>
                    <Text style={{ width: '30%' }}>Comentarios</Text>
                  </View>
                  {data.d3MfgPokaYokeDevices.map((item, idx) => (
                    <View key={idx} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                      <Text style={{ width: '25%' }}>{typeof item === 'string' ? item : (item.device || '-')}</Text>
                      <Text style={{ width: '25%' }}>{typeof item === 'object' ? (item.purpose || '-') : '-'}</Text>
                      <Text style={{ width: '20%' }}>{typeof item === 'object' ? (item.location || '-') : '-'}</Text>
                      <Text style={{ width: '30%' }}>{typeof item === 'object' ? (item.comments || '-') : '-'}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha Implementación:</Text>
              <Text style={styles.infoValue}>{formatDate(data.d3MfgImplementationDate)}</Text>
            </View>

            <View style={styles.approvalBox}>
              <View style={styles.approvalRow}>
                <Text style={{ fontSize: 8, fontWeight: 'bold' }}>Estado D3-MFG:</Text>
                <Text style={getStatusStyle(data.d3MfgStatus)}>{getStatusText(data.d3MfgStatus)}</Text>
              </View>
              <View style={styles.approvalRow}>
                <Text style={styles.small}>Paso:</Text>
                <Text style={styles.small}>{data.d3MfgCurrentApprovalStep || 0} de 4</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Quality Alert System - {data.reportId}</Text>
          <Text>Generado: {formatDateTime(new Date())}</Text>
        </View>
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} fixed />
      </Page>

      {/* PAGE 3 - D4 */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>D4 - ANÁLISIS DE CAUSA RAÍZ</Text>
          </View>
          <View style={styles.sectionContent}>
            {fourMData.length > 0 && (
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>Evaluación 4M</Text>
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={{ width: '15%' }}>Categoría</Text>
                    <Text style={{ width: '22%' }}>Estándar</Text>
                    <Text style={{ width: '22%' }}>Realidad</Text>
                    <Text style={{ width: '10%' }}>Std</Text>
                    <Text style={{ width: '10%' }}>Qty</Text>
                    <Text style={{ width: '21%' }}>Comentario</Text>
                  </View>
                  {fourMData.map((item, idx) => (
                    <View key={idx} style={item.standardJudgment === 'NG' ? styles.tableRowNG : (idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt)}>
                      <Text style={{ width: '15%', fontWeight: item.standardJudgment === 'NG' ? 'bold' : 'normal' }}>
                        {String(item.category || '-')}
                      </Text>
                      <Text style={{ width: '22%' }}>{String(item.standard || '-')}</Text>
                      <Text style={{ width: '22%' }}>{String(item.reality || '-')}</Text>
                      <Text style={{ width: '10%', textAlign: 'center', fontWeight: 'bold', color: item.standardJudgment === 'NG' ? '#c53030' : '#2f855a' }}>
                        {item.standardJudgment || '-'}
                      </Text>
                      <Text style={{ width: '10%', textAlign: 'center' }}>{item.qualityJudgment || '-'}</Text>
                      <Text style={{ width: '21%', fontSize: 6 }}>{String(item.comment || '-')}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {fiveWhysData.length > 0 && (
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>Análisis 5 Por Qué</Text>
                {fiveWhysData.map((whySet, setIdx) => (
                  <View key={setIdx} style={styles.mBox}>
                    <Text style={[styles.mTitle, { color: '#92400e' }]}>
                      {whySet.factorNG ? `Factor NG: ${String(whySet.factorNG)}` : `Análisis #${setIdx + 1}`}
                    </Text>
                    {[1, 2, 3, 4, 5].map(n => whySet[`why${n}`] && (
                      <View key={n} style={styles.whyRow}>
                        <Text style={styles.whyLabel}>¿Por qué {n}?</Text>
                        <Text style={styles.whyText}>{String(whySet[`why${n}`])}</Text>
                      </View>
                    ))}
                    {whySet.rootCause && (
                      <View style={[styles.whyRow, { backgroundColor: '#fef3c7', padding: 4, marginTop: 3, borderRadius: 2 }]}>
                        <Text style={[styles.whyLabel, { color: '#92400e' }]}>CAUSA RAÍZ:</Text>
                        <Text style={[styles.whyText, { fontWeight: 'bold' }]}>{String(whySet.rootCause)}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {data.d4RootCause && (
              <View style={[styles.mBox, { backgroundColor: '#fef3c7', borderColor: '#d69e2e' }]}>
                <Text style={[styles.mTitle, { color: '#92400e', fontSize: 9 }]}>CAUSA RAÍZ PRINCIPAL</Text>
                <Text style={{ fontSize: 10, fontWeight: 'bold' }}>{String(data.d4RootCause)}</Text>
              </View>
            )}

            <View style={styles.approvalBox}>
              <View style={styles.approvalRow}>
                <Text style={{ fontSize: 8, fontWeight: 'bold' }}>Estado D4:</Text>
                <Text style={getStatusStyle(data.d4Status)}>{getStatusText(data.d4Status)}</Text>
              </View>
              <View style={styles.approvalRow}>
                <Text style={styles.small}>Paso:</Text>
                <Text style={styles.small}>{data.d4CurrentApprovalStep || 0} de 4</Text>
              </View>
              {data.d4Completed && (
                <View style={styles.approvalRow}>
                  <Text style={styles.small}>Completado:</Text>
                  <Text style={[styles.small, styles.statusApproved]}>✓ SÍ</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Quality Alert System - {data.reportId}</Text>
          <Text>Generado: {formatDateTime(new Date())}</Text>
        </View>
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} fixed />
      </Page>

      {/* PAGE 4 - D5, D6 */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>D5 - ACCIONES CORRECTIVAS PERMANENTES</Text>
          </View>
          <View style={styles.sectionContent}>
            {data.d5CorrectiveActions?.length > 0 ? (
              data.d5CorrectiveActions.map((actionGroup, groupIdx) => (
                <View key={groupIdx} style={styles.mBox}>
                  {actionGroup.linkedRootCause && (
                    <Text style={[styles.mTitle, { color: '#92400e' }]}>Causa: {String(actionGroup.linkedRootCause)}</Text>
                  )}
                  {actionGroup.actionPlans?.length > 0 ? (
                    actionGroup.actionPlans.map((plan, planIdx) => (
                      <View key={planIdx}>
                        <Text style={{ fontSize: 8, fontWeight: 'bold', marginBottom: 3, color: '#2c5282' }}>
                          {String(plan.planName || `Plan ${planIdx + 1}`)}
                        </Text>
                        <View style={styles.table}>
                          <View style={styles.tableHeader}>
                            <Text style={{ width: '25%' }}>Actividad</Text>
                            <Text style={{ width: '30%' }}>Descripción</Text>
                            <Text style={{ width: '20%' }}>Fecha</Text>
                            <Text style={{ width: '25%' }}>Efecto Esperado</Text>
                          </View>
                          {plan.activities?.map((activity, actIdx) => (
                            <View key={actIdx} style={actIdx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                              <Text style={{ width: '25%' }}>{String(activity.activity || '-')}</Text>
                              <Text style={{ width: '30%', fontSize: 6 }}>{String(activity.detailedDescription || '-')}</Text>
                              <Text style={{ width: '20%' }}>{formatDate(activity.deadline)}</Text>
                              <Text style={{ width: '25%', fontSize: 6 }}>{String(activity.expectedEffect || '-')}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={{ fontSize: 8 }}>{String(actionGroup.action || actionGroup.description || '-')}</Text>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.small}>Sin acciones correctivas</Text>
            )}

            <View style={styles.approvalBox}>
              <View style={styles.approvalRow}>
                <Text style={{ fontSize: 8, fontWeight: 'bold' }}>Estado D5:</Text>
                <Text style={getStatusStyle(data.d5Status)}>{getStatusText(data.d5Status)}</Text>
              </View>
              <View style={styles.approvalRow}>
                <Text style={styles.small}>Paso:</Text>
                <Text style={styles.small}>{data.d5CurrentApprovalStep || 0} de 4</Text>
              </View>
            </View>
          </View>
        </View>

        {/* D6 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>D6 - IMPLEMENTAR ACCIONES DEFINITIVAS</Text>
          </View>
          <View style={styles.sectionContent}>
            {/* Descripción de Contramedida */}
            {data.d6CountermeasureDescription && (
              <View style={[styles.mBox, { backgroundColor: '#f0fdf4', borderColor: '#22c55e' }]}>
                <Text style={[styles.mTitle, { color: '#166534' }]}>Descripción de la Contramedida</Text>
                <Text style={{ fontSize: 9 }}>{String(data.d6CountermeasureDescription)}</Text>
              </View>
            )}

            {/* Tabla de Acciones Definitivas */}
            {data.d6DefinitiveActions?.length > 0 && (
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>Plan de Acciones Definitivas ({data.d6DefinitiveActions.length})</Text>
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={{ width: '25%' }}>Acción</Text>
                    <Text style={{ width: '18%' }}>Resultado</Text>
                    <Text style={{ width: '17%' }}>Responsable</Text>
                    <Text style={{ width: '10%' }}>Inicio</Text>
                    <Text style={{ width: '10%' }}>Fin</Text>
                    <Text style={{ width: '10%', textAlign: 'center' }}>Plan%</Text>
                    <Text style={{ width: '10%', textAlign: 'center' }}>Real%</Text>
                  </View>
                  {data.d6DefinitiveActions.map((action, idx) => {
                    const responsibleName = action.responsible
                      ? (typeof action.responsible === 'object'
                          ? `${action.responsible.firstName || ''} ${action.responsible.lastName || ''}`.trim() || action.responsible.email
                          : getUserName(action.responsible, users))
                      : '-';
                    return (
                      <View key={idx} style={action.actualProgress >= 100 ? styles.tableRowApproved : (idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt)}>
                        <Text style={{ width: '25%', fontSize: 7 }}>{String(action.action || '-')}</Text>
                        <Text style={{ width: '18%', fontSize: 6 }}>{String(action.result || '-')}</Text>
                        <Text style={{ width: '17%', fontSize: 6 }}>{responsibleName}</Text>
                        <Text style={{ width: '10%', fontSize: 7 }}>{formatDate(action.startDate || action.start_date)}</Text>
                        <Text style={{ width: '10%', fontSize: 7 }}>{formatDate(action.endDate || action.end_date)}</Text>
                        <Text style={{ width: '10%', textAlign: 'center', fontSize: 7 }}>{action.plannedProgress || action.planned_progress || 0}%</Text>
                        <Text style={{ width: '10%', textAlign: 'center', fontSize: 7, fontWeight: 'bold', color: (action.actualProgress || action.actual_progress || 0) >= 100 ? '#166534' : '#718096' }}>
                          {action.actualProgress || action.actual_progress || 0}%
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Evidencia Antes/Después */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              {/* ANTES */}
              <View style={{ flex: 1, border: '2px solid #ef4444', borderRadius: 4, padding: 8 }}>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#991b1b', marginBottom: 6 }}>ANTES de la Contramedida</Text>
                {(data.beforeCondition || data.before_condition) && (
                  <View style={{ marginBottom: 6 }}>
                    <Text style={{ fontSize: 7, color: '#718096', marginBottom: 2 }}>Condición Anterior:</Text>
                    <Text style={{ fontSize: 8 }}>{String(data.beforeCondition || data.before_condition)}</Text>
                  </View>
                )}
                {images.d6_before && (
                  <Image style={{ width: '100%', maxHeight: 100, objectFit: 'contain' }} src={images.d6_before} />
                )}
                {!images.d6_before && !(data.beforeCondition || data.before_condition) && (
                  <Text style={{ fontSize: 7, color: '#9ca3af', fontStyle: 'italic' }}>Sin evidencia</Text>
                )}
              </View>

              {/* DESPUÉS */}
              <View style={{ flex: 1, border: '2px solid #22c55e', borderRadius: 4, padding: 8 }}>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#166534', marginBottom: 6 }}>DESPUÉS de la Contramedida</Text>
                {(data.afterCondition || data.after_condition) && (
                  <View style={{ marginBottom: 6 }}>
                    <Text style={{ fontSize: 7, color: '#718096', marginBottom: 2 }}>Condición Posterior:</Text>
                    <Text style={{ fontSize: 8 }}>{String(data.afterCondition || data.after_condition)}</Text>
                  </View>
                )}
                {images.d6_after && (
                  <Image style={{ width: '100%', maxHeight: 100, objectFit: 'contain' }} src={images.d6_after} />
                )}
                {!images.d6_after && !(data.afterCondition || data.after_condition) && (
                  <Text style={{ fontSize: 7, color: '#9ca3af', fontStyle: 'italic' }}>Sin evidencia</Text>
                )}
              </View>
            </View>

            <View style={styles.approvalBox}>
              <View style={styles.approvalRow}>
                <Text style={{ fontSize: 8, fontWeight: 'bold' }}>Estado D6:</Text>
                <Text style={getStatusStyle(data.d6Status)}>{getStatusText(data.d6Status)}</Text>
              </View>
              <View style={styles.approvalRow}>
                <Text style={styles.small}>Paso:</Text>
                <Text style={styles.small}>{data.d6CurrentApprovalStep || 0} de 4</Text>
              </View>
              {(data.d6Completed || data.d6CompletedAt) && (
                <View style={styles.approvalRow}>
                  <Text style={styles.small}>Completado:</Text>
                  <Text style={[styles.small, styles.statusApproved]}>{data.d6CompletedAt ? formatDateTime(data.d6CompletedAt) : '✓ SÍ'}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Quality Alert System - {data.reportId}</Text>
          <Text>Generado: {formatDateTime(new Date())}</Text>
        </View>
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} fixed />
      </Page>

      {/* PAGE 5 - D7, D8, Resumen */}
      <Page size="A4" style={styles.page}>
        {/* D7 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>D7 - PREVENIR RECURRENCIA / VALIDACIÓN</Text>
          </View>
          <View style={styles.sectionContent}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Acciones Efectivas:</Text>
              <Text style={[styles.infoValue, data.d7IsEffective ? styles.statusApproved : {}]}>
                {data.d7IsEffective ? 'SÍ - Verificado' : 'Pendiente de validación'}
              </Text>
            </View>

            <View style={styles.approvalBox}>
              <View style={styles.approvalRow}>
                <Text style={{ fontSize: 8, fontWeight: 'bold' }}>Estado D7:</Text>
                <Text style={getStatusStyle(data.d7Status)}>{getStatusText(data.d7Status)}</Text>
              </View>
              <View style={styles.approvalRow}>
                <Text style={styles.small}>Paso:</Text>
                <Text style={styles.small}>{data.d7CurrentApprovalStep || 0} de 4</Text>
              </View>
              {data.d7CompletedAt && (
                <View style={styles.approvalRow}>
                  <Text style={styles.small}>Completado:</Text>
                  <Text style={styles.small}>{formatDateTime(data.d7CompletedAt)}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* D8 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>D8 - CIERRE Y RECONOCIMIENTO</Text>
          </View>
          <View style={styles.sectionContent}>
            {data.d8FollowupActions?.length > 0 && (
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>Acciones de Seguimiento</Text>
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={{ width: '60%' }}>Acción</Text>
                    <Text style={{ width: '20%' }}>Fecha</Text>
                    <Text style={{ width: '20%' }}>Estado</Text>
                  </View>
                  {data.d8FollowupActions.map((action, idx) => (
                    <View key={idx} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                      <Text style={{ width: '60%' }}>{String(action.item || action.action || '-')}</Text>
                      <Text style={{ width: '20%' }}>{formatDate(action.dueDate)}</Text>
                      <Text style={{ width: '20%' }}>{String(action.status || 'Pendiente')}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {data.d8LessonsLearned && (
              <View style={[styles.mBox, { backgroundColor: '#e6fffa' }]}>
                <Text style={[styles.mTitle, { color: '#234e52' }]}>Lecciones Aprendidas</Text>
                <Text style={{ fontSize: 8 }}>{String(data.d8LessonsLearned)}</Text>
              </View>
            )}

            {data.d8ClosureNotes && (
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>Notas de Cierre</Text>
                <Text style={{ fontSize: 8 }}>{String(data.d8ClosureNotes)}</Text>
              </View>
            )}

            <View style={styles.approvalBox}>
              <View style={styles.approvalRow}>
                <Text style={{ fontSize: 8, fontWeight: 'bold' }}>Estado D8:</Text>
                <Text style={getStatusStyle(data.d8Status)}>{getStatusText(data.d8Status)}</Text>
              </View>
              <View style={styles.approvalRow}>
                <Text style={styles.small}>Paso:</Text>
                <Text style={styles.small}>{data.d8CurrentApprovalStep || 0} de 4</Text>
              </View>
            </View>
          </View>
        </View>

        {/* RESUMEN DE APROBACIONES */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, { backgroundColor: '#1a365d' }]}>
            <Text style={styles.sectionTitle}>RESUMEN DE ESTADO POR SECCIÓN</Text>
          </View>
          <View style={styles.sectionContent}>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={{ width: '20%' }}>Sección</Text>
                <Text style={{ width: '20%' }}>Estado</Text>
                <Text style={{ width: '40%' }}>Responsables Asignados</Text>
                <Text style={{ width: '20%', textAlign: 'center' }}>Completado</Text>
              </View>

              {/* D1-D2-D3 */}
              <View style={data.d1D2D3ApprovalStatus === 'approved' ? styles.tableRowApproved : styles.tableRow}>
                <Text style={{ width: '20%', fontWeight: 'bold' }}>D1-D2-D3</Text>
                <Text style={{ width: '20%', ...getStatusStyle(data.d1D2D3ApprovalStatus) }}>{getStatusText(data.d1D2D3ApprovalStatus)}</Text>
                <Text style={{ width: '40%', fontSize: 7 }}>{issueUsers.map(u => getUserName(u, users)).join(', ') || '-'}</Text>
                <Text style={{ width: '20%', textAlign: 'center', fontWeight: 'bold', color: data.d1D2D3ApprovalStatus === 'approved' ? '#22543d' : '#718096' }}>{data.d1D2D3ApprovalStatus === 'approved' ? '✓ SÍ' : 'NO'}</Text>
              </View>

              {/* D3-MFG */}
              <View style={data.d3MfgStatus === 'approved' ? styles.tableRowApproved : styles.tableRowAlt}>
                <Text style={{ width: '20%', fontWeight: 'bold' }}>D3-MFG</Text>
                <Text style={{ width: '20%', ...getStatusStyle(data.d3MfgStatus) }}>{getStatusText(data.d3MfgStatus)}</Text>
                <Text style={{ width: '40%', fontSize: 7 }}>{countermeasureUsers.map(u => getUserName(u, users)).join(', ') || '-'}</Text>
                <Text style={{ width: '20%', textAlign: 'center', fontWeight: 'bold', color: data.d3MfgStatus === 'approved' ? '#22543d' : '#718096' }}>{data.d3MfgStatus === 'approved' ? '✓ SÍ' : 'NO'}</Text>
              </View>

              {/* D4 */}
              <View style={data.d4Status === 'approved' ? styles.tableRowApproved : styles.tableRow}>
                <Text style={{ width: '20%', fontWeight: 'bold' }}>D4</Text>
                <Text style={{ width: '20%', ...getStatusStyle(data.d4Status) }}>{getStatusText(data.d4Status)}</Text>
                <Text style={{ width: '40%', fontSize: 7 }}>{countermeasureUsers.map(u => getUserName(u, users)).join(', ') || '-'}</Text>
                <Text style={{ width: '20%', textAlign: 'center', fontWeight: 'bold', color: data.d4Status === 'approved' ? '#22543d' : '#718096' }}>{data.d4Status === 'approved' ? '✓ SÍ' : 'NO'}</Text>
              </View>

              {/* D5 */}
              <View style={data.d5Status === 'approved' ? styles.tableRowApproved : styles.tableRowAlt}>
                <Text style={{ width: '20%', fontWeight: 'bold' }}>D5</Text>
                <Text style={{ width: '20%', ...getStatusStyle(data.d5Status) }}>{getStatusText(data.d5Status)}</Text>
                <Text style={{ width: '40%', fontSize: 7 }}>{countermeasureUsers.map(u => getUserName(u, users)).join(', ') || '-'}</Text>
                <Text style={{ width: '20%', textAlign: 'center', fontWeight: 'bold', color: data.d5Status === 'approved' ? '#22543d' : '#718096' }}>{data.d5Status === 'approved' ? '✓ SÍ' : 'NO'}</Text>
              </View>

              {/* D6 */}
              <View style={data.d6Status === 'approved' ? styles.tableRowApproved : styles.tableRow}>
                <Text style={{ width: '20%', fontWeight: 'bold' }}>D6</Text>
                <Text style={{ width: '20%', ...getStatusStyle(data.d6Status) }}>{getStatusText(data.d6Status)}</Text>
                <Text style={{ width: '40%', fontSize: 7 }}>{countermeasureUsers.map(u => getUserName(u, users)).join(', ') || '-'}</Text>
                <Text style={{ width: '20%', textAlign: 'center', fontWeight: 'bold', color: data.d6Status === 'approved' ? '#22543d' : '#718096' }}>{data.d6Status === 'approved' ? '✓ SÍ' : 'NO'}</Text>
              </View>

              {/* D7 */}
              <View style={data.d7Status === 'approved' ? styles.tableRowApproved : styles.tableRowAlt}>
                <Text style={{ width: '20%', fontWeight: 'bold' }}>D7</Text>
                <Text style={{ width: '20%', ...getStatusStyle(data.d7Status) }}>{getStatusText(data.d7Status)}</Text>
                <Text style={{ width: '40%', fontSize: 7 }}>{countermeasureUsers.map(u => getUserName(u, users)).join(', ') || '-'}</Text>
                <Text style={{ width: '20%', textAlign: 'center', fontWeight: 'bold', color: data.d7Status === 'approved' ? '#22543d' : '#718096' }}>{data.d7Status === 'approved' ? '✓ SÍ' : 'NO'}</Text>
              </View>

              {/* D8 */}
              <View style={data.d8Status === 'approved' ? styles.tableRowApproved : styles.tableRow}>
                <Text style={{ width: '20%', fontWeight: 'bold' }}>D8</Text>
                <Text style={{ width: '20%', ...getStatusStyle(data.d8Status) }}>{getStatusText(data.d8Status)}</Text>
                <Text style={{ width: '40%', fontSize: 7 }}>{confirmationUsers.map(u => getUserName(u, users)).join(', ') || '-'}</Text>
                <Text style={{ width: '20%', textAlign: 'center', fontWeight: 'bold', color: data.d8Status === 'approved' ? '#22543d' : '#718096' }}>{data.d8Status === 'approved' ? '✓ SÍ' : 'NO'}</Text>
              </View>
            </View>

            <View style={{ marginTop: 10, padding: 8, backgroundColor: '#f7fafc', borderRadius: 3 }}>
              <Text style={{ fontSize: 7, color: '#718096' }}>
                Los responsables mostrados son los asignados a cada sección del proceso 8D.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Quality Alert System - {data.reportId}</Text>
          <Text>Generado: {formatDateTime(new Date())}</Text>
        </View>
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} fixed />
      </Page>
    </Document>
  );
};

export default EightDPDF;
