import { PageShell, site } from '../components/SiteShell';

export const meta = () => ({
  title: site.name,
  description: site.description,
  htmlAttrs: { lang: 'en' },
  links: [
    { rel: 'stylesheet', href: '/assets/client.css' },
    { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }
  ]
});

export default function Layout(props: any) {
  return <PageShell>{props.children}</PageShell>;
}
