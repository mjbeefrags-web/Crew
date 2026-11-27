import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "solid" | "outline" | "text" | "bag";
  }
>;

export function Button({
  variant = "solid",
  className = "",
  // Buttons that are not explicit submit/reset controls must never submit a
  // surrounding form by accident.
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`button button-${variant} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
