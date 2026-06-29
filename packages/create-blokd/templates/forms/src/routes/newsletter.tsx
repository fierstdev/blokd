type NewsletterData = {
  ok?: boolean;
  email?: string;
  error?: string;
};

type NewsletterProps = {
  data?: NewsletterData;
};

export const meta = () => ({
  title: "Newsletter | Blokd App",
  description: "A native newsletter form."
});

export const runtime = "none";

export const budget = {
  client: "0kb"
};

export async function action({ request }: { request: Request }) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim();

  if (!email.includes("@")) {
    return { ok: false, error: "Enter a valid email." };
  }

  return { ok: true, email };
}

export default function Newsletter(props: NewsletterProps) {
  return (
    <section>
      <h1>Newsletter</h1>

      {props.data?.error ? <p role="alert">{props.data.error}</p> : null}
      {props.data?.ok ? <p>{`Subscribed ${props.data.email}`}</p> : null}

      <form method="post">
        <label>
          Email
          <input name="email" type="email" required />
        </label>
        <button>Subscribe</button>
      </form>
    </section>
  );
}
