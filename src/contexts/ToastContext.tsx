import React, {
    createContext,
    useCallback,
    useContext,
    useRef,
    useState,
} from "react";

import Toast, { ToastVariant } from "../components/Toast";

type ToastContextValue = {
  showToast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue>({
  showToast: () => undefined,
});

const AUTO_HIDE_MS = 2600;

export const ToastProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [variant, setVariant] = useState<ToastVariant>("success");
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (nextMessage: string, nextVariant: ToastVariant = "success") => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }

      setMessage(nextMessage);
      setVariant(nextVariant);
      setVisible(true);

      hideTimeoutRef.current = setTimeout(() => {
        setVisible(false);
      }, AUTO_HIDE_MS);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast visible={visible} message={message} variant={variant} />
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
