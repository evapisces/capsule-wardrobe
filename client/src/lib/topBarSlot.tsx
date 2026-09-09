import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const TopBarSlotContext = createContext<{
  content: ReactNode;
  setContent: (content: ReactNode) => void;
} | null>(null);

export function TopBarSlotProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ReactNode>(null);
  return (
    <TopBarSlotContext.Provider value={{ content, setContent }}>
      {children}
    </TopBarSlotContext.Provider>
  );
}

/** Reads whatever the current page has registered for the top bar's right side. */
export function useTopBarSlotContent(): ReactNode {
  const ctx = useContext(TopBarSlotContext);
  return ctx?.content ?? null;
}

/**
 * Registers `content` as the top bar's right-side contextual area (search
 * field + primary action) for as long as the calling page is mounted.
 */
export function useTopBarActions(content: ReactNode) {
  const ctx = useContext(TopBarSlotContext);
  useEffect(() => {
    if (!ctx) return;
    ctx.setContent(content);
    return () => ctx.setContent(null);
  });
}
