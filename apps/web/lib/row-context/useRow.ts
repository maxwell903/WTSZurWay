"use client";

import { useContext } from "react";
import { RowContext, type RowProvided } from "./RowContext";

export function useRow(): RowProvided {
  return useContext(RowContext);
}
