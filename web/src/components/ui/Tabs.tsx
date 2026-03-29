import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useId,
} from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
  layoutGroupId: string;
  variant: "underline" | "pill";
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs components must be used within <Tabs>");
  return ctx;
}

export interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  variant?: "underline" | "pill";
}

export function Tabs({
  defaultValue = "",
  value: controlledValue,
  onValueChange,
  children,
  className = "",
  variant = "underline",
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const layoutGroupId = useId();

  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled ? controlledValue : internalValue;

  const handleChange = useCallback(
    (val: string) => {
      if (!isControlled) setInternalValue(val);
      onValueChange?.(val);
    },
    [isControlled, onValueChange]
  );

  return (
    <TabsContext.Provider
      value={{ value: currentValue, onValueChange: handleChange, layoutGroupId, variant }}
    >
      <LayoutGroup id={layoutGroupId}>
        <div className={`lc-tabs ${className}`}>{children}</div>
      </LayoutGroup>
    </TabsContext.Provider>
  );
}

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "underline" | "pill";
}

export function TabsList({
  variant: variantProp,
  className = "",
  children,
  ...rest
}: TabsListProps) {
  const { variant: ctxVariant } = useTabsContext();
  const variant = variantProp ?? ctxVariant;
  const variantClass =
    variant === "pill" ? "lc-tabs-list--pill" : "";

  return (
    <div
      className={`lc-tabs-list ${variantClass} ${className}`}
      role="tablist"
      {...rest}
    >
      {children}
    </div>
  );
}

export interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export function TabsTrigger({
  value,
  className = "",
  children,
  ...rest
}: TabsTriggerProps) {
  const { value: selectedValue, onValueChange, variant } = useTabsContext();
  const isActive = selectedValue === value;

  return (
    <button
      className={`lc-tabs-trigger${isActive ? " lc-tabs-trigger--active" : ""} ${className}`}
      role="tab"
      aria-selected={isActive}
      onClick={() => onValueChange(value)}
      type="button"
      {...rest}
    >
      {children}
      {isActive && variant === "underline" && (
        <motion.span
          className="lc-tabs-indicator"
          layoutId="tab-indicator"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
      {isActive && variant === "pill" && (
        <motion.span
          className="lc-tabs-pill-bg"
          layoutId="tab-pill-bg"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
    </button>
  );
}

export interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function TabsContent({
  value,
  className = "",
  children,
  id,
}: TabsContentProps) {
  const { value: selectedValue } = useTabsContext();
  const isActive = selectedValue === value;

  return (
    <AnimatePresence mode="wait">
      {isActive && (
        <motion.div
          key={value}
          className={`lc-tabs-content ${className}`}
          role="tabpanel"
          id={id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
