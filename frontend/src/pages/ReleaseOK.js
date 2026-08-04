import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, XCircle, Search, AlertTriangle, Home,
  Package, Clock, User, ArrowRight, Lock, Unlock, RefreshCw
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

/**
 * ReleaseOK - Estación final de liberación
 *
 * Flujo:
 * 1. Escanear/ingresar serial
 * 2. Sistema valida automáticamente:
 *    - 0 defectos abiertos
 *    - 0 specs NOK
 * 3. Si OK: botón verde "Liberar"
 * 4. Si NOK: muestra bloqueos, redirige a Hospital
 */

const ReleaseOK = () => {
  const navigate = useNavigate();
  const API_URL = 'http://localhost:5000';
  const serialInputRef = useRef(null);

  // Theme & Language
  const { theme: currentTheme } = useTheme();
  const { t } = useLanguage();

  // User
  const [currentUser, setCurrentUser] = useState(null);

  // Station info
  const [station, setStation] = useState(null);

  // Serial input
  const [serialInput, setSerialInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Validation result
  const [validationResult, setValidationResult] = useState(null);
  const [isReleasing, setIsReleasing] = useState(false);

  // Pending units list
  const [pendingUnits, setPendingUnits] = useState([]);
  const [showPendingList, setShowPendingList] = useState(false);

  // Release history (recent)
  const [releaseHistory, setReleaseHistory] = useState([]);

  // Stats
  const [todayStats, setTodayStats] = useState({ released: 0, blocked: 0 });

  // ============================================================================
  // LOAD INITIAL DATA
  // ============================================================================
  useEffect(() => {
    loadCurrentUser();
    loadStation();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.user) {
        setCurrentUser(data.user);
      }
    } catch (err) {
      console.error('Error loading user:', err);
    }
  };

  const loadStation = async () => {
    try {
      const res = await fetch(`${API_URL}/release-ok/station`);
      const data = await res.json();
      if (data.success) {
        setStation(data.station);
      }
    } catch (err) {
      console.error('Error loading station:', err);
    }
  };

  // ============================================================================
  // SERIAL VALIDATION
  // ============================================================================
  const handleSerialSearch = useCallback(async () => {
    if (!serialInput.trim()) return;

    setIsSearching(true);
    setValidationResult(null);

    try {
      // Get client_id from user or default
      const clientId = currentUser?.clientId || 1;

      const res = await fetch(
        `${API_URL}/release-ok/validate/${encodeURIComponent(serialInput.trim())}?clientId=${clientId}`
      );
      const data = await res.json();

      if (data.success) {
        setValidationResult(data);

        // Update stats
        if (data.canRelease) {
          // Ready to release - don't count yet
        } else if (data.alreadyReleased) {
          // Already released
        } else {
          // Blocked
          setTodayStats(prev => ({ ...prev, blocked: prev.blocked + 1 }));
        }
      } else {
        setValidationResult({
          found: false,
          canRelease: false,
          message: data.message || 'Serial no encontrado'
        });
      }
    } catch (err) {
      console.error('Error validating serial:', err);
      setValidationResult({
        found: false,
        canRelease: false,
        message: 'Error de conexión'
      });
    } finally {
      setIsSearching(false);
    }
  }, [serialInput, currentUser, API_URL]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSerialSearch();
    }
  };

  // ============================================================================
  // RELEASE
  // ============================================================================
  const handleRelease = async () => {
    if (!validationResult?.canRelease || !validationResult?.unit) return;

    setIsReleasing(true);

    try {
      const clientId = currentUser?.clientId || 1;

      const res = await fetch(`${API_URL}/release-ok/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serialNumber: serialInput.trim(),
          clientId,
          userId: currentUser?.id
        })
      });

      const data = await res.json();

      if (data.success) {
        // Success - update stats and clear
        setTodayStats(prev => ({ ...prev, released: prev.released + 1 }));

        // Add to history
        setReleaseHistory(prev => [{
          serial: serialInput.trim(),
          partNumber: validationResult.unit.partNumber,
          releasedAt: new Date().toISOString(),
          releasedBy: currentUser?.firstName + ' ' + currentUser?.lastName
        }, ...prev.slice(0, 9)]);

        // Clear and refocus
        setSerialInput('');
        setValidationResult(null);
        serialInputRef.current?.focus();

      } else {
        alert(data.message || 'Error liberando unidad');
      }
    } catch (err) {
      console.error('Error releasing:', err);
      alert('Error de conexión');
    } finally {
      setIsReleasing(false);
    }
  };

  // ============================================================================
  // CLEAR
  // ============================================================================
  const handleClear = () => {
    setSerialInput('');
    setValidationResult(null);
    serialInputRef.current?.focus();
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className={`min-h-screen ${currentTheme?.colors?.background || 'bg-gray-100'}`}>
      {/* Header */}
      <div className={`${currentTheme?.colors?.headerBg || 'bg-blue-600'} text-white px-4 py-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <Home size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Unlock size={24} />
                {station?.name || 'Release OK'}
              </h1>
              <p className="text-sm opacity-80">Estación final de liberación</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-300">{todayStats.released}</div>
              <div className="text-xs opacity-80">Liberados hoy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-300">{todayStats.blocked}</div>
              <div className="text-xs opacity-80">Bloqueados</div>
            </div>
          </div>

          {/* User */}
          <div className="flex items-center gap-2">
            <User size={20} />
            <span>{currentUser?.firstName} {currentUser?.lastName}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6">

        {/* Serial Input Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Escanear o ingresar serial
              </label>
              <div className="relative">
                <input
                  ref={serialInputRef}
                  type="text"
                  value={serialInput}
                  onChange={(e) => setSerialInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Escanear código de barras..."
                  className="w-full px-4 py-4 text-xl border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                  autoFocus
                />
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
              </div>
            </div>

            <button
              onClick={handleSerialSearch}
              disabled={!serialInput.trim() || isSearching}
              className="px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSearching ? (
                <RefreshCw className="animate-spin" size={20} />
              ) : (
                <Search size={20} />
              )}
              Buscar
            </button>

            {validationResult && (
              <button
                onClick={handleClear}
                className="px-4 py-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <XCircle size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Validation Result */}
        {validationResult && (
          <div className={`rounded-xl shadow-lg p-6 mb-6 ${
            validationResult.alreadyReleased
              ? 'bg-gray-100 border-2 border-gray-300'
              : validationResult.canRelease
                ? 'bg-green-50 border-2 border-green-500'
                : 'bg-red-50 border-2 border-red-500'
          }`}>

            {/* Unit Info */}
            {validationResult.unit && (
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Package size={20} className="text-gray-600" />
                    <span className="font-bold text-lg">{validationResult.unit.serialNumber}</span>
                  </div>
                  <div className="text-gray-600">
                    {validationResult.unit.partNumber} - {validationResult.unit.partName}
                  </div>
                  {validationResult.unit.lotNumber && (
                    <div className="text-sm text-gray-500">
                      Lote: {validationResult.unit.lotNumber}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-sm text-gray-500">Estado actual</div>
                  <div className={`font-semibold ${
                    validationResult.unit.currentStatus === 'RELEASED' ? 'text-green-600' :
                    validationResult.unit.openDefects > 0 ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {validationResult.unit.currentStatus}
                  </div>
                </div>
              </div>
            )}

            {/* Already Released */}
            {validationResult.alreadyReleased && (
              <div className="flex items-center gap-3 p-4 bg-gray-200 rounded-lg">
                <CheckCircle size={32} className="text-gray-500" />
                <div>
                  <div className="font-semibold text-gray-700">Ya liberada</div>
                  <div className="text-sm text-gray-500">Esta unidad ya fue liberada anteriormente</div>
                </div>
              </div>
            )}

            {/* Can Release */}
            {validationResult.canRelease && !validationResult.alreadyReleased && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-green-100 rounded-lg">
                  <CheckCircle size={32} className="text-green-600" />
                  <div>
                    <div className="font-semibold text-green-800">Lista para liberar</div>
                    <div className="text-sm text-green-600">
                      Sin defectos abiertos, todas las specs OK
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleRelease}
                  disabled={isReleasing}
                  className="w-full py-4 bg-green-600 text-white text-xl font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-3"
                >
                  {isReleasing ? (
                    <>
                      <RefreshCw className="animate-spin" size={24} />
                      Liberando...
                    </>
                  ) : (
                    <>
                      <Unlock size={24} />
                      LIBERAR UNIDAD
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Blocked */}
            {!validationResult.canRelease && !validationResult.alreadyReleased && validationResult.blockers && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-red-100 rounded-lg">
                  <Lock size={32} className="text-red-600" />
                  <div>
                    <div className="font-semibold text-red-800">No se puede liberar</div>
                    <div className="text-sm text-red-600">
                      Hay bloqueos pendientes que resolver
                    </div>
                  </div>
                </div>

                {/* Blockers List */}
                <div className="space-y-3">
                  {validationResult.blockers.map((blocker, idx) => (
                    <div key={idx} className="p-4 bg-white border border-red-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={20} className="text-red-500" />
                          <span className="font-semibold text-red-700">{blocker.message}</span>
                        </div>
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-sm rounded">
                          {blocker.type}
                        </span>
                      </div>

                      {/* Items list */}
                      {blocker.items && blocker.items.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {blocker.items.slice(0, 5).map((item, i) => (
                            <div key={i} className="text-sm text-gray-600 pl-6">
                              {blocker.type === 'DEFECTS' ? (
                                <span>{item.defectCode || item.defectName} - {item.stationName}</span>
                              ) : (
                                <span>{item.specName} - {item.stationName}</span>
                              )}
                            </div>
                          ))}
                          {blocker.items.length > 5 && (
                            <div className="text-sm text-gray-500 pl-6">
                              ...y {blocker.items.length - 5} más
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-3 flex items-center gap-2 text-blue-600 text-sm">
                        <ArrowRight size={16} />
                        {blocker.action}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Go to Hospital button */}
                <button
                  onClick={() => navigate('/defect-hospital')}
                  className="w-full py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowRight size={20} />
                  Ir a Hospital
                </button>
              </div>
            )}

            {/* Not found */}
            {!validationResult.found && (
              <div className="flex items-center gap-3 p-4 bg-yellow-100 rounded-lg">
                <AlertTriangle size={32} className="text-yellow-600" />
                <div>
                  <div className="font-semibold text-yellow-800">Serial no encontrado</div>
                  <div className="text-sm text-yellow-600">
                    {validationResult.message || 'Este serial no está registrado en el sistema'}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent Releases */}
        {releaseHistory.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Clock size={20} />
              Liberaciones recientes
            </h3>
            <div className="space-y-2">
              {releaseHistory.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <span className="font-medium">{item.serial}</span>
                    <span className="text-gray-500 text-sm ml-2">{item.partNumber}</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(item.releasedAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReleaseOK;
