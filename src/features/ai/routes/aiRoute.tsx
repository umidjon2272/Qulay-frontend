import { lazy } from "react";
import { loadAIAssistant } from "./aiLoader";

export const AIAssistantRoute = lazy(loadAIAssistant);
