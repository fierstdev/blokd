import { restaurant } from '../data/restaurant';

export const meta = ({ error }: any) => ({
  title: `${error?.response?.status ?? 500} Error | ${restaurant.name}`,
  description: 'Something went wrong.'
});

export default function ErrorPage(props: any) {
  const status = props.status ?? props.error?.response?.status ?? 500;
  const isNotFound = status === 404;
  return (
    <section class="page narrow">
      <h1>{isNotFound ? 'Page not found' : 'Something went wrong'}</h1>
      <p>{isNotFound ? 'The page you requested does not exist or has moved.' : 'The request could not be completed.'}</p>
      <p><a href="/">Return home</a></p>
    </section>
  );
}
