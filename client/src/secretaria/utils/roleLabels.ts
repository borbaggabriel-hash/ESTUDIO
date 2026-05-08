const ROLE_LABELS: Record<string, string> = {
  platform_owner: 'PROPRIETÁRIO',
  hub_admin:      'PROPRIETÁRIO',
  studio_admin:   'ADM ESTUDIO',
  diretor:        'Diretor',
  dublador:       'Dublador',
  user:           'Dublador',
  student:        'Dublador',
  aluno:          'Dublador',
  actor:          'Dublador',
  voice_actor:    'Dublador',
};

export const getRoleLabel = (role: string): string =>
  ROLE_LABELS[role?.toLowerCase?.()] ?? 'Dublador';

const STATUS_LABELS: Record<string, string> = {
  approved: 'Ativo',
  pending:  'Pendente',
  rejected: 'Rejeitado',
  active:   'Ativo',
  inactive: 'Inativo',
};

export const getStatusLabel = (status: string): string =>
  STATUS_LABELS[status?.toLowerCase?.()] ?? status ?? 'Ativo';
