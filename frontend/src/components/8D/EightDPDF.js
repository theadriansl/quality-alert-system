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
    marginTop: 8,
    padding: 6,
    backgroundColor: '#f0f4f8',
    borderRadius: 3,
    borderLeft: '3px solid #2c5282'
  },
  approvalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2
  },
  statusApproved: {
    color: '#22543d',
    fontWeight: 'bold',
    fontSize: 8
  },
  statusPending: {
    color: '#c05621',
    fontWeight: 'bold',
    fontSize: 8
  },
  statusDraft: {
    color: '#718096',
    fontSize: 8
  }
});

const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric', month: '2-digit', day: '2-digit'
    });
  } catch { return '-'; }
};

const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleString('es-MX', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return '-'; }
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

// Page Header Component
const PageHeader = ({ data }) => (
  <View style={styles.header}>
    <View style={styles.headerTop}>
      <Text style={styles.logo}>QUALITY ALERT SYSTEM</Text>
      <Text style={styles.reportId}>{data.reportId || 'NUEVO'}</Text>
    </View>
    <Text style={styles.title}>REPORTE 8D</Text>
    <Text style={styles.subtitle}>Estado: {data.status?.toUpperCase() || 'EN PROCESO'}</Text>
  </View>
);

// Page Footer Component
const PageFooter = ({ data }) => (
  <>
    <View style={styles.footer}>
      <Text>Quality Alert System - {data.reportId}</Text>
      <Text>Generado: {formatDateTime(new Date())}</Text>
    </View>
    <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
  </>
);

