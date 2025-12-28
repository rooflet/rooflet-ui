import { api } from "../api-client";
import type { FeedbackRequest, MessageResponse } from "@/lib/api/types";

export const feedbackApi = {
  submit: (data: FeedbackRequest) =>
    api.post<MessageResponse>("/api/feedback", data),
};
