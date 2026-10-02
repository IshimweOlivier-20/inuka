import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageLoader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { homeFor } from '../../config/roles';
import { refreshSession } from '../../services/api';

// Google sends people back here after they choose their account. The sign-in cookie is already set.
export default function GoogleDone() {
  const [params] = useSearchParams();
  const { setUser } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    refreshSession()
      .then((data) => { setUser(data.user); navigate(params.get('next') || homeFor(data.user), { replace: true }); })
      .catch(() => navigate('/login?google=failed', { replace: true }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <PageLoader />;
}
