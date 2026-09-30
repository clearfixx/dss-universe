import styles from "./auth-gateway.module.css";

export function AuthField({
  label,
  icon,
  trailing,
  errors,
  ...input
}: React.ComponentProps<"input"> & {
  label: string;
  icon: React.ReactNode;
  trailing?: React.ReactNode;
  errors?: string[];
}) {
  const id = `auth-${input.name}`;
  const errorId = `${id}-error`;

  return (
    <label className={styles.field} htmlFor={id}>
      <span>{label}</span>
      <span
        className={styles.inputFrame}
        data-invalid={Boolean(errors?.length)}
      >
        <i aria-hidden="true">{icon}</i>
        <input
          id={id}
          required
          aria-invalid={Boolean(errors?.length)}
          aria-describedby={errors?.length ? errorId : undefined}
          {...input}
        />
        {trailing}
      </span>
      {errors?.length ? (
        <span className={styles.fieldError} id={errorId}>
          {errors[0]}
        </span>
      ) : null}
    </label>
  );
}
