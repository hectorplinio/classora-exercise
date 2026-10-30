import { Link, Navigate, Route, Routes } from 'react-router';

import { ProfileSelector } from './features/profile/ProfileSelector.tsx';
import { TicketDetailPage } from './features/tickets/TicketDetailPage.tsx';
import { TicketListPage } from './features/tickets/TicketListPage.tsx';
import { CurrentUser } from './features/user/CurrentUser.tsx';
import { NotFoundPage } from './shared/NotFoundPage.tsx';
import { LogoMark } from './shared/icons.tsx';

export function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <Link to="/tickets" className="flex items-center gap-2.5 rounded-md">
            <LogoMark />
            <div className="flex flex-col leading-tight">
              <h1 className="text-[15px] font-semibold tracking-tight">Mini Tickets</h1>
              <span className="text-xs text-zinc-500">Seguridad · equipos de desarrollo</span>
            </div>
          </Link>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <CurrentUser />
            <ProfileSelector />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <Routes>
          <Route path="/" element={<Navigate to="/tickets" replace />} />
          <Route path="/tickets" element={<TicketListPage />} />
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
}
