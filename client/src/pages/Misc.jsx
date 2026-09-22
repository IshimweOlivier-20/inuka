import { Button, Card } from '../components/ui';

export function ComingSoon({ icon, title, text }) {
  return (
    <Card className="max-w-xl mx-auto text-center py-12">
      <div className="text-5xl" aria-hidden>{icon}</div>
      <h1 className="text-2xl font-bold mt-3">{title}</h1>
      <p className="text-ink-soft mt-2">{text}</p>
      <Button to="/courses" variant="outline" className="mt-6">Keep learning meanwhile</Button>
    </Card>
  );
}

export function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <p className="font-display text-6xl font-bold text-forest">404</p>
      <h1 className="text-2xl font-semibold mt-2">We could not find this page</h1>
      <p className="text-ink-soft mt-1">The link may be old or mistyped.</p>
      <Button to="/" className="mt-6">Go to the home page</Button>
    </div>
  );
}
