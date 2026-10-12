import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MailCheck, MailX } from 'lucide-react';
import PublicShell from '../../components/landing/PublicShell';
import { Button, EmptyState } from '../../components/ui';
import { api } from '../../services/api';

// Opened from the "Unsubscribe" link in scholarship alert emails.
export default function Unsubscribe() {
  const [params] = useSearchParams();
  const [state, setState] = useState('loading'); // loading | done | unknown | error
  useEffect(() => {
    document.title = 'Unsubscribe — INUKA';
    const token = params.get('token');
    if (!token) { setState('unknown'); return; }
    api.get('/public/unsubscribe', { params: { token } })
      .then((r) => setState(r.data.email ? 'done' : 'unknown'))
      .catch(() => setState('error'));
  }, [params]);

  return (
    <PublicShell>
      <div className="max-w-xl mx-auto px-5 py-20">
        {state === 'loading' && <p className="text-center text-ink-soft">One moment…</p>}
        {state === 'done' && (
          <EmptyState icon={MailCheck} title="You are unsubscribed" action={<Button to="/opportunities">See scholarships</Button>}>
            You will not get scholarship alert emails any more. You can sign up again at any time on the home page.
          </EmptyState>
        )}
        {state === 'unknown' && (
          <EmptyState icon={MailX} title="Already unsubscribed" action={<Button to="/">Go to INUKA</Button>}>
            This link was already used, or the email is not on our list.
          </EmptyState>
        )}
        {state === 'error' && (
          <EmptyState icon={MailX} title="Something went wrong" action={<Button onClick={() => window.location.reload()}>Try again</Button>}>
            We could not unsubscribe you right now. Please try again in a moment.
          </EmptyState>
        )}
      </div>
    </PublicShell>
  );
}
