type ErrorPageProps = {
  error?: {
    message?: string;
  };
};

export default function ErrorPage(props: ErrorPageProps) {
  return (
    <section>
      <h1>Something went wrong</h1>
      <p>
        {props.error?.message ??
          "The application encountered an unexpected error."}
      </p>
    </section>
  );
}