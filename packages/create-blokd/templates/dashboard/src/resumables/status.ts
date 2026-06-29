import { defineAction } from "blokd/resume";

type StatusState = {
  text: string;
};

export const refresh = defineAction<StatusState>(({ state, el }) => {
  state.text = state.text === "Queue healthy" ? "Queue checked" : "Queue healthy";
  el.text(state.text);
});
