import registry from "@/data/source-registry.json";
import type { SourceRecord } from "@/lib/types";

export const sources = registry as SourceRecord[];
