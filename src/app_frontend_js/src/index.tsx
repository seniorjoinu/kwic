(window as any).global = window;

/* @refresh reload */
import { render } from 'solid-js/web';
import { Router, Route, Routes } from '@solidjs/router';
import { MyDocumentsPage } from './pages/my-documents';
import { ChatPage } from './pages/chat';
import { ShareRequestPage } from './pages/share-request';

const root = document.getElementById('root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?',
  );
}

render(() => (
  <Router>
    <Routes>
      <Route path='/my-documents' component={MyDocumentsPage} />
      <Route path='/chat' component={ChatPage} />
      <Route path='/request' component={ShareRequestPage} />
    </Routes>
  </Router>
), root!);
