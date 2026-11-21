

export interface TurnLogEntry {
  id: string;
  actor: string;
  message: string;
  tone: 'safe' | 'hazard' | 'bank' | 'bot';
}
