const statuses = {
  DRAFT: { label: "Чернетка", variant: "secondary" },
  IN_REVIEW: { label: "На перевірці", variant: "info" },
  CHANGES_REQUESTED: { label: "Потрібні зміни", variant: "warning" },
  APPROVED: { label: "Схвалено", variant: "success" },
  SCHEDULED: { label: "Заплановано", variant: "info" },
  PUBLISHED: { label: "Опубліковано", variant: "success" },
  ARCHIVED: { label: "Архів", variant: "outline" },
} as const;

export function editorialStatus(status: string) {
  return Object.hasOwn(statuses, status)
    ? statuses[status as keyof typeof statuses]
    : { label: status, variant: "outline" as const };
}
