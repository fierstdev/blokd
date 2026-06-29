type LayoutProps = {
  children?: unknown;
  meta?: {
    title?: string;
    description?: string;
  };
};

export default function Layout(props: LayoutProps) {
  return (
    <html lang="en">
      <head>
        <title>{props.meta?.title ?? "Blokd App"}</title>
        <meta
          name="description"
          content={props.meta?.description ?? "A minimal Blokd application."}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>

      <body>
        <header>
          <nav>
            <a href="/">Home</a>
            {" · "}
            <a href="/about">About</a>
            {" · "}
            <a href="/contact">Contact</a>
          </nav>
        </header>

        <main>{props.children}</main>
      </body>
    </html>
  );
}
