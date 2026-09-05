import snapshot from "@/data/generated/coverage.json";
import type { CoverageItem } from "@/lib/types";

export const coverage = snapshot as CoverageItem[];
