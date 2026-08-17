import React from 'react';
import { getStatusDescription, getStatusBadgeColor } from '../../services/approvalsService';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const StatusBadge = ({ status }) => {
  const { theme: t } = useTheme();
  useLanguage(); // mantener hook activo
  const description = getStatusDescription(status);
  const colorClass = getStatusBadgeColor(status);

  return (
    <span
      className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${colorClass}`}
      style={{ color: t.text }}
    >
      {description}
    </span>
  );
};

export default StatusBadge;
