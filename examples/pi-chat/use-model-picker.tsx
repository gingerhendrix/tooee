/**
 * Model selector: opens a fuzzy ChooseOverlay over the models that have
 * credentials, then switches the session to the chosen model.
 */

import { useChooseDialog } from "@tooee/choose";
import type { ChooseItem } from "@tooee/choose";
import { useCallback } from "react";

import { modelLabel } from "./initial-model.js";
import type { PiModel } from "./initial-model.js";
import type { PiChat } from "./use-pi-chat.js";

const toItem = function toItem(model: PiModel, current: string | undefined): ChooseItem {
  const label = modelLabel(model);

  return {
    description: model.name,
    icon: label === current ? "●" : " ",
    text: label,
    value: label,
  };
};

export const useModelPicker = function useModelPicker(chat: PiChat): () => void {
  const dialog = useChooseDialog<PiModel>();
  const { listModels, selectModel } = chat;
  const current = chat.state.modelLabel;

  return useCallback(() => {
    void (async () => {
      const chosen = await dialog.open({
        emptyMessage: "No models with credentials",
        items: listModels,
        placeholder: "Filter models…",
        prompt: "Select model",
        toItem: (model) => toItem(model, current),
      });

      if (chosen !== null) {
        await selectModel(chosen);
      }
    })();
  }, [current, dialog, listModels, selectModel]);
};
