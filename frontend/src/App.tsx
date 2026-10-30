import { ProfileSelector } from './features/profile/ProfileSelector.tsx';
import { CurrentUser } from './features/user/CurrentUser.tsx';

export function App() {
  return (
    <>
      <header>
        <h1>Mini Tickets</h1>
        <ProfileSelector />
      </header>
      <main>
        <CurrentUser />
      </main>
    </>
  );
}
