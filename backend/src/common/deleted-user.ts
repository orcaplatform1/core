// Kullanıcı "silindiğinde" satır DB'de kalır, sadece anonimleştirilir
// (bkz. users.service.ts requestAccountDeletion/adminDeleteUser). Bu prefix
// anonimleştirilmiş hesapları admin panelindeki tüm listelerden gizlemek için kullanılır.
export const DELETED_USERNAME_PREFIX = 'silinmis-';

export const NOT_DELETED_USER_WHERE = {
  username: { not: { startsWith: DELETED_USERNAME_PREFIX } },
} as const;