const EightDPDF = ({ data, users = [], images = {} }) => {
  if (!data) return null;

  const findUserById = (userId) => {
    if (!userId) return null;
    if (typeof userId === 'object') return userId;
    return users.find(u => u.id === userId || u.id === parseInt(userId));
  };

  const escalationPath = data.escalationPath || {};
  const epIssue = escalationPath.issue_users || escalationPath.issueUsers || [];
  const epCounter = escalationPath.countermeasure_users || escalationPath.countermeasureUsers || [];
  const epConfirm = escalationPath.confirmation_users || escalationPath.confirmationUsers || [];

  const issueUsers = epIssue.map(u => typeof u === 'object' ? u : findUserById(u)).filter(Boolean);
  const countermeasureUsers = epCounter.map(u => typeof u === 'object' ? u : findUserById(u)).filter(Boolean);
  const confirmationUsers = epConfirm.map(u => typeof u === 'object' ? u : findUserById(u)).filter(Boolean);

  const hasPhotos = images.photo_no_good || images.photo_ok;
  const hasD6Photos = images.d6_before || images.d6_after;
  const fiveWhysData = data.d45whysAnalysis || data.d4_5whysAnalysis || [];
  const partsData = data.parts || data.selectedParts || [];
  const hasD4Data = fiveWhysData.length > 0 || data.d4RootCause;
  const hasD5Data = data.d5CorrectiveActions?.length > 0;
  const hasD8Data = data.d8LessonsLearned || data.d8ClosureNotes || data.d8FollowupActions?.length > 0;

  return (
    <Document>
      {/* PAGE 1 - Info General + D1 + D2 */}
      <Page size="A4" style={styles.page}>
        <PageHeader data={data} />

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
                  <Text style={styles.infoValue}>{data.supplierName || '-'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Número de Parte:</Text>
                  <Text style={styles.infoValue}>{data.partNumber || '-'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Nombre de Parte:</Text>
                  <Text style={styles.infoValue}>{data.partName || '-'}</Text>
                </View>
              </View>
              <View style={styles.col}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Severidad:</Text>
                  <Text style={styles.infoValue}>{data.severity || '-'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Fecha Issue:</Text>
                  <Text style={styles.infoValue}>{formatDate(data.issueDate)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Fecha Objetivo:</Text>
                  <Text style={styles.infoValue}>{formatDate(data.targetCloseDate)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Tipo Issue:</Text>
                  <Text style={styles.infoValue}>{data.tipoIssue || '-'}</Text>
                </View>
              </View>
            </View>
            {partsData.length > 0 && (
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>Partes Afectadas</Text>
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={{ width: '25%' }}>Número</Text>
                    <Text style={{ width: '35%' }}>Nombre</Text>
                    <Text style={{ width: '20%', textAlign: 'right' }}>Cantidad</Text>
                    <Text style={{ width: '20%', textAlign: 'right' }}>Costo</Text>
                  </View>
                  {partsData.slice(0, 5).map((part, idx) => (
                    <View key={idx} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                      <Text style={{ width: '25%' }}>{part.partNumber || '-'}</Text>
                      <Text style={{ width: '35%' }}>{part.partName || '-'}</Text>
                      <Text style={{ width: '20%', textAlign: 'right' }}>{part.totalAffectedQty || 0}</Text>
                      <Text style={{ width: '20%', textAlign: 'right' }}>${part.totalCostImpact || 0}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* D1 - Equipo */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>D1 - FORMACIÓN DEL EQUIPO</Text>
          </View>
          <View style={styles.sectionContent}>
            <View style={styles.twoCol}>
              <View style={styles.col}>
                <Text style={styles.subsectionTitle}>Issue/Escalación</Text>
                {issueUsers.length > 0 ? issueUsers.map((u, i) => (
                  <Text key={i} style={{ fontSize: 8, marginBottom: 2 }}>• {getUserName(u, users)}</Text>
                )) : <Text style={styles.small}>Sin asignar</Text>}
              </View>
              <View style={styles.col}>
                <Text style={styles.subsectionTitle}>Contramedidas</Text>
                {countermeasureUsers.length > 0 ? countermeasureUsers.map((u, i) => (
                  <Text key={i} style={{ fontSize: 8, marginBottom: 2 }}>• {getUserName(u, users)}</Text>
                )) : <Text style={styles.small}>Sin asignar</Text>}
              </View>
            </View>
          </View>
        </View>

        {/* D2 - Descripción */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>D2 - DESCRIPCIÓN DEL PROBLEMA</Text>
          </View>
          <View style={styles.sectionContent}>
            <Text style={{ fontSize: 9, marginBottom: 8 }}>{data.description || data.d2ProblemDescription || 'Sin descripción'}</Text>
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
                    <Text style={[styles.imageTitle, { color: '#22543d' }]}>OK (Referencia)</Text>
                    <Image style={styles.image} src={images.photo_ok} />
                  </View>
                )}
              </View>
            )}
            <View style={styles.approvalBox}>
              <View style={styles.approvalRow}>
                <Text style={{ fontSize: 8, fontWeight: 'bold' }}>Estado D1-D2-D3:</Text>
                <Text style={getStatusStyle(data.d1D2D3ApprovalStatus)}>{getStatusText(data.d1D2D3ApprovalStatus)}</Text>
              </View>
            </View>
          </View>
        </View>

        <PageFooter data={data} />
      </Page>

      {/* PAGE 2 - D3 Contención */}
      <Page size="A4" style={styles.page}>
        <PageHeader data={data} />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>D3 - ACCIONES DE CONTENCIÓN INMEDIATA</Text>
          </View>
          <View style={styles.sectionContent}>
            <View style={styles.twoCol}>
              <View style={styles.col}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Disposición Material:</Text>
                  <Text style={styles.infoValue}>{data.d3SuspectMaterialDisposal || '-'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Garantía Conformidad:</Text>
                  <Text style={styles.infoValue}>{data.d3ConformanceGuarantee || '-'}</Text>
                </View>
              </View>
              <View style={styles.col}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Requiere Retrabajo:</Text>
                  <Text style={styles.infoValue}>{data.d3RequiresRework ? `Sí - $${data.d3ReworkUnitCost}/unidad` : 'No'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Costo Impacto Real:</Text>
                  <Text style={styles.infoValue}>${data.d3RealImpactCost || 0}</Text>
                </View>
              </View>
            </View>

            {data.d3DetectionPoints && (
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>Puntos de Detección</Text>
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={{ width: '60%' }}>Punto</Text>
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
              </View>
            )}

            <View style={styles.approvalBox}>
              <View style={styles.approvalRow}>
                <Text style={{ fontSize: 8, fontWeight: 'bold' }}>Estado D3-MFG:</Text>
                <Text style={getStatusStyle(data.d3MfgStatus)}>{getStatusText(data.d3MfgStatus)}</Text>
              </View>
            </View>
          </View>
        </View>

        <PageFooter data={data} />
      </Page>

      {/* PAGE 3 - D4 Causa Raíz (solo si hay datos) */}
      {hasD4Data && (
        <Page size="A4" style={styles.page}>
          <PageHeader data={data} />

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>D4 - ANÁLISIS DE CAUSA RAÍZ</Text>
            </View>
            <View style={styles.sectionContent}>
              {fiveWhysData.length > 0 && fiveWhysData.map((whySet, setIdx) => (
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
              </View>
            </View>
          </View>

          <PageFooter data={data} />
        </Page>
      )}

      {/* PAGE 4 - D5 + D6 (solo si hay datos) */}
      {(hasD5Data || hasD6Photos || data.d6CountermeasureDescription) && (
        <Page size="A4" style={styles.page}>
          <PageHeader data={data} />

          {/* D5 */}
          {hasD5Data && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>D5 - ACCIONES CORRECTIVAS PERMANENTES</Text>
              </View>
              <View style={styles.sectionContent}>
                {data.d5CorrectiveActions.map((actionGroup, groupIdx) => (
                  <View key={groupIdx} style={styles.mBox}>
                    {actionGroup.linkedRootCause && (
                      <Text style={[styles.mTitle, { color: '#92400e' }]}>Causa: {String(actionGroup.linkedRootCause)}</Text>
                    )}
                    {actionGroup.actionPlans?.map((plan, planIdx) => (
                      <View key={planIdx}>
                        <Text style={{ fontSize: 8, fontWeight: 'bold', marginBottom: 3, color: '#2c5282' }}>
                          {String(plan.planName || `Plan ${planIdx + 1}`)}
                        </Text>
                        {plan.actions?.map((action, actIdx) => (
                          <Text key={actIdx} style={{ fontSize: 7, marginLeft: 10, marginBottom: 2 }}>
                            • {action.action || '-'} ({action.status || 'Pendiente'})
                          </Text>
                        ))}
                      </View>
                    ))}
                  </View>
                ))}
                <View style={styles.approvalBox}>
                  <View style={styles.approvalRow}>
                    <Text style={{ fontSize: 8, fontWeight: 'bold' }}>Estado D5:</Text>
                    <Text style={getStatusStyle(data.d5Status)}>{getStatusText(data.d5Status)}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* D6 */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>D6 - IMPLEMENTACIÓN Y VALIDACIÓN</Text>
            </View>
            <View style={styles.sectionContent}>
              {data.d6CountermeasureDescription && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Contramedida:</Text>
                  <Text style={styles.infoValue}>{data.d6CountermeasureDescription}</Text>
                </View>
              )}
              {hasD6Photos && (
                <View style={styles.imageContainer}>
                  {images.d6_before && (
                    <View style={styles.imageBox}>
                      <Text style={[styles.imageTitle, { color: '#c53030' }]}>ANTES</Text>
                      <Image style={styles.image} src={images.d6_before} />
                    </View>
                  )}
                  {images.d6_after && (
                    <View style={styles.imageBox}>
                      <Text style={[styles.imageTitle, { color: '#22543d' }]}>DESPUÉS</Text>
                      <Image style={styles.image} src={images.d6_after} />
                    </View>
                  )}
                </View>
              )}
              <View style={styles.approvalBox}>
                <View style={styles.approvalRow}>
                  <Text style={{ fontSize: 8, fontWeight: 'bold' }}>Estado D6:</Text>
                  <Text style={getStatusStyle(data.d6Status)}>{getStatusText(data.d6Status)}</Text>
                </View>
              </View>
            </View>
          </View>

          <PageFooter data={data} />
        </Page>
      )}

      {/* PAGE 5 - D7 + D8 + Resumen (siempre se muestra) */}
      <Page size="A4" style={styles.page}>
        <PageHeader data={data} />

        {/* D7 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>D7 - PREVENIR RECURRENCIA</Text>
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
            </View>
          </View>
        </View>

        {/* D8 */}
        {hasD8Data && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>D8 - CIERRE Y RECONOCIMIENTO</Text>
            </View>
            <View style={styles.sectionContent}>
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
              </View>
            </View>
          </View>
        )}

        {/* RESUMEN */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, { backgroundColor: '#1a365d' }]}>
            <Text style={styles.sectionTitle}>RESUMEN DE ESTADO</Text>
          </View>
          <View style={styles.sectionContent}>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={{ width: '20%' }}>Sección</Text>
                <Text style={{ width: '25%' }}>Estado</Text>
                <Text style={{ width: '40%' }}>Responsables</Text>
                <Text style={{ width: '15%', textAlign: 'center' }}>OK</Text>
              </View>
              {[
                { name: 'D1-D2-D3', status: data.d1D2D3ApprovalStatus, users: issueUsers },
                { name: 'D3-MFG', status: data.d3MfgStatus, users: countermeasureUsers },
                { name: 'D4', status: data.d4Status, users: countermeasureUsers },
                { name: 'D5', status: data.d5Status, users: countermeasureUsers },
                { name: 'D6', status: data.d6Status, users: countermeasureUsers },
                { name: 'D7', status: data.d7Status, users: countermeasureUsers },
                { name: 'D8', status: data.d8Status, users: confirmationUsers }
              ].map((row, idx) => (
                <View key={idx} style={row.status === 'approved' ? styles.tableRowApproved : (idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt)}>
                  <Text style={{ width: '20%', fontWeight: 'bold' }}>{row.name}</Text>
                  <Text style={{ width: '25%', ...getStatusStyle(row.status) }}>{getStatusText(row.status)}</Text>
                  <Text style={{ width: '40%', fontSize: 6 }}>{row.users.map(u => getUserName(u, users)).join(', ') || '-'}</Text>
                  <Text style={{ width: '15%', textAlign: 'center', fontWeight: 'bold', color: row.status === 'approved' ? '#22543d' : '#718096' }}>
                    {row.status === 'approved' ? '✓' : '-'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <PageFooter data={data} />
      </Page>
    </Document>
  );
};

export default EightDPDF;
