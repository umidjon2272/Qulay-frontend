export const loadAIAssistant = () => import("../components/AssistantPage/AIAssistant");

export const prefetchAIAssistant = () => {
  void loadAIAssistant();
};
