import { useEffect } from "react";

type ToastProps = {
  message: string;
  onClose: () => void;
};

export function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(onClose, 3400);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="toast" role="status" aria-live="polite">
      <span>{message}</span>
      <button type="button" aria-label="Dismiss notification" onClick={onClose}>
        ×
      </button>
    </div>
  );
}
