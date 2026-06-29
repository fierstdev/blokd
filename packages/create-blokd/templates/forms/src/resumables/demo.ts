import { defineAction } from "blokd/resume";

type MessageState = {
  text: string;
};

export const show = defineAction<MessageState>(({ state, el }) => {
  el.text(state.text);
});
