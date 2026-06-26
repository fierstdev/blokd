type DemoState = {
  message?: string;
};

type ResumableContext = {
  state: DemoState;
};

export function sayHello(event: Event, ctx: ResumableContext) {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  const button = target.closest("button");

  if (!button) {
    return;
  }

  button.textContent = ctx.state.message ?? "Hello from Blokd";
}