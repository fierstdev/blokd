import type { Context } from 'hono';
import type { ActionArgs, LoaderArgs, RouteModule } from './hono.js';
import type { MetaDescriptor, ResponseLike } from './server.js';

export type ActionResult = ResponseLike | Record<string, unknown>;
export type FormRecord = Record<string, FormDataEntryValue | FormDataEntryValue[]>;

export function defineLoader<C extends Context = Context, T = unknown>(
  loader: (args: LoaderArgs<C>) => Promise<T> | T
): (args: LoaderArgs<C>) => Promise<T> | T {
  return loader;
}

export function defineAction<C extends Context = Context, T extends ActionResult = ActionResult>(
  action: (args: ActionArgs<C>) => Promise<T> | T
): (args: ActionArgs<C>) => Promise<T> | T {
  return action;
}

export function defineMeta<C extends Context = Context>(
  meta: (args: LoaderArgs<C> & { data: Record<string, unknown>; error?: unknown }) => MetaDescriptor | Promise<MetaDescriptor>
): typeof meta {
  return meta;
}

export function defineHeaders<C extends Context = Context>(
  headers: (args: LoaderArgs<C> & { data: Record<string, unknown>; error?: unknown }) => HeadersInit | Promise<HeadersInit>
): typeof headers {
  return headers;
}

export function defineRoute<C extends Context = Context>(route: RouteModule<C>): RouteModule<C> {
  return route;
}

export async function readForm(request: Request): Promise<FormRecord> {
  const data = await request.formData();
  const out: FormRecord = {};
  for (const [key, value] of data.entries()) {
    const existing = out[key];
    if (existing === undefined) out[key] = value;
    else if (Array.isArray(existing)) existing.push(value);
    else out[key] = [existing, value];
  }
  return out;
}

export function formString(
  form: FormRecord | FormData,
  name: string,
  options: { trim?: boolean; required?: boolean; message?: string } = {}
): string {
  const value = firstFormValue(form, name);
  const text = typeof value === 'string' ? value : '';
  const normalized = options.trim === false ? text : text.trim();
  if (options.required && normalized.length === 0) throw new Error(options.message ?? `Missing required form field "${name}".`);
  return normalized;
}

export function formStrings(form: FormRecord | FormData, name: string, options: { trim?: boolean } = {}): string[] {
  return allFormValues(form, name)
    .filter((value): value is string => typeof value === 'string')
    .map(value => options.trim === false ? value : value.trim());
}

function firstFormValue(form: FormRecord | FormData, name: string): FormDataEntryValue | undefined {
  if (form instanceof FormData) return form.get(name) ?? undefined;
  const value = form[name];
  return Array.isArray(value) ? value[0] : value;
}

function allFormValues(form: FormRecord | FormData, name: string): FormDataEntryValue[] {
  if (form instanceof FormData) return form.getAll(name);
  const value = form[name];
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}
