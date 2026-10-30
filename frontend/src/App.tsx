import { Navigate, Route, Routes } from 'react-router';

import { ProfileSelector } from './features/profile/ProfileSelector.tsx';
import { TicketListPage } from './features/tickets/TicketListPage.tsx';
import { CurrentUser } from './features/user/CurrentUser.tsx';
import { NotFoundPage } from './shared/NotFoundPage.tsx';

export function App() {
  return (
    <>
      <header className="bg-slate-900 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <h1 className="text-lg font-semibold">Mini Tickets</h1>
          <div className="flex flex-wrap items-center gap-4">
            <CurrentUser />
            <ProfileSelector />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Routes>
          <Route path="/" element={<Navigate to="/tickets" replace />} />
          <Route path="/tickets" element={<TicketListPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </>
  );
}
