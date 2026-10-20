"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface FilterContextValue {
  selectedScores: Set<number>;
  toggleScore: (score: number) => void;
  clearScores: () => void;
  period: string;
  setPeriod: (value: string) => void;
  updateType: string;
  setUpdateType: (value: string) => void;
  product: string;
  setProduct: (value: string) => void;
  workflow: "all" | "active" | "done";
  setWorkflow: (value: "all" | "active" | "done") => void;
}

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [selectedScores, setSelectedScores] = useState<Set<number>>(new Set());
  const [period, setPeriod] = useState("all");
  const [updateType, setUpdateType] = useState("all");
  const [product, setProduct] = useState("all");
  const [workflow, setWorkflow] = useState<"all" | "active" | "done">("all");

  const toggleScore = (score: number) => {
    setSelectedScores((prev) => {
      const next = new Set(prev);
      if (next.has(score)) next.delete(score);
      else next.add(score);
      return next;
    });
  };

  return (
    <FilterContext.Provider
      value={{
        selectedScores,
        toggleScore,
        clearScores: () => setSelectedScores(new Set()),
        period,
        setPeriod,
        updateType,
        setUpdateType,
        product,
        setProduct,
        workflow,
        setWorkflow,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters must be used within a FilterProvider");
  return ctx;
}
