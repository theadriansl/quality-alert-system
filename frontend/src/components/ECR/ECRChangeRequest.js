import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTheme } from '../../context/ThemeContext';
import PartsInventoryTable from '../8D/PartsInventoryTable';

const ECRChangeRequest = ({ data, onDataUpdate, isReadOnly = false, language = 'es', t: translate }) => {
  const { theme: t } = useTheme();
  const styles = getStyles(t);

  // Translation helper with fallback
  const tr = (key) => translate ? translate(key) : key;
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [availableParts, setAvailableParts] = useState([]);

  // Helper function to clean blob URLs from photos
  const cleanPhotos = (photos) => {
    if (!photos || !Array.isArray(photos)) return [];
    return photos.filter(photo => {
      if (photo && photo.url) {
        // Only keep photos with base64 URLs or valid http URLs, filter out blob URLs
        return photo.url.startsWith('data:image/') || photo.url.startsWith('http');
      }
      return false;
    });
  };

  const [selectedClient, setSelectedClient] = useState(data.selectedClient || null);
  const [selectedProjects, setSelectedProjects] = useState(data.selectedProjects || []); // Changed to array
  const [selectedParts, setSelectedParts] = useState(data.selectedParts || []);
  const [customColumns, setCustomColumns] = useState(data.customColumns || []);

  const [beforeConditionDescription, setBeforeConditionDescription] = useState(data.beforeConditionDescription || '');
  const [afterConditionDescription, setAfterConditionDescription] = useState(data.afterConditionDescription || '');
  const [changeAttachments, setChangeAttachments] = useState(data.changeAttachments || []);
  const [beforePhotos, setBeforePhotos] = useState(() => cleanPhotos(data.beforePhotos));
  const [afterPhotos, setAfterPhotos] = useState(() => cleanPhotos(data.afterPhotos));
  const [affectedDocuments, setAffectedDocuments] = useState(data.affectedDocuments || []);
  const [newDocument, setNewDocument] = useState('');
  const [newDocumentFile, setNewDocumentFile] = useState(null);

  const [imageModal, setImageModal] = useState({
    isOpen: false,
    imageUrl: '',
    imageName: ''
  });

  // Auto-expand if there's already data selected
  const [isPartsSelectionExpanded, setIsPartsSelectionExpanded] = useState(
    !!(data.selectedClient || data.selectedProjects?.length > 0 || data.selectedParts?.length > 0)
  );

  // Sync state when data changes from parent (after save/load)
  useEffect(() => {
    if (data.selectedClient && JSON.stringify(data.selectedClient) !== JSON.stringify(selectedClient)) {
      setSelectedClient(data.selectedClient);
    }
    if (data.selectedProjects && JSON.stringify(data.selectedProjects) !== JSON.stringify(selectedProjects)) {
      setSelectedProjects(data.selectedProjects);
    }
    if (data.selectedParts && JSON.stringify(data.selectedParts) !== JSON.stringify(selectedParts)) {
      setSelectedParts(data.selectedParts);
    }
    if (data.customColumns && JSON.stringify(data.customColumns) !== JSON.stringify(customColumns)) {
      setCustomColumns(data.customColumns);
    }
    if (data.beforeConditionDescription !== beforeConditionDescription) {
      setBeforeConditionDescription(data.beforeConditionDescription || '');
    }
    if (data.afterConditionDescription !== afterConditionDescription) {
      setAfterConditionDescription(data.afterConditionDescription || '');
    }
    if (data.affectedDocuments && JSON.stringify(data.affectedDocuments) !== JSON.stringify(affectedDocuments)) {
      setAffectedDocuments(data.affectedDocuments);
    }
    if (data.changeAttachments && JSON.stringify(data.changeAttachments) !== JSON.stringify(changeAttachments)) {
      setChangeAttachments(data.changeAttachments);
    }
    // Auto-expand if there's data
    if (data.selectedClient || data.selectedProjects?.length > 0 || data.selectedParts?.length > 0) {
      setIsPartsSelectionExpanded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.id]); // Only sync when ECR ID changes (reload/save)

  // Load clients on mount
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/clients/list', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setClients(response.data.clients || []);
      } catch (error) {
        console.error('Error fetching clients:', error);
      }
    };
    fetchClients();
  }, []);

  // Load projects when client changes
  useEffect(() => {
    const fetchProjects = async () => {
      if (!selectedClient) {
        setProjects([]);
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:5000/clients/${selectedClient.id}/projects`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProjects(response.data.projects || []);
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };
    fetchProjects();
  }, [selectedClient]);

  // Load parts when projects change
  useEffect(() => {
    const fetchParts = async () => {
      if (selectedProjects.length === 0 || !selectedClient) {
        setAvailableParts([]);
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:5000/clients/${selectedClient.id}/parts?activeOnly=true`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Backend returns projectGroups structure
        const projectGroups = response.data?.projectGroups || [];

        // Extract selected project IDs
        const selectedProjectIds = selectedProjects.map(p => p.id);

        // Filter parts from selected projects only
        const partsFromSelectedProjects = [];
        projectGroups.forEach(group => {
          if (group.projectId && selectedProjectIds.includes(group.projectId)) {
            partsFromSelectedProjects.push(...group.parts);
          }
        });

        setAvailableParts(partsFromSelectedProjects);
      } catch (error) {
        console.error('Error fetching parts:', error);
        setAvailableParts([]);
      }
    };
    fetchParts();
  }, [selectedProjects, selectedClient]);

  // Update parent when any data changes
  useEffect(() => {
    onDataUpdate({
      selectedClient,
      selectedProjects, // Changed from selectedProject to selectedProjects
      selectedParts,
      customColumns,
      beforeConditionDescription,
      afterConditionDescription,
      changeAttachments,
      beforePhotos,
      afterPhotos,
      affectedDocuments
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClient, selectedProjects, selectedParts, customColumns, beforeConditionDescription, afterConditionDescription, changeAttachments, beforePhotos, afterPhotos, affectedDocuments]);

  const handleClientChange = (clientId) => {
    const client = clients.find(c => c.id === parseInt(clientId));
    setSelectedClient(client || null);
    setSelectedProjects([]); // Clear selected projects
    setSelectedParts([]);
    setAvailableParts([]);
    // Keep expanded if selecting a client
    if (client) {
      setIsPartsSelectionExpanded(true);
    }
  };

  const handleProjectToggle = (project) => {
    const isSelected = selectedProjects.some(p => p.id === project.id);

    if (isSelected) {
      // Remove project from selection
      setSelectedProjects(selectedProjects.filter(p => p.id !== project.id));
      // Remove parts that belong to this project
      setSelectedParts(selectedParts.filter(part => part.projectId !== project.id));
    } else {
      // Add project to selection
      setSelectedProjects([...selectedProjects, project]);
    }
  };

  const handlePartToggle = (part) => {
    const isSelected = selectedParts.some(p => p.id === part.id);

    if (isSelected) {
      setSelectedParts(selectedParts.filter(p => p.id !== part.id));
    } else {
      // Add part with default values including replaced part tracking
      setSelectedParts([...selectedParts, {
        ...part,
        totalAffectedQty: 0,
        totalCostImpact: 0,
        replacedPartId: null,
        replacedPartNumber: '',
        replacedPartDescription: '',
        isReplacement: false
      }]);
    }
  };

  const handleReplacedPartChange = (partId, replacedPartId) => {
    setSelectedParts(selectedParts.map(part => {
      if (part.id === partId) {
        if (replacedPartId) {
          const replacedPart = availableParts.find(p => p.id === parseInt(replacedPartId));
          return {
            ...part,
            replacedPartId: replacedPart?.id || null,
            replacedPartNumber: replacedPart?.partNumber || '',
            replacedPartDescription: replacedPart?.partName || '',
            isReplacement: true
          };
        } else {
          return {
            ...part,
            replacedPartId: null,
            replacedPartNumber: '',
            replacedPartDescription: '',
            isReplacement: false
          };
        }
      }
      return part;
    }));
  };

  const handlePhotoUpload = async (e, photoType) => {
    const files = Array.from(e.target.files);
    const photoArray = photoType === 'before' ? beforePhotos : afterPhotos;
    const setPhotoArray = photoType === 'before' ? setBeforePhotos : setAfterPhotos;

    // Convert files to base64
    const convertToBase64 = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });
    };

    try {
      const newPhotosPromises = files.map(async (file) => {
        const base64 = await convertToBase64(file);
        return {
          name: file.name,
          url: base64, // Store base64 instead of blob URL
          uploadedAt: new Date().toISOString(),
          size: file.size,
          type: file.type
        };
      });

      const newPhotos = await Promise.all(newPhotosPromises);
      setPhotoArray([...photoArray, ...newPhotos]);
    } catch (error) {
      console.error('Error converting photos to base64:', error);
      alert(language === 'es' ? 'Error al procesar las imágenes' : 'Error processing images');
    }
  };

  const removePhoto = (index, photoType) => {
    const photoArray = photoType === 'before' ? beforePhotos : afterPhotos;
    const setPhotoArray = photoType === 'before' ? setBeforePhotos : setAfterPhotos;

    const newPhotos = photoArray.filter((_, i) => i !== index);
    setPhotoArray(newPhotos);
  };

  const handleAttachmentUpload = async (e) => {
    const files = Array.from(e.target.files);

    // Convert files to base64
    const convertToBase64 = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });
    };

    try {
      const newAttachmentsPromises = files.map(async (file) => {
        const base64 = await convertToBase64(file);
        return {
          name: file.name,
          url: base64,
          uploadedAt: new Date().toISOString(),
          size: file.size,
          type: file.type
        };
      });

      const newAttachments = await Promise.all(newAttachmentsPromises);
      setChangeAttachments([...changeAttachments, ...newAttachments]);
    } catch (error) {
      console.error('Error converting attachments to base64:', error);
      alert(language === 'es' ? 'Error al procesar los archivos' : 'Error processing files');
    }
  };

  const removeAttachment = (index) => {
    const newAttachments = changeAttachments.filter((_, i) => i !== index);
    setChangeAttachments(newAttachments);
  };

  const handleAddDocument = async () => {
    if (!newDocument || !newDocument.trim()) {
      alert(language === 'es' ? 'Por favor ingresa el nombre del documento antes de agregar' : 'Please enter the document name before adding');
      return;
    }

    // Check for duplicates (comparing by name)
    const docName = newDocument.trim();
    if (affectedDocuments.some(doc => (typeof doc === 'string' ? doc : doc.name) === docName)) {
      alert(language === 'es' ? 'Este documento ya está en la lista' : 'This document is already in the list');
      return;
    }

    let documentEntry = { name: docName };

    // If file is attached, convert to base64
    if (newDocumentFile) {
      try {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(newDocumentFile);
        });

        documentEntry.file = {
          name: newDocumentFile.name,
          url: base64,
          size: newDocumentFile.size,
          type: newDocumentFile.type,
          uploadedAt: new Date().toISOString()
        };
      } catch (error) {
        console.error('Error converting file to base64:', error);
        alert(language === 'es' ? 'Error al procesar el archivo' : 'Error processing file');
        return;
      }
    }

    setAffectedDocuments([...affectedDocuments, documentEntry]);
    setNewDocument('');
    setNewDocumentFile(null);
  };

  const removeDocument = (index) => {
    setAffectedDocuments(affectedDocuments.filter((_, i) => i !== index));
  };

  return (
    <div style={styles.container}>
      {/* Read-only Banner */}
      {isReadOnly && (
        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '18px' }}>🔒</span>
          <span style={{ color: '#92400e', fontWeight: '500' }}>
            {tr('ecr.messages.readOnlyMode')}
          </span>
        </div>
      )}

      <div style={{
        pointerEvents: isReadOnly ? 'none' : 'auto',
        opacity: isReadOnly ? 0.7 : 1
      }}>
      <div style={styles.header}>
        <h2 style={styles.title}> ECR-2: {language === 'es' ? 'Descripción del Cambio' : 'Change Description'}</h2>
        <p style={styles.subtitle}>{language === 'es' ? 'Descripción detallada del cambio solicitado' : 'Detailed description of the requested change'}</p>
      </div>

      {/* Descripción detallada del cambio solicitado */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <span style={styles.badge}>{language === 'es' ? 'Descripción detallada del cambio solicitado' : 'Detailed description of the requested change'}</span>
        </h3>
        <p style={styles.sectionDescription}>
          {language === 'es' ? 'Descripción de condiciones antes/después, evidencia fotográfica y documentos adjuntos' : 'Before/after conditions description, photographic evidence and attachments'}
        </p>

        {/* Before/After Conditions with Photos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Before Condition */}
          <div style={{
            border: `2px solid ${t.error}`,
            borderRadius: '8px',
            padding: '16px',
            backgroundColor: t.errorBg
          }}>
            <h4 style={{
              fontSize: '15px',
              fontWeight: '600',
              color: t.errorFg,
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
               {language === 'es' ? 'Before (Condición Actual)' : 'Before (Current Condition)'}
            </h4>

            {/* Description Text Box */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: t.errorFg,
                marginBottom: '6px'
              }}>
                {language === 'es' ? 'Describe a detalle la condición anterior:' : 'Describe in detail the previous condition:'}
              </label>
              <textarea
                value={beforeConditionDescription}
                onChange={(e) => setBeforeConditionDescription(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '10px',
                  border: `1px solid ${t.errorBorder}`,
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  backgroundColor: t.bgCard
                }}
                placeholder={language === 'es' ? 'Describe el estado actual, problemas encontrados, defectos, situación antes del cambio...' : 'Describe the current state, problems found, defects, situation before the change...'}
              />
            </div>

            {/* Photo Upload - Compact Icon */}
            <label style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              cursor: 'pointer',
              backgroundColor: '#fff',
              border: `1px solid ${t.errorBorder}`,
              borderRadius: '6px',
              transition: 'all 0.2s',
              marginBottom: '12px',
              fontSize: '13px',
              color: t.errorFg,
              fontWeight: '500'
            }}>
              <span style={{ fontSize: '16px' }}></span>
              {language === 'es' ? 'Agregar Fotos' : 'Add Photos'}
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handlePhotoUpload(e, 'before')}
                style={{ display: 'none' }}
              />
            </label>

            {/* Before Photos Preview */}
            {beforePhotos.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {beforePhotos.map((photo, index) => (
                  <div key={index} style={{
                    position: 'relative',
                    aspectRatio: '1',
                    backgroundColor: t.bg,
                    borderRadius: '6px',
                    overflow: 'hidden'
                  }}>
                    <img
                      src={photo.url}
                      alt={`Before ${index + 1}`}
                      onClick={() => setImageModal({
                        isOpen: true,
                        imageUrl: photo.url,
                        imageName: photo.name
                      })}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        cursor: 'pointer'
                      }}
                    />
                    <button
                      onClick={() => removePhoto(index, 'before')}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        backgroundColor: t.error,
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '22px',
                        height: '22px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: '1'
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* After Condition */}
          <div style={{
            border: `2px solid ${t.success}`,
            borderRadius: '8px',
            padding: '16px',
            backgroundColor: t.successBg
          }}>
            <h4 style={{
              fontSize: '15px',
              fontWeight: '600',
              color: t.successFg,
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
               {language === 'es' ? 'After (Condición Nueva)' : 'After (New Condition)'}
            </h4>

            {/* Description Text Box */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: t.successFg,
                marginBottom: '6px'
              }}>
                {language === 'es' ? 'Describe a detalle la condición nueva:' : 'Describe in detail the new condition:'}
              </label>
              <textarea
                value={afterConditionDescription}
                onChange={(e) => setAfterConditionDescription(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '10px',
                  border: `1px solid ${t.successBorder}`,
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  backgroundColor: t.bgCard
                }}
                placeholder={language === 'es' ? 'Describe el estado propuesto, mejoras esperadas, solución implementada, situación después del cambio...' : 'Describe the proposed state, expected improvements, implemented solution, situation after the change...'}
              />
            </div>

            {/* Photo Upload - Compact Icon */}
            <label style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              cursor: 'pointer',
              backgroundColor: '#fff',
              border: `1px solid ${t.successBorder}`,
              borderRadius: '6px',
              transition: 'all 0.2s',
              marginBottom: '12px',
              fontSize: '13px',
              color: t.successFg,
              fontWeight: '500'
            }}>
              <span style={{ fontSize: '16px' }}></span>
              {language === 'es' ? 'Agregar Fotos' : 'Add Photos'}
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handlePhotoUpload(e, 'after')}
                style={{ display: 'none' }}
              />
            </label>

            {/* After Photos Preview */}
            {afterPhotos.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {afterPhotos.map((photo, index) => (
                  <div key={index} style={{
                    position: 'relative',
                    aspectRatio: '1',
                    backgroundColor: t.bg,
                    borderRadius: '6px',
                    overflow: 'hidden'
                  }}>
                    <img
                      src={photo.url}
                      alt={`After ${index + 1}`}
                      onClick={() => setImageModal({
                        isOpen: true,
                        imageUrl: photo.url,
                        imageName: photo.name
                      })}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        cursor: 'pointer'
                      }}
                    />
                    <button
                      onClick={() => removePhoto(index, 'after')}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        backgroundColor: t.success,
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '22px',
                        height: '22px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: '1'
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Attachments Section */}
        <div style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: t.accentBg,
          borderRadius: '8px',
          border: `2px solid ${t.accent}`
        }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            color: t.accentFg,
            marginBottom: '8px'
          }}>
             {language === 'es' ? 'Documentos Adjuntos (opcional)' : 'Attachments (optional)'}
          </label>
          <p style={{ fontSize: '12px', color: t.textMuted, marginBottom: '8px' }}>
            {language === 'es' ? 'Adjunta PDFs, documentos, planos, especificaciones u otros archivos que ayuden a explicar el cambio' : 'Attach PDFs, documents, drawings, specifications or other files that help explain the change'}
          </p>

          <label style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px 24px',
            cursor: 'pointer',
            border: `2px dashed ${t.accent}`,
            borderRadius: '6px',
            backgroundColor: t.bgCard,
            transition: 'all 0.2s',
            fontSize: '14px',
            fontWeight: '500',
            color: t.accentFg
          }}>
            <span style={{ marginRight: '8px' }}></span>
            {language === 'es' ? 'Seleccionar Archivos' : 'Select Files'}
            <input
              type="file"
              multiple
              onChange={handleAttachmentUpload}
              style={{ display: 'none' }}
            />
          </label>

          {/* Attachments Preview */}
          {changeAttachments.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <div style={{
                border: '1px solid #bae6fd',
                borderRadius: '6px',
                padding: '12px',
                backgroundColor: t.bgCard
              }}>
                {changeAttachments.map((file, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      marginBottom: index < changeAttachments.length - 1 ? '8px' : '0',
                      backgroundColor: t.bgCard,
                      borderRadius: '6px',
                      border: '1px solid #E6EAEE'
                    }}
                  >
                    <a
                      href={file.url}
                      download={file.name}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '14px',
                        color: '#0072CE',
                        textDecoration: 'none',
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                       {file.name} <span style={{ fontSize: '12px', color: t.textMuted }}>({(file.size / 1024).toFixed(1)} KB)</span>
                    </a>
                    <button
                      onClick={() => removeAttachment(index)}
                      style={{
                        backgroundColor: '#fee2e2',
                        color: '#ef4444',
                        border: 'none',
                        borderRadius: '4px',
                        width: '28px',
                        height: '28px',
                        cursor: 'pointer',
                        fontSize: '20px',
                        lineHeight: '1',
                        fontWeight: 'bold'
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Client, Project & Affected Parts - Collapsible */}
      <div style={styles.section}>
        <h3
          style={{
            ...styles.sectionTitle,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            userSelect: 'none'
          }}
          onClick={() => setIsPartsSelectionExpanded(!isPartsSelectionExpanded)}
        >
          <span style={styles.badge}>{language === 'es' ? 'Cliente, Proyecto y Partes Afectadas (Opcional)' : 'Client, Project & Affected Parts (Optional)'}</span>
          <span style={{
            fontSize: '18px',
            marginLeft: '8px',
            transition: 'transform 0.2s',
            transform: isPartsSelectionExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
          }}>

          </span>
        </h3>
        <p style={styles.sectionDescription}>
          {isPartsSelectionExpanded
            ? (language === 'es' ? 'Selecciona el cliente, proyecto(s) y partes afectadas por este cambio' : 'Select the client, project(s) and parts affected by this change')
            : (language === 'es' ? 'Click para expandir si el cambio incluye partes específicas (ej: cambios de materiales, componentes). Omite esta sección para cambios de layout, procesos, etc.' : 'Click to expand if the change includes specific parts (e.g., material changes, components). Skip this section for layout changes, processes, etc.')
          }
        </p>

        {isPartsSelectionExpanded && (
          <div>
            <div style={styles.grid}>
              <div style={styles.field}>
                <label style={styles.label}>{language === 'es' ? 'Cliente / Proveedor' : 'Client / Supplier'} *</label>
                <select
                  style={styles.input}
                  value={selectedClient?.id || ''}
                  onChange={(e) => handleClientChange(e.target.value)}
                >
                  <option value="">{language === 'es' ? 'Selecciona un cliente...' : 'Select a client...'}</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name} ({client.alias})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Projects Multi-Select */}
            {selectedClient && projects.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <label style={styles.label}>{language === 'es' ? 'Proyectos (Selección Múltiple)' : 'Projects (Multi-Select)'} *</label>
                <p style={{ fontSize: '12px', color: t.textMuted, marginBottom: '8px' }}>
                  {language === 'es' ? 'Selecciona uno o más proyectos del cliente para ver sus partes' : 'Select one or more client projects to view their parts'}
                </p>
                <div style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '12px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  backgroundColor: '#fafafa'
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '8px'
                  }}>
                    {projects.map(project => (
                      <label
                        key={project.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '10px',
                          backgroundColor: selectedProjects.some(p => p.id === project.id) ? t.accentBg : t.bgCard,
                          borderRadius: '6px',
                          cursor: 'pointer',
                          border: selectedProjects.some(p => p.id === project.id) ? `2px solid ${t.accent}` : `1px solid ${t.border}`,
                          transition: 'all 0.2s'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedProjects.some(p => p.id === project.id)}
                          onChange={() => handleProjectToggle(project)}
                          style={{ marginRight: '8px', transform: 'scale(1.2)' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', color: t.accentFg, fontSize: '13px' }}>
                            {project.projectNumber}
                          </div>
                          <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '2px' }}>
                            {project.projectName}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Parts Multi-Select */}
            {selectedProjects.length > 0 && availableParts.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <label style={styles.label}>{language === 'es' ? 'Números de Parte Afectados (Selección Múltiple)' : 'Affected Part Numbers (Multi-Select)'} *</label>
                <div style={{
                  border: `1px solid ${t.border}`,
                  borderRadius: '8px',
                  padding: '12px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  backgroundColor: t.bgPanel
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(6, 1fr)',
                    gap: '8px'
                  }}>
                    {availableParts.map(part => (
                      <label
                        key={part.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          padding: '8px',
                          backgroundColor: selectedParts.some(p => p.id === part.id) ? t.accentBg : t.bgCard,
                          borderRadius: '4px',
                          cursor: 'pointer',
                          border: selectedParts.some(p => p.id === part.id) ? `2px solid ${t.accent}` : `1px solid ${t.border}`,
                          transition: 'all 0.2s',
                          minHeight: '90px',
                          fontSize: '11px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                          <input
                            type="checkbox"
                            checked={selectedParts.some(p => p.id === part.id)}
                            onChange={() => handlePartToggle(part)}
                            style={{ marginRight: '4px', transform: 'scale(0.9)' }}
                          />
                          <div style={{ fontWeight: '600', color: t.accentFg, fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {part.partNumber}
                          </div>
                        </div>
                        <div style={{ fontSize: '10px', color: t.text, marginBottom: '3px', lineHeight: '1.2', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {part.partName}
                        </div>
                        <div style={{ fontSize: '9px', color: t.textMuted, marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {part.clientPartNumber}
                        </div>
                        <div style={{ fontSize: '11px', color: '#d32f2f', fontWeight: '600', marginTop: 'auto' }}>
                          ${part.unitCost}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Selected Parts with Replacement Tracking */}
                {selectedParts.length > 0 && (
                  <div style={{
                    marginTop: '12px',
                    padding: '16px',
                    backgroundColor: '#fff3e0',
                    borderRadius: '8px',
                    border: '1px solid #ffb74d'
                  }}>
                    <strong style={{ fontSize: '14px', display: 'block', marginBottom: '12px' }}>
                      Partes Afectadas ({selectedParts.length}):
                    </strong>

                    <div style={{ display: 'grid', gap: '12px' }}>
                      {selectedParts.map(part => (
                        <div
                          key={part.id}
                          style={{
                            padding: '12px',
                            backgroundColor: t.bgCard,
                            borderRadius: '6px',
                            border: '1px solid #e0e0e0',
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '12px',
                            alignItems: 'center'
                          }}
                        >
                          {/* Current Part (Nueva) */}
                          <div>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px', fontWeight: '600' }}>
                               {language === 'es' ? 'Parte Seleccionada:' : 'Selected Part:'}
                            </div>
                            <div style={{ fontWeight: '700', color: '#2196f3', fontSize: '13px' }}>
                              {part.partNumber}
                            </div>
                            <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                              {part.partName}
                            </div>
                          </div>

                          {/* Replaced Part Selection (Anterior) */}
                          <div>
                            <label style={{ fontSize: '11px', color: '#666', marginBottom: '4px', display: 'block', fontWeight: '600' }}>
                               {language === 'es' ? 'Reemplaza a (opcional):' : 'Replaces (optional):'}
                            </label>
                            <select
                              value={part.replacedPartId || ''}
                              onChange={(e) => handleReplacedPartChange(part.id, e.target.value)}
                              style={{
                                width: '100%',
                                padding: '8px',
                                border: `1px solid ${t.border}`,
                                borderRadius: '6px',
                                fontSize: '12px',
                                backgroundColor: part.isReplacement ? '#fef3c7' : 'white'
                              }}
                            >
                              <option value="">{language === 'es' ? 'N/A - Es nueva parte' : 'N/A - New part'}</option>
                              {availableParts
                                .filter(p => p.id !== part.id)
                                .map(oldPart => (
                                  <option key={oldPart.id} value={oldPart.id}>
                                    {oldPart.partNumber} - {oldPart.partName}
                                  </option>
                                ))}
                            </select>
                            {part.isReplacement && (
                              <div style={{
                                marginTop: '6px',
                                fontSize: '11px',
                                color: '#C77700',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                 {language === 'es' ? 'Parte anterior:' : 'Previous part:'} {part.replacedPartNumber}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Total Estimated Cost */}
                    <div style={{
                      marginTop: '12px',
                      padding: '12px',
                      backgroundColor: '#e8f5e9',
                      borderRadius: '6px',
                      border: '2px solid #4caf50'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '15px', color: '#2e7d32' }}>
                          {language === 'es' ? 'Costo Estimado Total:' : 'Total Estimated Cost:'}
                        </strong>
                        <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1b5e20' }}>
                          ${(selectedParts?.reduce((total, part) => {
                            const totalCostImpact = parseFloat(part.totalCostImpact) || 0;
                            return total + totalCostImpact;
                          }, 0) || 0).toFixed(2)} USD
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#558b2f', marginTop: '6px' }}>
                        {language === 'es'
                          ? `Basado en ${selectedParts?.reduce((total, part) => total + (parseInt(part.totalAffectedQty) || 0), 0) || 0} ${selectedParts?.reduce((total, part) => total + (parseInt(part.totalAffectedQty) || 0), 0) === 1 ? 'pieza afectada' : 'piezas afectadas'}`
                          : `Based on ${selectedParts?.reduce((total, part) => total + (parseInt(part.totalAffectedQty) || 0), 0) || 0} affected ${selectedParts?.reduce((total, part) => total + (parseInt(part.totalAffectedQty) || 0), 0) === 1 ? 'piece' : 'pieces'}`
                        }
                      </div>
                    </div>

                    {/* Tabla de Inventario de Partes Afectadas */}
                    <div style={{ marginTop: '20px' }}>
                      <h3 style={{
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: '#1976d2',
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span></span>
                        {language === 'es' ? 'Inventario de Partes Afectadas' : 'Affected Parts Inventory'}
                      </h3>
                      <PartsInventoryTable
                        parts={selectedParts}
                        onPartsUpdate={setSelectedParts}
                        customColumns={customColumns}
                        onCustomColumnsUpdate={setCustomColumns}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Affected Documents */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <span style={styles.badge}>{tr('ecr.impactAnalysis.affectedDocuments')}</span>
        </h3>
        <p style={styles.sectionDescription}>
          {language === 'es' ? 'Documentos que serán afectados por este cambio (planos, especificaciones, procedimientos, etc.)' : 'Documents that will be affected by this change (drawings, specifications, procedures, etc.)'}
        </p>

        <div style={{
          border: '2px dashed #d1d5db',
          borderRadius: '8px',
          padding: '16px',
          backgroundColor: t.bg,
          marginBottom: '16px'
        }}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: t.text,
              marginBottom: '6px'
            }}>
              {language === 'es' ? 'Nombre del Documento' : 'Document Name'} *
            </label>
            <input
              type="text"
              style={{ ...styles.input, width: '100%' }}
              value={newDocument}
              onChange={(e) => setNewDocument(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddDocument();
                }
              }}
              placeholder={language === 'es' ? 'Ej: Drawing #12345, Spec ABC-001, WI-MFG-789...' : 'Ex: Drawing #12345, Spec ABC-001, WI-MFG-789...'}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: t.text,
              marginBottom: '6px'
            }}>
              {language === 'es' ? 'Anexar Archivo del Documento (Opcional pero Recomendado)' : 'Attach Document File (Optional but Recommended)'}
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <label style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '8px 16px',
                cursor: 'pointer',
                border: `1px solid ${t.border}`,
                borderRadius: '6px',
                backgroundColor: t.bgCard,
                fontSize: '13px',
                color: t.text,
                fontWeight: '500'
              }}>
                <span style={{ marginRight: '6px' }}></span>
                {newDocumentFile ? (language === 'es' ? 'Cambiar Archivo' : 'Change File') : (language === 'es' ? 'Seleccionar Archivo' : 'Select File')}
                <input
                  type="file"
                  onChange={(e) => setNewDocumentFile(e.target.files[0])}
                  style={{ display: 'none' }}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.dxf,.png,.jpg,.jpeg"
                />
              </label>
              {newDocumentFile && (
                <div style={{
                  flex: 1,
                  fontSize: '12px',
                  color: '#2E7D32',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span></span>
                  {newDocumentFile.name} ({(newDocumentFile.size / 1024).toFixed(1)} KB)
                  <button
                    onClick={() => setNewDocumentFile(null)}
                    style={{
                      marginLeft: '8px',
                      padding: '2px 8px',
                      backgroundColor: '#fee2e2',
                      color: '#B00020',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px'
                    }}
                  >
                    {language === 'es' ? 'Quitar' : 'Remove'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleAddDocument}
            style={{
              width: '100%',
              padding: '10px 20px',
              backgroundColor: '#0072CE',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            + {language === 'es' ? 'Agregar Documento a la Lista' : 'Add Document to List'}
          </button>
        </div>

        {affectedDocuments.length > 0 && (
          <div style={{
            border: '1px solid #E6EAEE',
            borderRadius: '6px',
            padding: '12px',
            backgroundColor: t.bg
          }}>
            <h4 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: t.text,
              marginBottom: '12px'
            }}>
              {tr('ecr.impactAnalysis.affectedDocuments')} ({affectedDocuments.length})
            </h4>
            {affectedDocuments.map((doc, index) => {
              // Handle both old format (string) and new format (object)
              const docName = typeof doc === 'string' ? doc : doc.name;
              const hasFile = typeof doc === 'object' && doc.file;

              return (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    marginBottom: index < affectedDocuments.length - 1 ? '8px' : '0',
                    backgroundColor: t.bgCard,
                    borderRadius: '6px',
                    border: '1px solid #E6EAEE'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: t.text, marginBottom: hasFile ? '6px' : '0' }}>
                       {docName}
                    </div>
                    {hasFile && (
                      <a
                        href={doc.file.url}
                        download={doc.file.name}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '13px',
                          color: '#0072CE',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginLeft: '20px'
                        }}
                      >
                         {doc.file.name} <span style={{ fontSize: '12px', color: t.textMuted }}>({(doc.file.size / 1024).toFixed(1)} KB)</span>
                      </a>
                    )}
                    {!hasFile && (
                      <div style={{
                        fontSize: '12px',
                        color: '#92400e',
                        marginLeft: '20px'
                      }}>
                         {language === 'es' ? 'Sin archivo adjunto' : 'No file attached'}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeDocument(index)}
                    style={{
                      backgroundColor: '#fee2e2',
                      color: '#ef4444',
                      border: 'none',
                      borderRadius: '4px',
                      width: '28px',
                      height: '28px',
                      cursor: 'pointer',
                      fontSize: '20px',
                      lineHeight: '1',
                      fontWeight: 'bold',
                      marginLeft: '12px'
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>{/* End of read-only wrapper */}

      {/* Image Modal */}
      {imageModal.isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => setImageModal({ isOpen: false, imageUrl: '', imageName: '' })}
        >
          <div style={{ maxWidth: '90%', maxHeight: '90%', position: 'relative' }}>
            <img
              src={imageModal.imageUrl}
              alt={imageModal.imageName}
              style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain' }}
            />
            <button
              onClick={() => setImageModal({ isOpen: false, imageUrl: '', imageName: '' })}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                backgroundColor: t.bgCard,
                color: '#333',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                fontSize: '20px',
                fontWeight: 'bold'
              }}
            >
              ×
            </button>
            <p style={{
              position: 'absolute',
              bottom: '-40px',
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'white',
              fontSize: '14px',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              padding: '8px 16px',
              borderRadius: '6px',
              whiteSpace: 'nowrap'
            }}>
              {imageModal.imageName}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const getStyles = (t) => ({
  container: {
    backgroundColor: t.bgCard,
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  header: {
    marginBottom: '32px'
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: t.text,
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '14px',
    color: t.textMuted,
    margin: 0
  },
  section: {
    marginBottom: '32px',
    padding: '20px',
    backgroundColor: t.bgPanel,
    borderRadius: '8px',
    border: `1px solid ${t.border}`
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: t.text,
    margin: '0 0 8px 0'
  },
  sectionDescription: {
    fontSize: '13px',
    color: t.textMuted,
    margin: '0 0 16px 0'
  },
  badge: {
    padding: '4px 12px',
    backgroundColor: t.success,
    color: 'white',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '16px'
  },
  field: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: t.text,
    marginBottom: '8px'
  },
  input: {
    padding: '10px 12px',
    border: `1px solid ${t.border}`,
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: t.bgCard,
    color: t.text
  },
  select: {
    padding: '10px 12px',
    border: `1px solid ${t.border}`,
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: t.bgCard,
    color: t.text
  }
});

export default ECRChangeRequest;
