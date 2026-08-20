/**
 * Frontend-only AI adapter. The chat feature can replace this adapter with an
 * HTTP implementation later without changing any page or component APIs.
 */
export {
  getAIReply,
  type AIReply,
} from "../features/ai/services/aiAssistant";
