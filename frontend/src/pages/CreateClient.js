import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Building2, Plus, Trash2, FileText, Upload, Target } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const CreateClient = () => {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const { theme: t } = useTheme();
  const { t: tr, language, changeLanguage } = useLanguage();
  const isEditMode = !!clientId;
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditMode);

  const [formData, setFormData] = useState({
    name: '',
    alias: '',
    vendorNumber: '',
    corporateAddress: '',
    corporatePhone: '',
    corporateFax: '',
    email: '',
    billingAddress: '',
    billingFrequency: 'Weekly',
    billingPeriod: 'Monday to Sunday',
    website: '',
    isActive: true,
    requiresSignature: false,
    d4ResponseTimeHours: 24,
    d5ResponseTimeHours: 48,
    contacts: [],
    documents: []
  });

  const [contactInput, setContactInput] = useState({
    name: '',
    title: '',
    email: '',
    phone: ''
  });

  const [documentInput, setDocumentInput] = useState({
    name: '',
    type: 'Cotización',
    description: '',
    file: null
  });

  // Load client data if editing
  useEffect(() => {
    if (isEditMode) {
      const fetchClient = async () => {
        try {
          const response = await fetch(`http://localhost:5000/clients/${clientId}`);
          const data = await response.json();

          if (data.success) {
            setFormData({
              name: data.client.name || '',
              alias: data.client.alias || '',
              vendorNumber: data.client.vendorNumber || '',
              corporateAddress: data.client.corporateAddress || '',
              corporatePhone: data.client.corporatePhone || '',
              corporateFax: data.client.corporateFax || '',
              email: data.client.email || '',
              billingAddress: data.client.billingAddress || '',
              billingFrequency: data.client.billingFrequency || 'Weekly',
              billingPeriod: data.client.billingPeriod || 'Monday to Sunday',
              website: data.client.website || '',
              isActive: data.client.isActive !== undefined ? data.client.isActive : true,
              requiresSignature: data.client.requiresSignature || false,
              d4ResponseTimeHours: data.client.d4ResponseTimeHours || 24,
              d5ResponseTimeHours: data.client.d5ResponseTimeHours || 48,
              contacts: data.client.contacts || [],
              documents: data.client.documents || []
            });
          }
        } catch (err) {
          console.error('Error loading client:', err);
          alert('Error al cargar los datos del cliente');
        } finally {
          setLoading(false);
        }
      };

      fetchClient();
    }
  }, [isEditMode, clientId]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleAddContact = () => {
    if (contactInput.name && contactInput.email) {
      setFormData({
        ...formData,
        contacts: [...formData.contacts, { ...contactInput }]
      });
      setContactInput({ name: '', title: '', email: '', phone: '' });
    }
  };

  const handleRemoveContact = (index) => {
    const newContacts = formData.contacts.filter((_, i) => i !== index);
    setFormData({ ...formData, contacts: newContacts });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setDocumentInput({ ...documentInput, file: file, name: file.name });
    }
  };

  const handleAddDocument = () => {
    if (documentInput.file && documentInput.name) {
      const newDoc = {
        name: documentInput.name,
        type: documentInput.type,
        description: documentInput.description,
        fileName: documentInput.file.name,
        fileSize: documentInput.file.size,
        uploadDate: new Date().toISOString().split('T')[0]
      };
      setFormData({
        ...formData,
        documents: [...formData.documents, newDoc]
      });
      setDocumentInput({ name: '', type: 'Cotización', description: '', file: null });
      // Reset file input
      const fileInput = document.getElementById('file-upload');
      if (fileInput) fileInput.value = '';
    }
  };

  const handleRemoveDocument = (index) => {
    const newDocuments = formData.documents.filter((_, i) => i !== index);
    setFormData({ ...formData, documents: newDocuments });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones
    if (!formData.name || !formData.alias) {
      alert('Por favor complete los campos requeridos (Nombre y Alias)');
      return;
    }

    setSaving(true);
    try {
      const url = isEditMode
        ? `http://localhost:5000/clients/${clientId}`
        : 'http://localhost:5000/clients/create';

      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        alert(isEditMode ? 'Cliente actualizado exitosamente!' : 'Cliente creado exitosamente!');
        navigate(`/clients/${isEditMode ? clientId : data.client.id}`);
      } else {
        alert(`Error al ${isEditMode ? 'actualizar' : 'crear'} cliente: ` + data.message);
      }
    } catch (err) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} client:`, err);
      alert(`Error al ${isEditMode ? 'actualizar' : 'crear'} cliente: ` + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate('/clients');
  };

  // Show loading spinner if loading data in edit mode
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: t.bg
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: `4px solid ${t.border}`,
            borderTop: `4px solid ${t.accent}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: t.textMuted, fontSize: '16px' }}>Cargando datos del cliente...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: t.bg }}>
      {/* Header */}
      <div style={{
        backgroundColor: t.bgCard,
        borderBottom: `1px solid ${t.border}`,
        padding: '24px 32px'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '600',
              color: t.text,
              margin: '0 0 8px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Building2 size={32} color={t.accent} />
              {isEditMode ? 'Editar Cliente' : 'Crear Nuevo Cliente'}
            </h1>
            <p style={{
              fontSize: '14px',
              color: t.textMuted,
              margin: 0
            }}>
              {isEditMode
                ? 'Modifique los datos del cliente'
                : 'Complete el formulario para dar de alta un nuevo cliente'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
              {language === 'es' ? 'EN' : 'ES'}
            </button>
            <button
              onClick={handleBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                backgroundColor: t.bgCard,
                border: `1px solid ${t.border}`,
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                color: t.text
              }}
            >
              <ArrowLeft size={16} />
              Volver
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '32px'
      }}>
        <form onSubmit={handleSubmit}>
          {/* Información Básica */}
          <div style={{
            backgroundColor: t.bgCard,
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '24px'
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: t.text,
              marginBottom: '20px'
            }}>
              Información Básica
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '20px'
            }}>
              {/* Nombre */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: t.text,
                  marginBottom: '6px'
                }}>
                  Nombre del Cliente <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Ej: Faurecia Sistemas Automotrices SA de CV"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Alias */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: t.text,
                  marginBottom: '6px'
                }}>
                  Alias <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  name="alias"
                  value={formData.alias}
                  onChange={handleInputChange}
                  required
                  placeholder="Ej: FAUMX"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Vendor Number */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: t.text,
                  marginBottom: '6px'
                }}>
                  Número de Proveedor
                </label>
                <input
                  type="text"
                  name="vendorNumber"
                  value={formData.vendorNumber}
                  onChange={handleInputChange}
                  placeholder="Ej: AN01274677429"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Website */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: t.text,
                  marginBottom: '6px'
                }}>
                  Sitio Web
                </label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  placeholder="http://www.cliente.com"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Estado y Firma */}
              <div style={{
                gridColumn: '1 / -1',
                display: 'flex',
                gap: '20px',
                alignItems: 'center'
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  color: t.text,
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    style={{ cursor: 'pointer' }}
                  />
                  Cliente Activo
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  color: t.text,
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    name="requiresSignature"
                    checked={formData.requiresSignature}
                    onChange={handleInputChange}
                    style={{ cursor: 'pointer' }}
                  />
                  Requiere Firma
                </label>
              </div>
            </div>
          </div>

          {/* Información Corporativa */}
          <div style={{
            backgroundColor: t.bgCard,
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '24px'
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: t.text,
              marginBottom: '20px'
            }}>
              Información Corporativa
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '20px'
            }}>
              {/* Dirección Corporativa */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: t.text,
                  marginBottom: '6px'
                }}>
                  Dirección Corporativa
                </label>
                <input
                  type="text"
                  name="corporateAddress"
                  value={formData.corporateAddress}
                  onChange={handleInputChange}
                  placeholder="Ej: 4006 S 23rd Street, Phoenix, AZ"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Teléfono Corporativo */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: t.text,
                  marginBottom: '6px'
                }}>
                  Teléfono Corporativo
                </label>
                <input
                  type="tel"
                  name="corporatePhone"
                  value={formData.corporatePhone}
                  onChange={handleInputChange}
                  placeholder="+1 (937) 492-2708"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Fax Corporativo */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: t.text,
                  marginBottom: '6px'
                }}>
                  Fax Corporativo
                </label>
                <input
                  type="tel"
                  name="corporateFax"
                  value={formData.corporateFax}
                  onChange={handleInputChange}
                  placeholder="(000) 000-0000"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Email Corporativo */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: t.text,
                  marginBottom: '6px'
                }}>
                  Email Corporativo
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="contacto@cliente.com"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Información de Facturación */}
          <div style={{
            backgroundColor: t.bgCard,
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '24px'
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: t.text,
              marginBottom: '20px'
            }}>
              Información de Facturación
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '20px'
            }}>
              {/* Dirección de Facturación */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: t.text,
                  marginBottom: '6px'
                }}>
                  Dirección de Facturación
                </label>
                <input
                  type="text"
                  name="billingAddress"
                  value={formData.billingAddress}
                  onChange={handleInputChange}
                  placeholder="Ej: (FAUMX) Faurecia Sistemas Automotrices SA de CV"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Frecuencia de Facturación */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: t.text,
                  marginBottom: '6px'
                }}>
                  Frecuencia de Facturación
                </label>
                <select
                  name="billingFrequency"
                  value={formData.billingFrequency}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="Weekly">Semanal</option>
                  <option value="Bi-weekly">Quincenal</option>
                  <option value="Monthly">Mensual</option>
                </select>
              </div>

              {/* Período de Facturación */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: t.text,
                  marginBottom: '6px'
                }}>
                  Período de Facturación
                </label>
                <input
                  type="text"
                  name="billingPeriod"
                  value={formData.billingPeriod}
                  onChange={handleInputChange}
                  placeholder="Ej: Monday to Sunday"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Tiempos de Respuesta (SLA) */}
          <div style={{
            backgroundColor: t.bgCard,
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '24px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px'
            }}>
              <Target size={20} color="#0072CE" />
              <h2 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: t.text,
                margin: 0
              }}>
                Tiempos de Respuesta (SLA)
              </h2>
            </div>
            <p style={{
              fontSize: '14px',
              color: t.textMuted,
              marginBottom: '20px'
            }}>
              Defina los tiempos estándar de respuesta para reportes 8D según el contrato del cliente
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '20px'
            }}>
              {/* D4 Response Time */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: t.text,
                  marginBottom: '6px'
                }}>
                  D4 - Contención y Análisis (horas)
                </label>
                <input
                  type="number"
                  name="d4ResponseTimeHours"
                  value={formData.d4ResponseTimeHours}
                  onChange={handleInputChange}
                  min="1"
                  placeholder="24"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <p style={{
                  fontSize: '12px',
                  color: t.textMuted,
                  marginTop: '4px'
                }}>
                  Tiempo para completar acciones inmediatas de contención y análisis de causa raíz
                </p>
              </div>

              {/* D5 Response Time */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: t.text,
                  marginBottom: '6px'
                }}>
                  D5-D6-D7 - Contramedidas (horas)
                </label>
                <input
                  type="number"
                  name="d5ResponseTimeHours"
                  value={formData.d5ResponseTimeHours}
                  onChange={handleInputChange}
                  min="1"
                  placeholder="48"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <p style={{
                  fontSize: '12px',
                  color: t.textMuted,
                  marginTop: '4px'
                }}>
                  Tiempo para implementar y confirmar contramedidas permanentes
                </p>
              </div>
            </div>
          </div>

          {/* Contactos */}
          <div style={{
            backgroundColor: t.bgCard,
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '24px'
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: t.text,
              marginBottom: '20px'
            }}>
              Contactos
            </h2>

            {/* Input para agregar contacto */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr 1fr auto',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <input
                type="text"
                value={contactInput.name}
                onChange={(e) => setContactInput({ ...contactInput, name: e.target.value })}
                placeholder="Nombre"
                style={{
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
              <input
                type="text"
                value={contactInput.title}
                onChange={(e) => setContactInput({ ...contactInput, title: e.target.value })}
                placeholder="Título / Puesto"
                style={{
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
              <input
                type="email"
                value={contactInput.email}
                onChange={(e) => setContactInput({ ...contactInput, email: e.target.value })}
                placeholder="Email"
                style={{
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
              <input
                type="tel"
                value={contactInput.phone}
                onChange={(e) => setContactInput({ ...contactInput, phone: e.target.value })}
                placeholder="Teléfono"
                style={{
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
              <button
                type="button"
                onClick={handleAddContact}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: '#2E7D32',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <Plus size={16} />
                Agregar
              </button>
            </div>

            {/* Lista de contactos agregados */}
            {formData.contacts.length > 0 && (
              <div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: t.bg, borderBottom: `1px solid ${t.border}` }}>
                      <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: t.textMuted }}>
                        NOMBRE
                      </th>
                      <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: t.textMuted }}>
                        TÍTULO
                      </th>
                      <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: t.textMuted }}>
                        EMAIL
                      </th>
                      <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: t.textMuted }}>
                        TELÉFONO
                      </th>
                      <th style={{ padding: '10px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: t.textMuted }}>
                        ACCIÓN
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.contacts.map((contact, index) => (
                      <tr key={index} style={{ borderBottom: `1px solid ${t.border}` }}>
                        <td style={{ padding: '10px', fontSize: '14px', fontWeight: '500' }}>
                          {contact.name}
                        </td>
                        <td style={{ padding: '10px', fontSize: '14px', color: t.textMuted }}>
                          {contact.title}
                        </td>
                        <td style={{ padding: '10px', fontSize: '14px', color: t.textMuted }}>
                          {contact.email}
                        </td>
                        <td style={{ padding: '10px', fontSize: '14px', color: t.textMuted }}>
                          {contact.phone}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveContact(index)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              backgroundColor: '#fee2e2',
                              color: '#B00020',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={14} />
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {formData.contacts.length === 0 && (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                color: t.textDim,
                fontSize: '14px',
                border: '1px dashed #d1d5db',
                borderRadius: '6px'
              }}>
                No se han agregado contactos aún. Agregue al menos un contacto para el cliente.
              </div>
            )}
          </div>

          {/* Documentos */}
          <div style={{
            backgroundColor: t.bgCard,
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '24px'
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: t.text,
              marginBottom: '8px'
            }}>
              Documentos
            </h2>
            <p style={{
              fontSize: '14px',
              color: t.textMuted,
              marginBottom: '20px'
            }}>
              Agregue cotizaciones firmadas, correos de aprobación, instrucciones del cliente, etc.
            </p>

            {/* Input para agregar documento */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr 2fr auto',
              gap: '12px',
              marginBottom: '16px',
              alignItems: 'end'
            }}>
              {/* Tipo de documento */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: t.textMuted,
                  marginBottom: '6px'
                }}>
                  Tipo
                </label>
                <select
                  value={documentInput.type}
                  onChange={(e) => setDocumentInput({ ...documentInput, type: e.target.value })}
                  style={{
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    minWidth: '150px'
                  }}
                >
                  <option value="Cotización">Cotización</option>
                  <option value="Correo de Aprobación">Correo de Aprobación</option>
                  <option value="Instrucciones">Instrucciones</option>
                  <option value="Contrato">Contrato</option>
                  <option value="Orden de Compra">Orden de Compra</option>
                  <option value="Certificado">Certificado</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              {/* Nombre del documento */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: t.textMuted,
                  marginBottom: '6px'
                }}>
                  Nombre
                </label>
                <input
                  type="text"
                  value={documentInput.name}
                  onChange={(e) => setDocumentInput({ ...documentInput, name: e.target.value })}
                  placeholder="Nombre del documento"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Descripción */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: t.textMuted,
                  marginBottom: '6px'
                }}>
                  Descripción
                </label>
                <input
                  type="text"
                  value={documentInput.description}
                  onChange={(e) => setDocumentInput({ ...documentInput, description: e.target.value })}
                  placeholder="Descripción breve (opcional)"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Botón de subir archivo */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <label
                  htmlFor="file-upload"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Upload size={16} />
                  {documentInput.file ? 'Cambiar' : 'Seleccionar'}
                </label>
                <input
                  id="file-upload"
                  type="file"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={handleAddDocument}
                  disabled={!documentInput.file}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    backgroundColor: documentInput.file ? '#8b5cf6' : '#d1d5db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: documentInput.file ? 'pointer' : 'not-allowed',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Plus size={16} />
                  Agregar
                </button>
              </div>
            </div>

            {/* Archivo seleccionado */}
            {documentInput.file && (
              <div style={{
                padding: '12px',
                backgroundColor: t.bg,
                borderRadius: '6px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <FileText size={16} color="#6b7280" />
                <span style={{ fontSize: '14px', color: t.text }}>
                  {documentInput.file.name}
                </span>
                <span style={{ fontSize: '12px', color: t.textMuted, marginLeft: 'auto' }}>
                  ({(documentInput.file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            )}

            {/* Lista de documentos agregados */}
            {formData.documents.length > 0 && (
              <div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: t.bg, borderBottom: `1px solid ${t.border}` }}>
                      <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: t.textMuted }}>
                        TIPO
                      </th>
                      <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: t.textMuted }}>
                        NOMBRE
                      </th>
                      <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: t.textMuted }}>
                        DESCRIPCIÓN
                      </th>
                      <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: t.textMuted }}>
                        ARCHIVO
                      </th>
                      <th style={{ padding: '10px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: t.textMuted }}>
                        ACCIÓN
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.documents.map((doc, index) => (
                      <tr key={index} style={{ borderBottom: `1px solid ${t.border}` }}>
                        <td style={{ padding: '10px', fontSize: '14px' }}>
                          <span style={{
                            padding: '4px 8px',
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}>
                            {doc.type}
                          </span>
                        </td>
                        <td style={{ padding: '10px', fontSize: '14px', fontWeight: '500' }}>
                          {doc.name}
                        </td>
                        <td style={{ padding: '10px', fontSize: '14px', color: t.textMuted }}>
                          {doc.description || '-'}
                        </td>
                        <td style={{ padding: '10px', fontSize: '13px', color: t.textMuted }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FileText size={14} />
                            {doc.fileName}
                          </div>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveDocument(index)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              backgroundColor: '#fee2e2',
                              color: '#B00020',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={14} />
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {formData.documents.length === 0 && (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                color: t.textDim,
                fontSize: '14px',
                border: '1px dashed #d1d5db',
                borderRadius: '6px'
              }}>
                No se han agregado documentos aún. Los documentos son opcionales pero se recomienda agregar cotizaciones y aprobaciones.
              </div>
            )}
          </div>

          {/* Botones de Acción */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}>
            <button
              type="button"
              onClick={handleBack}
              disabled={saving}
              style={{
                padding: '12px 24px',
                backgroundColor: t.bgCard,
                border: '1px solid #E6EAEE',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                color: t.textMuted,
                cursor: saving ? 'not-allowed' : 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                backgroundColor: saving ? '#9ca3af' : '#0072CE',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: saving ? 'not-allowed' : 'pointer'
              }}
            >
              <Save size={16} />
              {saving ? 'Guardando...' : (isEditMode ? 'Actualizar Cliente' : 'Crear Cliente')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateClient;
