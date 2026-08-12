// src/types/TypesApp/TelemetryTypes.ts

// Um sensor/parâmetro disponível na Dashboard. `id` é o nome real do canal
// (bate exatamente com o que o Core publica -- SENSOR_MODELS em
// EngineController.js). `dashed` marca o segundo canal de um par físico
// (CHT2/LAMBDA2) -- mesma cor do canal 1, traço tracejado, pra não estourar
// o orçamento de cores categóricas com dois canais do mesmo sensor.
export interface SensorDefinition {
  id: string;
  label: string;
  unit: string;
  color: string;
  dashed?: boolean;
}

// Uma amostra da série ao vivo: um timestamp de amostragem + o último valor
// conhecido de cada sensor naquele instante (undefined = nenhuma leitura
// chegou ainda pra esse sensor).
export type LiveSample = { timestamp: number } & Record<string, number | undefined>;
