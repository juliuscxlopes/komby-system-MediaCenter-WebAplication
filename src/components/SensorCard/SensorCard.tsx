import React from 'react';
import './SensorCard.css';

// Tipagem dos estados de alerta para garantir previsibilidade
export type AlertStatus = 'normal' | 'warning' | 'critical';

interface SensorCardProps {
  title: string;
  value: number | string;
  unit: string;
  status: AlertStatus; // 'normal', 'warning' ou 'critical'
}

export const SensorCard: React.FC<SensorCardProps> = ({ title, value, unit, status }) => {
  return (
    // Aplicamos a classe de status dinamicamente para mudar a borda/fundo no CSS
    <div className={`sensor-card sensor-${status}`}>
      <span className="sensor-title">{title}</span>
      <div className="sensor-data">
        <span className="sensor-value">{value}</span>
        <span className="sensor-unit">{unit}</span>
      </div>
    </div>
  );
};