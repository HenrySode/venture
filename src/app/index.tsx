import { Redirect } from 'expo-router';

import { useSession } from '@/state/session';

/** Entry point: send people to the right place for their session state. */
export default function Index() {
  const { session } = useSession();
  return <Redirect href={session ? '/hub' : '/welcome'} />;
}
